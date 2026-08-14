export function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? '').trim());
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3], iso: m[0] };
}

/** 以完整日期比較。行程跨年，不可只比月-日。 */
export function compareDates(a, b) {
  return (a.y - b.y) || (a.m - b.m) || (a.d - b.d);
}

export function monthDay(date) {
  return String(date.m).padStart(2, '0') + '-' + String(date.d).padStart(2, '0');
}

/**
 * 以完整日期關聯；找不到才退回月-日。
 * 退路命中時回傳 usedFallback=true，供畫面顯示年份不一致提示。
 */
export function matchByDate(rows, field, target) {
  const exact = rows.find(r => {
    const d = parseDate(r[field]);
    return d && compareDates(d, target) === 0;
  });
  if (exact) return { row: exact, usedFallback: false };

  const md = monthDay(target);
  const loose = rows.find(r => {
    const d = parseDate(r[field]);
    return d && monthDay(d) === md;
  });
  return loose ? { row: loose, usedFallback: true } : { row: null, usedFallback: false };
}

/** 找出早於行程起始日的日期——多半是跨年那幾天的年份填錯。 */
export function findDateAnomalies(dates, tripStartIso) {
  const start = parseDate(tripStartIso);
  return dates
    .filter(d => d && compareDates(d, start) < 0)
    .map(d => ({ iso: d.iso, reason: `早於行程起始日 ${tripStartIso}` }));
}
