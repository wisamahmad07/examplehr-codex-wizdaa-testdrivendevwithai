export declare class HcmBatchBalanceDto {
    employeeId: string;
    locationId: string;
    balanceDays: number;
}
export declare class HcmBatchSyncDto {
    batchId: string;
    generatedAt: string;
    balances: HcmBatchBalanceDto[];
}
