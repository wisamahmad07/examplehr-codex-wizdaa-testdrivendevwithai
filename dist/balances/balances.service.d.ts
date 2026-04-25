import { Repository } from 'typeorm';
import { HcmClient } from '../hcm/hcm.client';
import { TimeOffRequestEntity } from '../time-off/time-off-request.entity';
import { BalanceSnapshotEntity } from './balance-snapshot.entity';
import { HcmBatchSyncDto } from './dto/hcm-batch.dto';
import { SyncBatchEntity } from './sync-batch.entity';
export declare class BalancesService {
    private readonly balanceRepository;
    private readonly batchRepository;
    private readonly requestRepository;
    private readonly hcmClient;
    constructor(balanceRepository: Repository<BalanceSnapshotEntity>, batchRepository: Repository<SyncBatchEntity>, requestRepository: Repository<TimeOffRequestEntity>, hcmClient: HcmClient);
    getBalanceView(employeeId: string, locationId: string, refresh?: boolean): Promise<{
        employeeId: string;
        locationId: string;
        snapshotBalanceDays: number;
        activeHoldDays: number;
        estimatedAvailableDays: number;
        sourceType: "REALTIME" | "BATCH";
        sourceUpdatedAt: string;
        updatedAt: string;
    }>;
    ensureSnapshot(employeeId: string, locationId: string): Promise<BalanceSnapshotEntity>;
    refreshSnapshot(employeeId: string, locationId: string): Promise<BalanceSnapshotEntity>;
    recordApprovedBalance(employeeId: string, locationId: string, remainingBalanceDays: number, bookedAt: string): Promise<void>;
    getActiveHoldUnits(employeeId: string, locationId: string, excludeRequestId?: string): Promise<number>;
    syncBatch(batch: HcmBatchSyncDto): Promise<{
        batchId: string;
        status: string;
        appliedRows: number;
        skippedRows: number;
    }>;
    getSnapshotOrFail(employeeId: string, locationId: string): Promise<BalanceSnapshotEntity>;
    private upsertSnapshot;
    private toBalanceView;
}
