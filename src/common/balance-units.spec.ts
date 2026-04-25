import { daysToUnits, unitsToDays } from './balance-units';

describe('balance unit conversions', () => {
  it('converts days to integer units', () => {
    expect(daysToUnits(1.5)).toBe(1500);
  });

  it('converts units back to rounded days', () => {
    expect(unitsToDays(2250)).toBe(2.25);
  });
});
