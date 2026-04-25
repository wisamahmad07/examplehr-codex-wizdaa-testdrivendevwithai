import {
  calculateEstimatedAvailableUnits,
  getLockKey,
} from './time-off.domain';

describe('time-off domain helpers', () => {
  it('builds a stable per-employee-per-location lock key', () => {
    expect(getLockKey('emp-1', 'ams')).toBe('emp-1:ams');
  });

  it('never returns negative estimated availability', () => {
    expect(calculateEstimatedAvailableUnits(1000, 1500)).toBe(0);
  });
});
