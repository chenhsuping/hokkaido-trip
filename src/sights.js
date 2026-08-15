/**
 * 「逛哪裡」：行程裡除了住宿與餐廳以外的地方。
 *
 * 三個區塊分別回答不同的問題，同一個地點不該同時出現在兩處：
 *   住哪裡 —— 由住宿頁籤推導，spot.stay 標記
 *   吃什麼 —— 由用餐頁籤推導，用地點名稱比對
 *   逛哪裡 —— 其餘的
 *
 * 另外排除三種不是「去逛」的地點：
 *   transfer —— 轉車站、纜車山麓站，只是路過換車
 *   opening  —— 開場航段的出發機場，人在台灣
 *   pending  —— 地點欄還沒填，只有一列佔位
 *
 * 同一個地方去兩次只留第一次，並依日期與當天的先後排序。
 */

const norm = s => String(s ?? '').replace(/\s+/g, '').toLowerCase();

export function buildSights({ days, diningNames = [] }) {
  const skip = new Set(diningNames.map(norm));
  const seen = new Set();
  const out = [];

  for (const day of days) {
    for (const [i, spot] of day.spots.entries()) {
      if (!spot.name || spot.stay || spot.transfer || spot.opening || spot.pending) continue;
      const key = norm(spot.name);
      if (skip.has(key) || seen.has(key)) continue;
      seen.add(key);
      out.push({
        name: spot.name,
        city: spot.city || day.city || '',
        activity: spot.activity || '',
        time: spot.time || '',
        date: day.date.iso,
        dayIndex: day.index,
        order: i,
      });
    }
  }

  return out;
}
