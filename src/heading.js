/**
 * 計算載具圖示的俯仰角與左右翻面。
 * 只有明顯的左右移動（|dx|>4）才改變翻面方向，避免垂直移動時抖動翻面。
 */
export function computeHeading(dx, dy, prevFlip) {
  const len = Math.hypot(dx, dy);
  if (len < 0.6) return { angle: 0, flip: prevFlip };
  const flip = Math.abs(dx) > 4 ? (dx < 0 ? -1 : 1) : prevFlip;
  let angle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI);
  angle = Math.max(-20, Math.min(20, angle)) * (flip < 0 ? -1 : 1);
  return { angle, flip };
}
