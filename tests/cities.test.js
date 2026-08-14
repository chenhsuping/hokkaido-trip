import { describe, it, expect } from 'vitest';
import { CITY_MAP, canonicalCity, buildCities } from '../src/cities.js';

describe('CITY_MAP', () => {
  it('虻田郡與有珠郡都對應到洞爺', () => {
    expect(CITY_MAP['虻田郡']).toBe('洞爺');
    expect(CITY_MAP['有珠郡']).toBe('洞爺');
  });

  it('千歲市對應到 null（不成區塊）', () => {
    expect(CITY_MAP['千歲市']).toBeNull();
  });
});

describe('canonicalCity', () => {
  it('對照表內的城市轉換為網站名稱', () => {
    expect(canonicalCity('旭川市')).toBe('旭川');
    expect(canonicalCity('函館市')).toBe('函館');
  });

  it('對照表以外的城市原樣回傳', () => {
    expect(canonicalCity('稚內市')).toBe('稚內市');
  });
});

const day = (o = {}) => ({
  index: 0, date: { iso: '2026-12-25' }, city: '', spots: [], legs: [], ...o,
});
const spot = (o = {}) => ({
  name: '', time: '', city: '', activity: '', stay: false, transfer: false, pending: false, ...o,
});

describe('buildCities', () => {
  it('依首次出現順序列出城市', () => {
    const days = [
      day({ date: { iso: '2026-12-25' }, spots: [spot({ name: 'A', city: '旭川市' })] }),
      day({ date: { iso: '2026-12-26' }, spots: [spot({ name: 'B', city: '小樽市' })] }),
    ];
    expect(buildCities(days).map(c => c.name)).toEqual(['旭川', '小樽']);
  });

  it('轉車日不計入停留天數', () => {
    const days = [
      day({ index: 0, spots: [spot({ name: 'JR 札幌站', city: '札幌市', activity: '轉車', transfer: true })] }),
      day({ index: 1, spots: [spot({ name: '大通公園', city: '札幌市', activity: '走走逛逛' })] }),
    ];
    const sapporo = buildCities(days).find(c => c.name === '札幌');
    expect(sapporo.dayIndices).toEqual([1]);
  });

  it('虻田郡與有珠郡合併為同一個洞爺區塊', () => {
    const days = [
      day({ index: 0, spots: [spot({ name: 'A', city: '虻田郡' })] }),
      day({ index: 1, spots: [spot({ name: 'B', city: '有珠郡' })] }),
    ];
    const cities = buildCities(days);
    expect(cities.filter(c => c.name === '洞爺')).toHaveLength(1);
    expect(cities.find(c => c.name === '洞爺').dayIndices).toEqual([0, 1]);
  });

  it('千歲市不產生區塊', () => {
    const days = [day({ spots: [spot({ name: '新千歲空港', city: '千歲市' })] })];
    expect(buildCities(days).find(c => c.name === '千歲市')).toBeUndefined();
  });

  it('對照表以外的城市仍新增區塊', () => {
    const days = [day({ spots: [spot({ name: 'X', city: '稚內市' })] })];
    expect(buildCities(days).map(c => c.name)).toContain('稚內市');
  });

  it('蒐集每座城市造訪過的地點名稱', () => {
    const days = [day({ spots: [
      spot({ name: 'A', city: '函館市' }),
      spot({ name: 'B', city: '函館市', activity: '轉車', transfer: true }),
    ] })];
    expect(buildCities(days).find(c => c.name === '函館').spotNames).toEqual(['A', 'B']);
  });

  it('排序依「第一次非轉車出現」，不是單純第一次出現——轉車站不能讓一座城市搶到排序前面', () => {
    const days = [
      day({ index: 0, spots: [
        spot({ name: '新千歲空港', city: '千歲市' }),
        spot({ name: 'JR 札幌站', city: '札幌市', activity: '轉車', transfer: true }),
        spot({ name: 'JR 旭川站', city: '旭川市' }),
      ] }),
      day({ index: 1, spots: [spot({ name: '大通公園', city: '札幌市' })] }),
    ];
    expect(buildCities(days).map(c => c.name)).toEqual(['旭川', '札幌']);
  });
});
