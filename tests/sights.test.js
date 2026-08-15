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

  it('排除開場航段的出發地——那時人還在台灣', () => {
    const days = [day('2026-12-25', [
      spot('某出發地', { opening: true }),
      spot('平和通商店街'),
    ])];
    expect(buildSights({ days }).map(s => s.name)).toEqual(['平和通商店街']);
  });

  it('排除機場、車站、巴士站與租車據點——那是上下車的地方，不是去逛的', () => {
    const days = [day('2026-12-25', [
      spot('新千歲空港'),
      spot('JR 函館站'),
      spot('旭川巴士總站 6 號月台'),
      spot('旭山動物園 巴士站'),
      spot('JR Rent-A-Car Toya'),
      spot('JR車站租車 函館營業所'),
      spot('五稜郭公園'),
    ])];
    expect(buildSights({ days }).map(s => s.name)).toEqual(['五稜郭公園']);
  });

  it('名稱含「站」但不是車站的地方要留著', () => {
    const days = [day('2026-12-25', [
      spot('平和通商店街'), spot('函館朝市'), spot('北海道廳舊本廳舍'), spot('札幌時計台'),
    ])];
    expect(buildSights({ days })).toHaveLength(4);
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
