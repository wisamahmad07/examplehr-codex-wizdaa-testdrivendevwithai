export const BALANCE_SCALE = 1000;

export function daysToUnits(days: number): number {
  return Math.round(days * BALANCE_SCALE);
}

export function unitsToDays(units: number): number {
  return Number((units / BALANCE_SCALE).toFixed(3));
}

export function clampAvailableUnits(balanceUnits: number): number {
  return Math.max(balanceUnits, 0);
}
