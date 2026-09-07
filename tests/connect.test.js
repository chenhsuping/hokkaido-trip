import { describe, it, expect } from 'vitest';
import { connectLegs } from '../src/connect.js';

/** legs 只需要 fromIndex／toIndex，其餘欄位原樣帶著走 */
const leg = (fromIndex, toIndex, extra = {}) => ({ fromIndex, toIndex, mode: 'walk', ...extra });
/** 以「哪些索引沒有座標」建立 isLocated */
const missing = (...idx) => i => !idx.includes(i);

describe('connectLegs', () => {
  it('全部都有座標時原樣回傳', () => {
    const legs = [leg(0, 1), leg(1, 2), leg(2, 3)];
    expect(connectLegs(legs, () => true)).toEqual(legs);
  });

  it('跨過中間沒有座標的點，前後接成一段', () => {
    // 白色戀人公園(2) → (待定 3) → 民宿(4)
    const legs = [leg(0, 1), leg(1, 2), leg(2, 3), leg(3, 4, { mode: 'walk', label: '返回住宿' })];
    const out = connectLegs(legs, missing(3));
    expect(out.map(l => [l.fromIndex, l.toIndex])).toEqual([[0, 1], [1, 2], [2, 4]]);
  });

  it('接起來的那一段沿用「抵達下一個地點」那段的交通方式', () => {
    // 啤酒博物館(2) → (待定 3) → 北海道大學(4)，實際是搭地下鐵到北 13 條東站
    const legs = [leg(2, 3, { mode: 'walk', label: '' }), leg(3, 4, { mode: 'tram', label: '地下鐵 北13條東站', mins: 30 })];
    const [bridged] = connectLegs(legs, missing(3));
    expect(bridged).toMatchObject({ fromIndex: 2, toIndex: 4, mode: 'tram', label: '地下鐵 北13條東站', mins: 30 });
  });

  it('原本的 leg 物件不被就地修改', () => {
    const legs = [leg(2, 3), leg(3, 4)];
    connectLegs(legs, missing(3));
    expect(legs[1].fromIndex).toBe(3);
  });

  it('連續多個沒有座標的點也跨得過去', () => {
    const legs = [leg(0, 1), leg(1, 2), leg(2, 3), leg(3, 4)];
    const out = connectLegs(legs, missing(1, 2, 3));
    expect(out.map(l => [l.fromIndex, l.toIndex])).toEqual([[0, 4]]);
  });

  it('沒有座標的點落在最後時，不會生出一段接不到終點的路', () => {
    const legs = [leg(0, 1), leg(1, 2)];
    const out = connectLegs(legs, missing(2));
    expect(out.map(l => [l.fromIndex, l.toIndex])).toEqual([[0, 1]]);
  });

  it('沒有座標的點落在最前面時，從第一個有座標的點開始', () => {
    const legs = [leg(0, 1), leg(1, 2)];
    const out = connectLegs(legs, missing(0));
    expect(out.map(l => [l.fromIndex, l.toIndex])).toEqual([[1, 2]]);
  });

  it('全部都沒有座標時回傳空陣列', () => {
    expect(connectLegs([leg(0, 1), leg(1, 2)], () => false)).toEqual([]);
  });

  it('沒有路段時回傳空陣列', () => {
    expect(connectLegs([], () => true)).toEqual([]);
  });

  it('接起來之後路線是連續的——每段起點都等於前一段終點', () => {
    const legs = [leg(0, 1), leg(1, 2), leg(2, 3), leg(3, 4), leg(4, 5), leg(5, 6)];
    const out = connectLegs(legs, missing(2, 5));
    for (let i = 1; i < out.length; i++) {
      expect(out[i].fromIndex).toBe(out[i - 1].toIndex);
    }
  });
});
