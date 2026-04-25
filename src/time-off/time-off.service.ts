import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalancesService } from '../balances/balances.service';
import { daysToUnits, unitsToDays } from '../common/balance-units';
import { KeyedMutexService } from '../common/keyed-mutex.service';
import { HcmClient } from '../hcm/hcm.client';
import { HcmTransportError, HcmValidationError } from '../hcm/hcm.types';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { RequestDecisionDto } from './dto/request-decision.dto';
import { HcmCommandEntity } from './hcm-command.entity';
import {
  calculateEstimatedAvailableUnits,
  getLockKey,
} from './time-off.domain';
import {
  HcmCommandStatus,
  HcmCommandType,
  TimeOffRequestStatus,
} from './time-off.constants';
import { TimeOffRequestEntity } from './time-off-request.entity';

@Injectable()
export class TimeOffService {
  constructor(
    @InjectRepository(TimeOffRequestEntity)
    private readonly requestRepository: Repository<TimeOffRequestEntity>,
    @InjectRepository(HcmCommandEntity)
    private readonly commandRepository: Repository<HcmCommandEntity>,
    private readonly balancesService: BalancesService,
    private readonly hcmClient: HcmClient,
    private readonly keyedMutexService: KeyedMutexService,
  ) {}

  async createRequest(input: CreateTimeOffRequestDto) {
    const amountUnits = daysToUnits(input.amountDays);
    return this.keyedMutexService.withLock(
      getLockKey(input.employeeId, input.locationId),
      async () => {
        let snapshot = await this.balancesService.ensureSnapshot(
          input.employeeId,
          input.locationId,
        );
        let activeHoldUnits = await this.balancesService.getActiveHoldUnits(
          input.employeeId,
          input.locationId,
        );

        let estimatedAvailableUnits = calculateEstimatedAvailableUnits(
          snapshot.balanceUnits,
          activeHoldUnits,
        );

        if (amountUnits > estimatedAvailableUnits) {
          snapshot = await this.balancesService.refreshSnapshot(
            input.employeeId,
            input.locationId,
          );
          activeHoldUnits = await this.balancesService.getActiveHoldUnits(
            input.employeeId,
            input.locationId,
          );
          estimatedAvailableUnits = calculateEstimatedAvailableUnits(
            snapshot.balanceUnits,
            activeHoldUnits,
          );
        }

        if (amountUnits > estimatedAvailableUnits) {
          throw new ConflictException({
            code: 'INSUFFICIENT_ESTIMATED_BALANCE',
            message:
              'The latest available balance is not enough for this request.',
            estimatedAvailableDays: unitsToDays(estimatedAvailableUnits),
          });
        }

        const now = new Date();
        const request = await this.requestRepository.save(
          this.requestRepository.create({
            employeeId: input.employeeId,
            locationId: input.locationId,
            amountUnits,
            reason: input.reason ?? null,
            status: TimeOffRequestStatus.PENDING_APPROVAL,
            createdAt: now,
            updatedAt: now,
          }),
        );

        return this.toRequestView(request);
      },
    );
  }

  async getRequest(id: string) {
    const request = await this.requestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Time-off request not found');
    }

