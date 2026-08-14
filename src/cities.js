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
 */
export function buildCities(days) {
  const order = [];
  const byName = new Map();

  for (const day of days) {
    for (const spot of day.spots) {
      if (!spot.city) continue;
      if (CITY_MAP[spot.city] === null) continue;
      const name = canonicalCity(spot.city);

      if (!byName.has(name)) {
        byName.set(name, { name, dayIndices: new Set(), spotNames: [] });
        order.push(name);
      }
      const entry = byName.get(name);
      if (!spot.transfer) entry.dayIndices.add(day.index);
      if (spot.name) entry.spotNames.push(spot.name);
    }
  }

  return order.map(name => {
    const e = byName.get(name);
    return { name: e.name, dayIndices: [...e.dayIndices].sort((a, b) => a - b), spotNames: e.spotNames };
  });
}
