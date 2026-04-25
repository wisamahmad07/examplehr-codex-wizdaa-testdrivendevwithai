export type HcmValidationCode = 'INSUFFICIENT_BALANCE' | 'INVALID_DIMENSION';
export interface HcmBalanceResponse {
    employeeId: string;
    locationId: string;
    balanceDays: number;
    asOf: string;
}
export interface HcmBookingResponse {
    bookingId: string;
    employeeId: string;
    locationId: string;
    remainingBalanceDays: number;
    bookedAt: string;
}
export interface HcmBookingCommand {
    idempotencyKey: string;
    employeeId: string;
    locationId: string;
    amountDays: number;
}
export declare class HcmTransportError extends Error {
    constructor(message: string);
}
export declare class HcmValidationError extends Error {
    readonly code: HcmValidationCode;
    constructor(code: HcmValidationCode, message: string);
}
