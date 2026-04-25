import { BalanceQueryDto } from './dto/balance-query.dto';
import { HcmBatchSyncDto } from './dto/hcm-batch.dto';
import { BalancesService } from './balances.service';
export declare class BalancesController {
    private readonly balancesService;
    constructor(balancesService: BalancesService);
    getBalance(query: BalanceQueryDto): Promise<{
        employeeId: string;
        locationId: string;
        snapshotBalanceDays: number;
        activeHoldDays: number;
        estimatedAvailableDays: number;
        sourceType: "REALTIME" | "BATCH";
        sourceUpdatedAt: string;
        updatedAt: string;
    }>;
    syncBatch(batch: HcmBatchSyncDto): Promise<{
        batchId: string;
        status: string;
        appliedRows: number;
        skippedRows: number;
    }>;
}
