import { describe, it, expect } from 'vitest';
import { haversineKm, computeStats } from '../src/overview.js';

describe('haversineKm', () => {
  it('同一點距離為 0', () => {
    expect(haversineKm({ lat: 43, lng: 141 }, { lat: 43, lng: 141 })).toBe(0);
  });

  it('札幌到函館約 220 公里量級', () => {
    const km = haversineKm({ lat: 43.0686, lng: 141.3507 }, { lat: 41.7687, lng: 140.7288 });
    expect(km).toBeGreaterThan(140);
    expect(km).toBeLessThan(160);
  });
});

const day = (o = {}) => ({ index: 0, date: { iso: '2026-12-25' }, city: '', spots: [], legs: [], ...o });
const spot = (o = {}) => ({ name: '', time: '', city: '', activity: '', stay: false, transfer: false, pending: false, ...o });

describe('computeStats', () => {
  const places = {
    A: { lat: 43, lng: 141 },
    B: { lat: 43.1, lng: 141.1 },
  };
  const resolve = name => places[name] || null;

  it('計算已規劃天數與總天數', () => {
    const days = [day({ index: 0 }), day({ index: 1 })];
    const s = computeStats({ days, resolve, tripStart: '2026-12-25', tripEnd: '2026-12-30' });
    expect(s.plannedDays).toBe(2);
    expect(s.totalDaySpan).toBe(6);
  });

  it('城市數套用與 buildCities 相同的分區對照——虻田郡與有珠郡合併，千歲市不計入', () => {
    const days = [day({ spots: [
      spot({ name: 'A', city: '旭川市' }),
      spot({ name: 'B', city: '虻田郡' }),
      spot({ name: 'A', city: '有珠郡' }),
      spot({ name: 'A', city: '千歲市' }),
    ] })];
    const s = computeStats({ days, resolve, tripStart: '2026-12-25', tripEnd: '2026-12-25' });
    expect(s.cityCount).toBe(2);
  });

  it('計算地點數（唯一地點名）', () => {
    const days = [day({ spots: [
      spot({ name: 'A', city: '旭川市' }),
      spot({ name: 'B', city: '小樽市' }),
    ] })];
    const s = computeStats({ days, resolve, tripStart: '2026-12-25', tripEnd: '2026-12-25' });
    expect(s.spotCount).toBe(2);
  });

  it('地點為空或重複不計入地點數', () => {
    const days = [day({ spots: [
      spot({ name: 'A', city: '旭川市' }),
      spot({ name: 'A', city: '旭川市' }),
      spot({ name: '', city: '旭川市' }),
    ] })];
    const s = computeStats({ days, resolve, tripStart: '2026-12-25', tripEnd: '2026-12-25' });
    expect(s.spotCount).toBe(1);
  });

  it('依可解析座標的相鄰景點累加距離', () => {
    const days = [day({ legs: [{ fromIndex: 0, toIndex: 1, mode: 'walk', label: '', mins: 5 }],
      spots: [spot({ name: 'A' }), spot({ name: 'B' })] })];
    const s = computeStats({ days, resolve, tripStart: '2026-12-25', tripEnd: '2026-12-25' });
    expect(s.totalKm).toBeGreaterThan(0);
  });

  it('缺座標的 leg 不中斷計算', () => {
    const days = [day({ legs: [{ fromIndex: 0, toIndex: 1, mode: 'walk', label: '', mins: 5 }],
      spots: [spot({ name: 'A' }), spot({ name: '不存在的地點' })] })];
    const s = computeStats({ days, resolve, tripStart: '2026-12-25', tripEnd: '2026-12-25' });
    expect(s.totalKm).toBe(0);
  });
});
