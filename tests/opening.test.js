import { describe, it, expect } from 'vitest';
import { addOpeningFlight, ORIGIN_AIRPORT } from '../src/opening.js';

const spot = (o = {}) => ({
  name: '', time: '', city: '', activity: '', stay: false, transfer: false, pending: false, ...o,
});
const day = (iso, spots, legs = []) => ({ index: 0, date: { iso }, city: '', spots, legs });
const leg = (from, to, mode = 'walk') => ({ fromIndex: from, toIndex: to, mode, label: '', mins: null });

describe('addOpeningFlight', () => {
  it('第一天最前面補上出發機場', () => {
    const days = [day('2026-12-25', [spot({ name: '新千歲空港' })])];
    const out = addOpeningFlight(days);
    expect(out[0].spots[0].name).toBe(ORIGIN_AIRPORT);
    expect(out[0].spots[1].name).toBe('新千歲空港');
  });

  it('補上的航段是 flight，才會用飛機圖示與弧線航路', () => {
    const days = [day('2026-12-25', [spot({ name: '新千歲空港' })])];
    const out = addOpeningFlight(days);
    expect(out[0].legs[0]).toMatchObject({ fromIndex: 0, toIndex: 1, mode: 'flight' });
  });

  it('景點與航段都帶 opening 旗標——靜態地圖與統計據以排除', () => {
    const days = [day('2026-12-25', [spot({ name: '新千歲空港' })])];
    const out = addOpeningFlight(days);
    expect(out[0].spots[0].opening).toBe(true);
    expect(out[0].legs[0].opening).toBe(true);
  });

  it('既有 leg 的索引跟著位移，不能指向錯的景點', () => {
    const days = [day('2026-12-25', [
      spot({ name: '新千歲空港' }), spot({ name: 'JR 札幌站' }),
    ], [leg(0, 1, 'jr')])];
    const out = addOpeningFlight(days);
    const jr = out[0].legs.find(l => l.mode === 'jr');
    expect(out[0].spots[jr.fromIndex].name).toBe('新千歲空港');
    expect(out[0].spots[jr.toIndex].name).toBe('JR 札幌站');
  });

  it('只動第一天，其餘各天原封不動', () => {
    const days = [
      day('2026-12-25', [spot({ name: '新千歲空港' })]),
      day('2026-12-26', [spot({ name: '旭山動物園' })]),
    ];
    const out = addOpeningFlight(days);
    expect(out[1]).toBe(days[1]);
  });

  it('重複套用不會補第二次', () => {
    const days = [day('2026-12-25', [spot({ name: '新千歲空港' })])];
    const out = addOpeningFlight(addOpeningFlight(days));
    expect(out[0].spots.filter(s => s.name === ORIGIN_AIRPORT)).toHaveLength(1);
  });

  it('沒有任何天數時直接回傳，不報錯', () => {
    expect(addOpeningFlight([])).toEqual([]);
  });

  it('第一天沒有景點時不補——沒有目的地可飛', () => {
    const days = [day('2026-12-25', [])];
    expect(addOpeningFlight(days)[0].spots).toHaveLength(0);
  });

  it('不改動原始 days 陣列', () => {
    const days = [day('2026-12-25', [spot({ name: '新千歲空港' })])];
    addOpeningFlight(days);
    expect(days[0].spots).toHaveLength(1);
    expect(days[0].legs).toHaveLength(0);
  });
});
