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

/** 找出某日「當晚」住哪：入住日等於該日者。 */
function stayOfNight(stays, iso) {
  return stays.find(s => s.checkinIso === iso) || null;
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
