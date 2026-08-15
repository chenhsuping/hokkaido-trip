import { describe, it, expect } from 'vitest';
import { buildSights } from '../src/sights.js';

const spot = (name, o = {}) => ({
  name, time: '', city: '', activity: '', stay: false, transfer: false, pending: false, ...o,
});
const day = (iso, spots, index = 0) => ({
  index, date: { iso }, city: '函館市', spots, legs: [],
});

describe('buildSights', () => {
  it('收錄一般景點', () => {
    const days = [day('2026-12-29', [spot('八幡坂'), spot('五稜郭公園')])];
    expect(buildSights({ days }).map(s => s.name)).toEqual(['八幡坂', '五稜郭公園']);
  });

  it('排除住宿——那是住哪裡的內容', () => {
    const days = [day('2026-12-29', [spot('八幡坂'), spot('某飯店', { stay: true })])];
    expect(buildSights({ days }).map(s => s.name)).toEqual(['八幡坂']);
  });

  it('排除餐廳——那是吃什麼的內容', () => {
    const days = [day('2026-12-29', [spot('八幡坂'), spot('山崎洋服店')])];
    const out = buildSights({ days, diningNames: ['山崎洋服店'] });
    expect(out.map(s => s.name)).toEqual(['八幡坂']);
  });

  it('餐廳比對忽略空白差異', () => {
    const days = [day('2026-12-29', [spot('五島軒 雪河亭')])];
    expect(buildSights({ days, diningNames: ['五島軒雪河亭'] })).toHaveLength(0);
  });

  it('排除轉車站與纜車山麓站——那是路過換車，不是去逛的地方', () => {
    const days = [day('2026-12-25', [
      spot('JR 札幌站', { transfer: true }),
      spot('函館山纜車 山麓站', { transfer: true }),
      spot('平和通商店街'),
    ])];
    expect(buildSights({ days }).map(s => s.name)).toEqual(['平和通商店街']);
  });

  it('排除開場航段的出發機場——那時人還在台灣', () => {
    const days = [day('2026-12-25', [
      spot('桃園國際機場', { opening: true }),
      spot('新千歲空港'),
    ])];
    expect(buildSights({ days }).map(s => s.name)).toEqual(['新千歲空港']);
  });

  it('排除地點還沒填的佔位列', () => {
    const days = [day('2026-12-30', [spot('待定', { pending: true }), spot('函館朝市')])];
    expect(buildSights({ days }).map(s => s.name)).toEqual(['函館朝市']);
  });

  it('同一個地方去兩次只留第一次', () => {
    const days = [
      day('2026-12-29', [spot('函館朝市')], 4),
      day('2026-12-31', [spot('函館朝市')], 6),
    ];
    const out = buildSights({ days });
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe('2026-12-29');
  });

  it('依日期與當天先後排序', () => {
    const days = [
      day('2026-12-29', [spot('A'), spot('B')], 4),
      day('2026-12-30', [spot('C')], 5),
    ];
    expect(buildSights({ days }).map(s => s.name)).toEqual(['A', 'B', 'C']);
  });

  it('景點沒填城市時沿用當天的城市', () => {
    const days = [day('2026-12-29', [spot('八幡坂')])];
    expect(buildSights({ days })[0].city).toBe('函館市');
  });

  it('沒有資料時回傳空陣列', () => {
    expect(buildSights({ days: [] })).toEqual([]);
  });
});
