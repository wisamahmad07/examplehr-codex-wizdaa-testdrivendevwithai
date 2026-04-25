export declare class BalanceSnapshotEntity {
    id: string;
    employeeId: string;
    locationId: string;
    balanceUnits: number;
    sourceUpdatedAt: Date;
    sourceType: 'REALTIME' | 'BATCH';
    updatedAt: Date;
}
