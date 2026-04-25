import { HcmCommandStatus, HcmCommandType } from './time-off.constants';
export declare class HcmCommandEntity {
    id: string;
    requestId: string;
    commandType: HcmCommandType;
    status: HcmCommandStatus;
    idempotencyKey: string;
    attemptCount: number;
    lastErrorCode?: string | null;
    lastErrorMessage?: string | null;
    lastAttemptAt?: Date | null;
    completedAt?: Date | null;
}
