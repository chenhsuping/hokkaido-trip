import { describe, it, expect } from 'vitest';
import { formatCountdown } from '../src/countdown.js';

describe('formatCountdown', () => {
  it('出發前顯示剩餘天數', () => {
    expect(formatCountdown('2026-12-25', new Date('2026-08-14T00:00:00+09:00'))).toBe('D-133');
  });

  it('出發當天顯示 D-DAY', () => {
    expect(formatCountdown('2026-12-25', new Date('2026-12-25T09:00:00+09:00'))).toBe('D-DAY');
  });

  it('出發後顯示已出發', () => {
    expect(formatCountdown('2026-12-25', new Date('2027-01-01T00:00:00+09:00'))).toBe('已出發');
  });
});
