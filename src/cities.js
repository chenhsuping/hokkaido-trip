export const CITY_MAP = {
  '旭川市': '旭川',
  '小樽市': '小樽',
  '虻田郡': '洞爺',
  '有珠郡': '洞爺',
  '函館市': '函館',
  '札幌市': '札幌',
  '千歲市': null,
};

export function canonicalCity(raw) {
  return raw in CITY_MAP ? (CITY_MAP[raw] ?? raw) : raw;
}

/**
 * 依景點的城市欄分組，統計停留天數。
 * 「停留天數」只計入當日有非轉車景點的日子——札幌在 Day 1–3 只是轉車經過，
 * 若不排除轉車會誤報成停留了不該算的天數。
 *
 * 城市排序同樣以「第一次非轉車出現」為準，不是單純第一次出現：
 * Day 1 的第二個景點是「JR 札幌站」（轉車），若照原始出現順序排列，
 * 札幌會排在旭川前面，即使真正到訪札幌要等到 Day 7。
 */
export function buildCities(days) {
  const order = [];
  const byName = new Map();

  for (const day of days) {
    for (const spot of day.spots) {
      if (!spot.city) continue;
      if (CITY_MAP[spot.city] === null) continue;
      const name = canonicalCity(spot.city);

      if (!byName.has(name)) byName.set(name, { name, dayIndices: new Set(), spotNames: [] });
      const entry = byName.get(name);

      if (!spot.transfer) {
        if (!order.includes(name)) order.push(name);
        entry.dayIndices.add(day.index);
      }
      if (spot.name) entry.spotNames.push(spot.name);
    }
  }

  // 保底：若某城市自始至終只出現轉車景點，仍要出現在結果中（排在有實際停留的城市之後）。
  for (const name of byName.keys()) if (!order.includes(name)) order.push(name);

  return order.map(name => {
    const e = byName.get(name);
    return { name: e.name, dayIndices: [...e.dayIndices].sort((a, b) => a - b), spotNames: e.spotNames };
  });
}
