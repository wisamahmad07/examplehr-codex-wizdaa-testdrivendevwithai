export declare enum TimeOffRequestStatus {
    PENDING_APPROVAL = "PENDING_APPROVAL",
    APPROVAL_IN_PROGRESS = "APPROVAL_IN_PROGRESS",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED",
    REQUIRES_RECONCILIATION = "REQUIRES_RECONCILIATION"
}
export declare const ACTIVE_HOLD_STATUSES: TimeOffRequestStatus[];
export declare enum HcmCommandStatus {
    PENDING = "PENDING",
    SUCCEEDED = "SUCCEEDED",
    FAILED = "FAILED",
    UNKNOWN = "UNKNOWN"
}
export declare enum HcmCommandType {
    BOOK_TIME_OFF = "BOOK_TIME_OFF"
}
