import { describe, it, expect } from 'vitest';
import { parseDining, ramenTrio } from '../src/dining.js';

const row = (o = {}) => ({
  日期: '2026-12-25', 城市: '旭川市', '餐廳/地點': '蜂屋 五条創業店',
  餐別: '晚餐', 預約狀態: '', 備註: '醬油拉麵', ...o,
});

describe('parseDining', () => {
  it('解析基本欄位', () => {
    const [d] = parseDining([row()]);
    expect(d).toEqual({
      date: '2026-12-25', city: '旭川市', name: '蜂屋 五条創業店',
      meal: '晚餐', reserved: null, note: '醬油拉麵',
    });
  });

  it('TRUE 視為已訂位', () => {
    expect(parseDining([row({ 預約狀態: 'TRUE' })])[0].reserved).toBe(true);
  });

  it('FALSE 視為未訂位', () => {
    expect(parseDining([row({ 預約狀態: 'FALSE' })])[0].reserved).toBe(false);
  });

  it('空值視為不適用（null），不是未訂位', () => {
    expect(parseDining([row({ 預約狀態: '' })])[0].reserved).toBeNull();
  });

  it('餐廳/地點為空時 name 為空字串，不中斷', () => {
    const [d] = parseDining([row({ '餐廳/地點': '' })]);
    expect(d.name).toBe('');
  });
});

describe('ramenTrio', () => {
  const places = {
    '蜂屋 五条創業店': { ramen: '醬油' },
    '山崎洋服店': { ramen: '鹽味' },
    '札幌一粒庵': { ramen: '味噌', photo: 'photos/ichiryuan.png' },
    '三角市場': {},
  };
  const resolve = name => places[name] || null;

  it('只取有 ramen 標記的餐廳', () => {
    const dishes = parseDining([
      row({ '餐廳/地點': '蜂屋 五条創業店' }),
      row({ '餐廳/地點': '三角市場', 餐別: '午餐' }),
    ]);
    const trio = ramenTrio(dishes, resolve);
    expect(trio).toHaveLength(1);
    expect(trio[0].flavor).toBe('醬油');
  });

  it('三種流派齊全時回傳三筆，附照片（若有）', () => {
    const dishes = parseDining([
      row({ '餐廳/地點': '蜂屋 五条創業店' }),
      row({ '餐廳/地點': '山崎洋服店' }),
      row({ '餐廳/地點': '札幌一粒庵' }),
    ]);
    const trio = ramenTrio(dishes, resolve);
    expect(trio.map(t => t.flavor).sort()).toEqual(['味噌', '醬油', '鹽味']);
    expect(trio.find(t => t.flavor === '味噌').photo).toBe('photos/ichiryuan.png');
  });

  it('未知地點（resolve 回傳 null）不列入', () => {
    const dishes = parseDining([row({ '餐廳/地點': '不存在的店' })]);
    expect(ramenTrio(dishes, resolve)).toEqual([]);
  });
});

describe('parseDining 排序', () => {
  it('依日期排序，晚填的列不會留在最後', () => {
    const out = parseDining([
      { 日期: '2026-12-27', 餐別: '晚餐', '餐廳/地點': 'C' },
      { 日期: '2026-12-25', 餐別: '晚餐', '餐廳/地點': 'A' },
      { 日期: '2026-12-26', 餐別: '晚餐', '餐廳/地點': 'B' },
    ]);
    expect(out.map(d => d.name)).toEqual(['A', 'B', 'C']);
  });

  it('同一天依餐別的時間順序，而非字串順序', () => {
    // 字串排序會排成 早餐、晚餐、午餐
    const out = parseDining([
      { 日期: '2026-12-29', 餐別: '晚餐', '餐廳/地點': '五島軒' },
      { 日期: '2026-12-29', 餐別: '早餐', '餐廳/地點': '客美多' },
      { 日期: '2026-12-29', 餐別: '午餐', '餐廳/地點': '山崎洋服店' },
    ]);
    expect(out.map(d => d.meal)).toEqual(['早餐', '午餐', '晚餐']);
  });

  it('沒列入對照的餐別排在當日最後', () => {
    const out = parseDining([
      { 日期: '2026-12-29', 餐別: '宵夜', '餐廳/地點': 'X' },
      { 日期: '2026-12-29', 餐別: '早餐', '餐廳/地點': 'Y' },
    ]);
    expect(out.map(d => d.name)).toEqual(['Y', 'X']);
  });

  it('日期跨年時仍照時序——ISO 字串的字典序即時間序', () => {
    const out = parseDining([
      { 日期: '2027-01-02', 餐別: '午餐', '餐廳/地點': '新年' },
      { 日期: '2026-12-31', 餐別: '午餐', '餐廳/地點': '跨年' },
    ]);
    expect(out.map(d => d.name)).toEqual(['跨年', '新年']);
  });
});
