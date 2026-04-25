import { TimeOffRequestStatus } from './time-off.constants';
export declare class TimeOffRequestEntity {
    id: string;
    employeeId: string;
    locationId: string;
    amountUnits: number;
    status: TimeOffRequestStatus;
    reason?: string | null;
    actedBy?: string | null;
    decisionNote?: string | null;
    statusReasonCode?: string | null;
    externalBookingId?: string | null;
    createdAt: Date;
    updatedAt: Date;
    approvedAt?: Date | null;
    rejectedAt?: Date | null;
    cancelledAt?: Date | null;
    reconciliationRequiredAt?: Date | null;
}
