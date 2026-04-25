import { clampAvailableUnits } from '../common/balance-units';

export function getLockKey(employeeId: string, locationId: string): string {
  return `${employeeId}:${locationId}`;
}

export function calculateEstimatedAvailableUnits(
  snapshotUnits: number,
  holdUnits: number,
): number {
  return clampAvailableUnits(snapshotUnits - holdUnits);
}
