/**
 * 把「經過沒有座標的地點」的路段接起來，讓路線保持連續。
 *
 * 行程表允許先填時間、地點之後再補（例如 1/1 晚餐還沒決定吃哪）。這種列
 * 沒有地名，也就沒有座標。原本的做法是任一端查不到座標就整段丟掉，結果是：
 *
 *   白色戀人公園 → (待定) → 民宿      兩段都被丟掉，動畫停在白色戀人公園
 *   啤酒博物館   → (待定) → 北海道大學  兩段都被丟掉，載具直接瞬移
 *
 * 待定的那一餐不該把一整天的路線切斷。這裡改成跨過去：把待定點前後接成
 * 一段，起點取最後一個有座標的地方，其餘欄位沿用「抵達下一個地點」那一段
 * ——因為那才是實際到達目的地的交通方式（上面第二例是地下鐵到北 13 條東站）。
 *
 * isLocated 由呼叫端提供（index => boolean），這個函式本身不碰地名簿，
 * 純粹是索引的重接，因此可以單獨測試。
 */
export function connectLegs(legs, isLocated) {
  const out = [];
  // 待接的起點：跨過待定點時先記著最後一個有座標的地方，等下一個有座標的點出現再接上
  let carried = null;

  for (const leg of legs) {
    const from = carried ?? (isLocated(leg.fromIndex) ? leg.fromIndex : null);
    if (from === null) continue;              // 還沒遇到任何有座標的點，無從接起

    if (!isLocated(leg.toIndex)) {
      carried = from;                         // 終點沒座標，把起點留到下一段
      continue;
    }
    out.push(from === leg.fromIndex ? leg : { ...leg, fromIndex: from });
    carried = null;
  }
  return out;
}
