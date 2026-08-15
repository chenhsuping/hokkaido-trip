/**
 * 在第一天的最前面補上「桃園 → 新千歲」這段航程。
 *
 * 行程頁籤的第一列就是抵達新千歲空港，飛過來的那段沒有被記錄成一列
 * ——但它是整趟旅行真正的起點。這裡補上出發機場當作第一個景點，
 * 播放 Day 1 時就會先看到飛機飛過來，鏡頭再收回北海道接續當天行程。
 *
 * 補進來的景點與路段都帶 opening 旗標：地圖的靜態視圖（單日、全程）
 * 據以排除它們。否則畫面邊界會被拉到包含台灣，整個北海道縮成一小塊。
 */

export const ORIGIN_AIRPORT = '桃園國際機場';

export function addOpeningFlight(days, { origin = ORIGIN_AIRPORT, label = '台灣虎航 IT234' } = {}) {
  if (!days.length) return days;
  const [first, ...rest] = days;
  if (!first.spots.length || first.spots[0].name === origin) return days;

  const spots = [
    {
      name: origin, time: '', city: '桃園市', activity: '出發',
      stay: false, transfer: false, pending: false, opening: true,
    },
    ...first.spots,
  ];

  // 開頭插入景點，既有 leg 的索引全部往後位移一格
  const legs = [
    { fromIndex: 0, toIndex: 1, mode: 'flight', label, mins: null, opening: true },
    ...first.legs.map(l => ({ ...l, fromIndex: l.fromIndex + 1, toIndex: l.toIndex + 1 })),
  ];

  return [{ ...first, spots, legs }, ...rest];
}
