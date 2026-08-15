import { describe, it, expect } from 'vitest';
import { addLodgingBookends } from '../src/bookend.js';

const spot = (o = {}) => ({
  name: '', time: '', city: '', activity: '', stay: false, transfer: false, pending: false, ...o,
});
const day = (iso, spots, legs = []) => ({
  index: 0, date: { iso }, city: '', spots, legs,
});
const leg = (from, to, mode = 'walk') => ({ fromIndex: from, toIndex: to, mode, label: '', mins: null });

/** 兩晚住宿：12/25 住旭川、12/26 住小樽 */
const stays = [
  { name: '旭川 JR 酒店', city: '旭川市', checkinIso: '2026-12-25', checkoutIso: '2026-12-26' },
  { name: 'Nord 小樽飯店', city: '小樽市', checkinIso: '2026-12-26', checkoutIso: '2026-12-27' },
];

describe('addLodgingBookends', () => {
  it('當天結尾補上當晚住宿', () => {
    const days = [day('2026-12-25', [spot({ name: '平和通商店街' })])];
    const out = addLodgingBookends(days, stays);
    const last = out[0].spots.at(-1);
    expect(last.name).toBe('旭川 JR 酒店');
    expect(last.stay).toBe(true);
  });

  it('隔天開頭補上前一晚住宿——出發點就是昨晚睡的地方', () => {
    const days = [
      day('2026-12-25', [spot({ name: '平和通商店街' })]),
      day('2026-12-26', [spot({ name: '旭山動物園' })]),
    ];
    const out = addLodgingBookends(days, stays);
    expect(out[1].spots[0].name).toBe('旭川 JR 酒店');
    expect(out[1].spots[0].stay).toBe(true);
  });

  it('補進去的頭尾要產生對應的路線段，否則地圖上不會連起來', () => {
    const days = [day('2026-12-25', [spot({ name: 'A' })])];
    const out = addLodgingBookends(days, stays);
    expect(out[0].spots).toHaveLength(2);          // A + 旭川 JR 酒店
    expect(out[0].legs).toHaveLength(1);           // A -> 酒店
    expect(out[0].legs[0]).toMatchObject({ fromIndex: 0, toIndex: 1 });
  });

  it('既有 leg 的索引要跟著位移，不能指向錯的景點', () => {
    const days = [day('2026-12-26', [spot({ name: 'X' }), spot({ name: 'Y' })], [leg(0, 1)])];
    const out = addLodgingBookends(days, stays);
    // 開頭插入前一晚住宿後，原本的 0->1 要變成 1->2
    const original = out[0].legs.find(l => out[0].spots[l.fromIndex].name === 'X');
    expect(original.toIndex).toBe(out[0].spots.findIndex(s => s.name === 'Y'));
  });

  it('當天已經以住宿作結時不重複補', () => {
    const days = [day('2026-12-25', [
      spot({ name: '平和通商店街' }),
      spot({ name: '旭川 JR 酒店', stay: true }),
    ])];
    const out = addLodgingBookends(days, stays);
    expect(out[0].spots.filter(s => s.name === '旭川 JR 酒店')).toHaveLength(1);
  });

  it('當天已經以住宿開頭時不重複補', () => {
    const days = [
      day('2026-12-25', [spot({ name: 'A' })]),
      day('2026-12-26', [spot({ name: '旭川 JR 酒店', stay: true }), spot({ name: 'B' })]),
    ];
    const out = addLodgingBookends(days, stays);
    expect(out[1].spots.filter(s => s.name === '旭川 JR 酒店')).toHaveLength(1);
  });

  it('查不到當晚住宿時不補，也不報錯', () => {
    const days = [day('2026-12-31', [spot({ name: 'Z' })])];
    const out = addLodgingBookends(days, stays);
    expect(out[0].spots).toHaveLength(1);
  });

  it('最後一天不補隔天的出發點（沒有下一天）', () => {
    const days = [day('2026-12-26', [spot({ name: 'A' })])];
    const out = addLodgingBookends(days, stays);
    expect(out[0].spots.at(-1).name).toBe('Nord 小樽飯店');
  });

  it('連住兩晚時，中間那天的頭尾也要補上同一間', () => {
    // 函館 12/28 入住、12/30 退房 —— 12/29 那晚仍然住在這裡
    const twoNight = [{ name: '函館', city: '函館', checkinIso: '2026-12-28', checkoutIso: '2026-12-30' }];
    const days = [
      day('2026-12-28', [spot({ name: '金森倉庫群' })]),
      day('2026-12-29', [spot({ name: '函館山纜車' })]),
    ];
    const out = addLodgingBookends(days, twoNight);
    expect(out[1].spots[0].name).toBe('函館');       // 早上從函館出發
    expect(out[1].spots.at(-1).name).toBe('函館');   // 晚上回到函館
  });

  it('退房當天不再算作住在那裡', () => {
    const twoNight = [{ name: '函館', city: '函館', checkinIso: '2026-12-28', checkoutIso: '2026-12-30' }];
    const days = [day('2026-12-30', [spot({ name: '五稜郭公園' })])];
    const out = addLodgingBookends(days, twoNight);
    expect(out[0].spots.at(-1).name).toBe('五稜郭公園');
  });

  it('退房日未填時只認入住當晚，不把後面每一晚都算成同一間', () => {
    const openEnded = [{ name: '某旅館', city: '札幌', checkinIso: '2026-12-25', checkoutIso: null }];
    const days = [
      day('2026-12-25', [spot({ name: 'A' })]),
      day('2026-12-26', [spot({ name: 'B' })]),
    ];
    const out = addLodgingBookends(days, openEnded);
    expect(out[0].spots.at(-1).name).toBe('某旅館');
    expect(out[1].spots.at(-1).name).toBe('B');
  });

  it('不改動原始 days 陣列', () => {
    const days = [day('2026-12-25', [spot({ name: 'A' })])];
    const before = days[0].spots.length;
    addLodgingBookends(days, stays);
    expect(days[0].spots).toHaveLength(before);
  });
});
