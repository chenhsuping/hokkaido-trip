/**
 * 餐別的時間順序。餐別欄是「早餐／午餐／晚餐」這種文字，字串排序會排成
 * 早餐、晚餐、午餐，跟一天的實際進行順序不一樣，所以另外給定序位。
 * 未列出的餐別（例如臨時加的「宵夜」）排在當日最後。
 */
const MEAL_ORDER = { '早餐': 1, '早午餐': 2, '午餐': 3, '下午茶': 4, '晚餐': 5 };
const mealRank = m => MEAL_ORDER[m] ?? 9;

/**
 * 訂位狀態直接反映試算表原意：TRUE=已訂位、FALSE=未訂位、空值=不適用（不強行視為未訂位）。
 *
 * 依日期、同日再依餐別時間排序。試算表目前恰好是照順序填的，但那是使用者
 * 當下的輸入習慣，不是資料的保證——之後補一筆漏掉的午餐就會插在最後。
 */
export function parseDining(rows) {
  return rows.map(r => ({
    date: r['日期'] || '',
    city: r['城市'] || '',
    name: r['餐廳/地點'] || '',
    meal: r['餐別'] || '',
    reserved: r['預約狀態'] === 'TRUE' ? true : r['預約狀態'] === 'FALSE' ? false : null,
    note: r['備註'] || '',
  })).sort((a, b) =>
    a.date.localeCompare(b.date) || mealRank(a.meal) - mealRank(b.meal));
}