    return this.toRequestView(request);
  }

  async listRequests(employeeId?: string, locationId?: string) {
    const query = this.requestRepository
      .createQueryBuilder('request')
      .orderBy('request.createdAt', 'DESC');

    if (employeeId) {
      query.andWhere('request.employeeId = :employeeId', { employeeId });
    }

    if (locationId) {
      query.andWhere('request.locationId = :locationId', { locationId });
    }

    const requests = await query.getMany();
    return requests.map((request) => this.toRequestView(request));
  }

  async approveRequest(id: string, input: RequestDecisionDto) {
    const existing = await this.getRequestEntity(id);

    if (existing.status === TimeOffRequestStatus.APPROVED) {
      return this.toRequestView(existing);
    }

    if (existing.status !== TimeOffRequestStatus.PENDING_APPROVAL) {
      throw new ConflictException(
        `Cannot approve a request in status ${existing.status}`,
      );
    }

    return this.keyedMutexService.withLock(
      getLockKey(existing.employeeId, existing.locationId),
      async () => {
        const request = await this.getRequestEntity(id);
        if (request.status === TimeOffRequestStatus.APPROVED) {
          return this.toRequestView(request);
        }

        if (request.status !== TimeOffRequestStatus.PENDING_APPROVAL) {
          throw new ConflictException(
            `Cannot approve a request in status ${request.status}`,
          );
        }

        request.status = TimeOffRequestStatus.APPROVAL_IN_PROGRESS;
        request.actedBy = input.actorId;
        request.decisionNote = input.note ?? null;
        request.updatedAt = new Date();
        await this.requestRepository.save(request);

        const command = await this.prepareCommand(request);

        try {
          const booking = await this.hcmClient.bookTimeOff({
            idempotencyKey: command.idempotencyKey,
            employeeId: request.employeeId,
            locationId: request.locationId,
            amountDays: unitsToDays(request.amountUnits),
          });

          command.status = HcmCommandStatus.SUCCEEDED;
          command.lastAttemptAt = new Date();
          command.completedAt = new Date();
          command.lastErrorCode = null;
          command.lastErrorMessage = null;
          await this.commandRepository.save(command);

          request.status = TimeOffRequestStatus.APPROVED;
          request.externalBookingId = booking.bookingId;
          request.approvedAt = new Date(booking.bookedAt);
          request.reconciliationRequiredAt = null;
          request.updatedAt = new Date();
          await this.requestRepository.save(request);

          await this.balancesService.recordApprovedBalance(
            booking.employeeId,
            booking.locationId,
            booking.remainingBalanceDays,
            booking.bookedAt,
          );

          return this.toRequestView(request);
        } catch (error) {
          if (error instanceof HcmValidationError) {
            command.status = HcmCommandStatus.FAILED;
            command.completedAt = new Date();
            command.lastErrorCode = error.code;
            command.lastErrorMessage = error.message;
            await this.commandRepository.save(command);

            request.status = TimeOffRequestStatus.REJECTED;
            request.statusReasonCode = error.code;
            request.rejectedAt = new Date();
            request.updatedAt = new Date();
            await this.requestRepository.save(request);

            return this.toRequestView(request);
          }

          if (error instanceof HcmTransportError) {
            command.status = HcmCommandStatus.UNKNOWN;
            command.lastErrorCode = 'HCM_TRANSPORT_ERROR';
            command.lastErrorMessage = error.message;
            await this.commandRepository.save(command);

            request.status = TimeOffRequestStatus.REQUIRES_RECONCILIATION;
            request.reconciliationRequiredAt = new Date();
            request.updatedAt = new Date();
            await this.requestRepository.save(request);

            return this.toRequestView(request);
          }

          throw error;
        }
      },
    );
  }

  async rejectRequest(id: string, input: RequestDecisionDto) {
    return this.transitionPendingRequest(
      id,
      TimeOffRequestStatus.REJECTED,
      input,
      'rejectedAt',
    );
  }

  async cancelRequest(id: string, input: RequestDecisionDto) {
    return this.transitionPendingRequest(
      id,
      TimeOffRequestStatus.CANCELLED,
      input,
      'cancelledAt',
    );
  }

  async reconcileRequest(id: string, input: RequestDecisionDto) {
    const request = await this.getRequestEntity(id);
    if (request.status === TimeOffRequestStatus.APPROVED) {
      return this.toRequestView(request);
    }

    if (request.status !== TimeOffRequestStatus.REQUIRES_RECONCILIATION) {
      throw new ConflictException(
        `Cannot reconcile a request in status ${request.status}`,
      );
    }

    return this.keyedMutexService.withLock(
      getLockKey(request.employeeId, request.locationId),
      async () => {
        const freshRequest = await this.getRequestEntity(id);
        const command = await this.getCommandOrFail(freshRequest.id);

        try {
          const booking = await this.hcmClient.bookTimeOff({
            idempotencyKey: command.idempotencyKey,
            employeeId: freshRequest.employeeId,
            locationId: freshRequest.locationId,
            amountDays: unitsToDays(freshRequest.amountUnits),
          });

          command.status = HcmCommandStatus.SUCCEEDED;
          command.attemptCount += 1;
          command.lastAttemptAt = new Date();
          command.completedAt = new Date();
          command.lastErrorCode = null;
          command.lastErrorMessage = null;
          await this.commandRepository.save(command);

          freshRequest.status = TimeOffRequestStatus.APPROVED;
          freshRequest.actedBy = input.actorId;
          freshRequest.decisionNote = input.note ?? null;
          freshRequest.externalBookingId = booking.bookingId;
          freshRequest.approvedAt = new Date(booking.bookedAt);
          freshRequest.reconciliationRequiredAt = null;
          freshRequest.updatedAt = new Date();
          await this.requestRepository.save(freshRequest);

          await this.balancesService.recordApprovedBalance(
            booking.employeeId,
            booking.locationId,
            booking.remainingBalanceDays,
            booking.bookedAt,
          );

          return this.toRequestView(freshRequest);
        } catch (error) {
          command.attemptCount += 1;
          command.lastAttemptAt = new Date();

          if (error instanceof HcmValidationError) {
            command.status = HcmCommandStatus.FAILED;
            command.completedAt = new Date();
            command.lastErrorCode = error.code;
            command.lastErrorMessage = error.message;
            await this.commandRepository.save(command);

            freshRequest.status = TimeOffRequestStatus.REJECTED;
            freshRequest.actedBy = input.actorId;
            freshRequest.decisionNote = input.note ?? null;
            freshRequest.statusReasonCode = error.code;
            freshRequest.rejectedAt = new Date();
            freshRequest.updatedAt = new Date();
            await this.requestRepository.save(freshRequest);

            return this.toRequestView(freshRequest);
          }

          if (error instanceof HcmTransportError) {
            command.status = HcmCommandStatus.UNKNOWN;
            command.lastErrorCode = 'HCM_TRANSPORT_ERROR';
            command.lastErrorMessage = error.message;
            await this.commandRepository.save(command);

            freshRequest.actedBy = input.actorId;
            freshRequest.decisionNote = input.note ?? null;
            freshRequest.reconciliationRequiredAt = new Date();
            freshRequest.updatedAt = new Date();
            await this.requestRepository.save(freshRequest);

            return this.toRequestView(freshRequest);
          }

          throw error;
        }
      },
    );
  }

  private async transitionPendingRequest(
    id: string,
    targetStatus:
      | TimeOffRequestStatus.REJECTED
      | TimeOffRequestStatus.CANCELLED,
    input: RequestDecisionDto,
    timestampField: 'rejectedAt' | 'cancelledAt',
  ) {
    const request = await this.getRequestEntity(id);
    if (request.status !== TimeOffRequestStatus.PENDING_APPROVAL) {
      throw new ConflictException(
        `Cannot move a request in status ${request.status} to ${targetStatus}`,
      );
    }

    return this.keyedMutexService.withLock(
      getLockKey(request.employeeId, request.locationId),
      async () => {
        const freshRequest = await this.getRequestEntity(id);
        if (freshRequest.status !== TimeOffRequestStatus.PENDING_APPROVAL) {
          throw new ConflictException(
            `Cannot move a request in status ${freshRequest.status} to ${targetStatus}`,
          );
        }

        freshRequest.status = targetStatus;
        freshRequest.actedBy = input.actorId;
        freshRequest.decisionNote = input.note ?? null;
        freshRequest[timestampField] = new Date();
        freshRequest.updatedAt = new Date();
        await this.requestRepository.save(freshRequest);

        return this.toRequestView(freshRequest);
      },
    );
  }

  private async prepareCommand(request: TimeOffRequestEntity) {
    let command = await this.commandRepository.findOne({
      where: {
        requestId: request.id,
        commandType: HcmCommandType.BOOK_TIME_OFF,
      },
    });

    if (!command) {
      command = this.commandRepository.create({
        requestId: request.id,
        commandType: HcmCommandType.BOOK_TIME_OFF,
        status: HcmCommandStatus.PENDING,
        idempotencyKey: `time-off:${request.id}`,
        attemptCount: 0,
      });
    }

    command.attemptCount += 1;
    command.lastAttemptAt = new Date();

    return this.commandRepository.save(command);
  }

  private async getRequestEntity(id: string) {
    const request = await this.requestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Time-off request not found');
    }

    return request;
  }

  private async getCommandOrFail(requestId: string) {
    const command = await this.commandRepository.findOne({
      where: {
        requestId,
        commandType: HcmCommandType.BOOK_TIME_OFF,
      },
    });

    if (!command) {
      throw new NotFoundException('HCM command not found for request');
    }

    return command;
  }

  private toRequestView(request: TimeOffRequestEntity) {
    return {
      id: request.id,
      employeeId: request.employeeId,
      locationId: request.locationId,
      amountDays: unitsToDays(request.amountUnits),
      status: request.status,
      reason: request.reason,
      actedBy: request.actedBy,
      decisionNote: request.decisionNote,
      statusReasonCode: request.statusReasonCode,
      externalBookingId: request.externalBookingId,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      approvedAt: request.approvedAt?.toISOString() ?? null,
      rejectedAt: request.rejectedAt?.toISOString() ?? null,
      cancelledAt: request.cancelledAt?.toISOString() ?? null,
      reconciliationRequiredAt:
        request.reconciliationRequiredAt?.toISOString() ?? null,
    };
  }
}
