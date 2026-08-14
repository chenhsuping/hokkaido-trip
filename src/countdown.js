/** 以日本時區（UTC+9，行程實際所在地）為準計算天數差。 */
export function formatCountdown(tripStartIso, now = new Date()) {
  const start = new Date(`${tripStartIso}T00:00:00+09:00`);
  const diffMs = start - now;
  const days = Math.ceil(diffMs / 86400000);
  if (days > 0) return `D-${days}`;
  if (days === 0) return 'D-DAY';
  return '已出發';
}
