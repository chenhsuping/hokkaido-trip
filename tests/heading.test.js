import { describe, it, expect } from 'vitest';
import { computeHeading } from '../src/heading.js';

describe('computeHeading', () => {
  it('水平右移時 flip 為 1', () => {
    const { flip } = computeHeading(10, 0, 1);
    expect(flip).toBe(1);
  });

  it('水平左移時 flip 為 -1', () => {
    const { flip } = computeHeading(-10, 0, 1);
    expect(flip).toBe(-1);
  });

  it('位移不明顯（小於 4px）時沿用先前的 flip', () => {
    const { flip } = computeHeading(1, 5, -1);
    expect(flip).toBe(-1);
  });

  it('俯仰角限制在 ±20 度之間', () => {
    const { angle } = computeHeading(1, 100, 1);
    expect(Math.abs(angle)).toBeLessThanOrEqual(20);
  });

  it('位移過小（小於 0.6）時角度為 0、flip 不變', () => {
    expect(computeHeading(0.1, 0.1, 1)).toEqual({ angle: 0, flip: 1 });
  });
});
