import { describe, it, expect } from 'vitest';
import { computeHeading, computeTrackHeading } from '../src/heading.js';

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

describe('computeTrackHeading', () => {
  it('水平右移時角度為 0、朝右', () => {
    const { angle, flip } = computeTrackHeading(10, 0, 1);
    expect(angle).toBeCloseTo(0, 5);
    expect(flip).toBe(1);
  });

  it('不限制傾角——45 度上坡就回傳 45 度，不被截成 20 度', () => {
    const { angle } = computeTrackHeading(10, 10, 1);
    expect(angle).toBeCloseTo(45, 5);
  });

  it('陡峭路段也完整反映，不設上限', () => {
    const { angle } = computeTrackHeading(1, 10, 1);
    expect(Math.abs(angle)).toBeGreaterThan(20);
  });

  it('往左行進時翻面，且角度鏡射以免車身上下顛倒', () => {
    const right = computeTrackHeading(10, 10, 1);
    const left = computeTrackHeading(-10, 10, 1);
    expect(left.flip).toBe(-1);
    expect(left.angle).toBeCloseTo(-right.angle, 5);
  });

  it('位移過小時沿用先前方向，不抖動', () => {
    expect(computeTrackHeading(0.1, 0.1, -1)).toEqual({ angle: 0, flip: -1 });
  });
});
