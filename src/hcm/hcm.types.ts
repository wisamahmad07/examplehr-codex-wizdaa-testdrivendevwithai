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

export class HcmTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HcmTransportError';
  }
}

export class HcmValidationError extends Error {
  constructor(
    public readonly code: HcmValidationCode,
    message: string,
  ) {
    super(message);
    this.name = 'HcmValidationError';
  }
}
