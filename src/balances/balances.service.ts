import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  daysToUnits,
  unitsToDays,
  clampAvailableUnits,
} from '../common/balance-units';
import { HcmClient } from '../hcm/hcm.client';
import { HcmTransportError, HcmValidationError } from '../hcm/hcm.types';
import { ACTIVE_HOLD_STATUSES } from '../time-off/time-off.constants';
import { TimeOffRequestEntity } from '../time-off/time-off-request.entity';
import { BalanceSnapshotEntity } from './balance-snapshot.entity';
import { HcmBatchSyncDto } from './dto/hcm-batch.dto';
import { SyncBatchEntity } from './sync-batch.entity';

@Injectable()
export class BalancesService {
  constructor(
    @InjectRepository(BalanceSnapshotEntity)
    private readonly balanceRepository: Repository<BalanceSnapshotEntity>,
    @InjectRepository(SyncBatchEntity)
    private readonly batchRepository: Repository<SyncBatchEntity>,
    @InjectRepository(TimeOffRequestEntity)
    private readonly requestRepository: Repository<TimeOffRequestEntity>,
    private readonly hcmClient: HcmClient,
  ) {}

  async getBalanceView(
    employeeId: string,
    locationId: string,
    refresh = false,
  ) {
    let snapshot = await this.balanceRepository.findOne({
      where: { employeeId, locationId },
    });

    if (refresh || !snapshot) {
      snapshot = await this.refreshSnapshot(employeeId, locationId);
    }

    const activeHoldUnits = await this.getActiveHoldUnits(
      employeeId,
      locationId,
    );

    return this.toBalanceView(snapshot, activeHoldUnits);
  }

  async ensureSnapshot(employeeId: string, locationId: string) {
    const snapshot = await this.balanceRepository.findOne({
      where: { employeeId, locationId },
    });

    if (snapshot) {
      return snapshot;
    }

    return this.refreshSnapshot(employeeId, locationId);
  }

  async refreshSnapshot(employeeId: string, locationId: string) {
    try {
      const response = await this.hcmClient.getBalance(employeeId, locationId);
      return this.upsertSnapshot({
        employeeId: response.employeeId,
        locationId: response.locationId,
        balanceUnits: daysToUnits(response.balanceDays),
        sourceType: 'REALTIME',
        sourceUpdatedAt: new Date(response.asOf),
      });
    } catch (error) {
      if (error instanceof HcmValidationError) {
        throw new UnprocessableEntityException({
          code: error.code,
          message: error.message,
        });
      }

      if (error instanceof HcmTransportError) {
        throw new ServiceUnavailableException({
          code: 'HCM_UNAVAILABLE',
          message: error.message,
        });
      }

      throw error;
    }
  }

  async recordApprovedBalance(
    employeeId: string,
    locationId: string,
    remainingBalanceDays: number,
    bookedAt: string,
  ) {
    await this.upsertSnapshot({
      employeeId,
      locationId,
      balanceUnits: daysToUnits(remainingBalanceDays),
      sourceType: 'REALTIME',
      sourceUpdatedAt: new Date(bookedAt),
    });
  }

  async getActiveHoldUnits(
    employeeId: string,
    locationId: string,
    excludeRequestId?: string,
  ): Promise<number> {
    const query = this.requestRepository
      .createQueryBuilder('request')
      .select('COALESCE(SUM(request.amountUnits), 0)', 'holdUnits')
      .where('request.employeeId = :employeeId', { employeeId })
      .andWhere('request.locationId = :locationId', { locationId })
      .andWhere('request.status IN (:...statuses)', {
        statuses: ACTIVE_HOLD_STATUSES,
      });

    if (excludeRequestId) {
      query.andWhere('request.id != :excludeRequestId', { excludeRequestId });
    }

    const result = await query.getRawOne<{ holdUnits: number | string }>();
    return Number(result?.holdUnits ?? 0);
  }

  async syncBatch(batch: HcmBatchSyncDto) {
    const existingBatch = await this.batchRepository.findOne({
      where: { batchId: batch.batchId },
    });

    if (existingBatch) {
      return {
        batchId: existingBatch.batchId,
        status: 'duplicate',
        appliedRows: existingBatch.appliedRows,
        skippedRows: existingBatch.skippedRows,
      };
    }

    const generatedAt = new Date(batch.generatedAt);
    let appliedRows = 0;
    let skippedRows = 0;

    for (const row of batch.balances) {
      const currentSnapshot = await this.balanceRepository.findOne({
        where: {
          employeeId: row.employeeId,
          locationId: row.locationId,
        },
      });

      if (currentSnapshot && currentSnapshot.sourceUpdatedAt > generatedAt) {
        skippedRows += 1;
        continue;
      }

      await this.upsertSnapshot({
        employeeId: row.employeeId,
        locationId: row.locationId,
        balanceUnits: daysToUnits(row.balanceDays),
        sourceType: 'BATCH',
        sourceUpdatedAt: generatedAt,
      });
      appliedRows += 1;
    }

    await this.batchRepository.save(
      this.batchRepository.create({
        batchId: batch.batchId,
        generatedAt,
        receivedAt: new Date(),
        appliedRows,
        skippedRows,
      }),
    );

    return {
      batchId: batch.batchId,
      status: 'processed',
      appliedRows,
      skippedRows,
    };
  }

  async getSnapshotOrFail(employeeId: string, locationId: string) {
    const snapshot = await this.balanceRepository.findOne({
      where: { employeeId, locationId },
    });

    if (!snapshot) {
      throw new NotFoundException('Balance snapshot not found');
    }

    return snapshot;
  }

  private async upsertSnapshot(input: {
    employeeId: string;
    locationId: string;
    balanceUnits: number;
    sourceType: 'REALTIME' | 'BATCH';
    sourceUpdatedAt: Date;
  }) {
    const existing = await this.balanceRepository.findOne({
      where: {
        employeeId: input.employeeId,
        locationId: input.locationId,
      },
    });

    const snapshot = this.balanceRepository.create({
      ...existing,
      employeeId: input.employeeId,
      locationId: input.locationId,
      balanceUnits: input.balanceUnits,
      sourceType: input.sourceType,
      sourceUpdatedAt: input.sourceUpdatedAt,
      updatedAt: new Date(),
    });

    return this.balanceRepository.save(snapshot);
  }

  private toBalanceView(
    snapshot: BalanceSnapshotEntity,
    activeHoldUnits: number,
  ) {
    const estimatedAvailableUnits = clampAvailableUnits(
      snapshot.balanceUnits - activeHoldUnits,
    );

    return {
      employeeId: snapshot.employeeId,
      locationId: snapshot.locationId,
      snapshotBalanceDays: unitsToDays(snapshot.balanceUnits),
      activeHoldDays: unitsToDays(activeHoldUnits),
      estimatedAvailableDays: unitsToDays(estimatedAvailableUnits),
      sourceType: snapshot.sourceType,
      sourceUpdatedAt: snapshot.sourceUpdatedAt.toISOString(),
      updatedAt: snapshot.updatedAt.toISOString(),
    };
  }
}
