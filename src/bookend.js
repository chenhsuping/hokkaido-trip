/**
 * 在每天的頭尾補上住宿點：早上從昨晚住的地方出發，晚上回到當晚住的地方。
 *
 * 「行程規劃」頁籤只記錄了當天要去的景點，沒有記「從飯店出發」「回到飯店」
 * 這兩段——但那是實際會發生的移動。住宿資訊已經在「住宿」頁籤裡，
 * 這裡據以推導補上，使用者不必在行程頁籤重複輸入。
 *
 * 回傳新的 days 陣列，不改動傳入的原始資料。
 */

const spotFromStay = stay => ({
  name: stay.name,
  time: '',
  city: stay.city || '',
  activity: '住宿',
  stay: true,
  transfer: false,
  pending: false,
});

/**
 * 找出某日「當晚」住哪：入住日 ≤ 該日 < 退房日。
 *
 * 不能只比對入住日相等——連住兩晚的住宿（例如函館 12/28 入住、12/30 退房）
 * 只會在 12/28 被找到，12/29 那天的頭尾就整個補不上去。
 * ISO 日期字串的字典序即時間序，可直接比大小。
 */
function stayOfNight(stays, iso) {
  return stays.find(s => {
    if (!s.checkinIso) return false;
    // 退房日未定時只認入住當晚，否則這筆會把後面所有夜晚都吃掉
    if (!s.checkoutIso) return s.checkinIso === iso;
    return s.checkinIso <= iso && iso < s.checkoutIso;
  }) || null;
}

export function addLodgingBookends(days, stays) {
  return days.map((day, i) => {
    const spots = [...day.spots];
    // leg 用索引指向 spots，開頭插入會讓所有既有索引位移，必須跟著調整
    let legs = day.legs.map(l => ({ ...l }));

    // 開頭：昨晚住的地方（第一天沒有前一晚，跳過）
    const prevNight = i > 0 ? stayOfNight(stays, days[i - 1].date.iso) : null;
    if (prevNight && spots[0]?.name !== prevNight.name) {
      spots.unshift(spotFromStay(prevNight));
      legs = legs.map(l => ({ ...l, fromIndex: l.fromIndex + 1, toIndex: l.toIndex + 1 }));
      legs.unshift({
        fromIndex: 0, toIndex: 1,
        mode: 'walk', label: '出發', mins: null,
      });
    }

    // 結尾：當晚住的地方
    const tonight = stayOfNight(stays, day.date.iso);
    if (tonight && spots.at(-1)?.name !== tonight.name) {
      spots.push(spotFromStay(tonight));
      legs.push({
        fromIndex: spots.length - 2, toIndex: spots.length - 1,
        mode: 'walk', label: '返回住宿', mins: null,
      });
    }

    return { ...day, spots, legs };
  });
}
