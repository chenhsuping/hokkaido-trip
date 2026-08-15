/**
 * 「逛哪裡」：行程裡除了住宿與餐廳以外的地方。
 *
 * 三個區塊分別回答不同的問題，同一個地點不該同時出現在兩處：
 *   住哪裡 —— 由住宿頁籤推導，spot.stay 標記
 *   吃什麼 —— 由用餐頁籤推導，用地點名稱比對
 *   逛哪裡 —— 其餘的
 *
 * 另外排除幾種不是「去逛」的地點：
 *   transfer —— 轉車站、纜車山麓站，只是路過換車
 *   opening  —— 開場航段的出發機場，人在台灣
 *   pending  —— 地點欄還沒填，只有一列佔位
 *   交通節點 —— 機場、車站、巴士站、租車據點，見下方 TRANSIT
 *
 * 同一個地方去兩次只留第一次，並依日期與當天的先後排序。
 */

/**
 * 交通節點：機場、車站、巴士站與月台、租車據點。
 *
 * 這些地方會出現在行程裡是因為得在那裡上下車，不是去逛的目的地。
 * transfer 旗標只認活動內容剛好填「轉車」那幾列，抓不到「JR 函館站」
 * 這種當天真的有下車走動、但仍然只是交通節點的列，所以另外用名稱比對。
 */
const TRANSIT = [
  /空港|機場|airport/i,
  /站$|駅$/,
  /巴士站|巴士總站|月台|バス停/,
  /租車|rent-?a-?car/i,
];

const isTransit = name => TRANSIT.some(re => re.test(name));

const norm = s => String(s ?? '').replace(/\s+/g, '').toLowerCase();

/**
 * 這個地點本身值不值得列出來——住宿、轉車、開場出發地、佔位列與交通節點都不算。
 *
 * 「逛哪裡」和左側時間軸共用同一套判準：同一個地方不該在一邊看得到、
 * 另一邊卻消失。差別只在「逛哪裡」還要另外扣掉餐廳（那是吃什麼的內容），
 * 時間軸則連餐廳一起列——那是當天真的會去的地方。
 */
export function isPlaceOfInterest(spot) {
  if (!spot?.name || spot.stay || spot.transfer || spot.opening || spot.pending) return false;
  return !isTransit(spot.name);
}

export function buildSights({ days, diningNames = [] }) {
  const skip = new Set(diningNames.map(norm));
  const seen = new Set();
  const out = [];

  for (const day of days) {
    for (const [i, spot] of day.spots.entries()) {
      if (!isPlaceOfInterest(spot)) continue;
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
