/**
 * 計算載具圖示的俯仰角與左右翻面。
 * 只有明顯的左右移動（|dx|>4）才改變翻面方向，避免垂直移動時抖動翻面。
 * 角度限制在 ±20 度：汽車／巴士／腳印這類圖示過度傾斜會變得難以辨識。
 */
export function computeHeading(dx, dy, prevFlip) {
  const len = Math.hypot(dx, dy);
  if (len < 0.6) return { angle: 0, flip: prevFlip };
  const flip = Math.abs(dx) > 4 ? (dx < 0 ? -1 : 1) : prevFlip;
  let angle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI);
  angle = Math.max(-20, Math.min(20, angle)) * (flip < 0 ? -1 : 1);
  return { angle, flip };
}

/**
 * 完全貼合行進方向的版本，不限制傾角——列車沿著彎曲的鐵路走，
 * 車頭必須真的指向前進方向，±20 度的上限會讓它在陡峭路段明顯歪掉。
 *
 * 回傳的 angle 是相對於「圖示原本朝右」的旋轉角度。往左行進時翻面（flip=-1）
 * 讓車頭朝左，此時角度要跟著鏡射，否則車身會上下顛倒。
 */
export function computeTrackHeading(dx, dy, prevFlip) {
  const len = Math.hypot(dx, dy);
  if (len < 0.6) return { angle: 0, flip: prevFlip };
  const flip = Math.abs(dx) > 1.5 ? (dx < 0 ? -1 : 1) : prevFlip;
  // atan2(dy, dx) 為往右的角度；翻面後圖示已被 scaleX(-1) 鏡射，
  // 旋轉角也必須取負值才會與行進方向一致。
  const raw = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI);
  return { angle: flip < 0 ? -raw : raw, flip };
}
