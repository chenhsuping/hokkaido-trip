const PROFILE = { drive: 'driving', bus: 'driving', walk: 'foot', tram: 'foot' };

/** OSRM demo 道路路徑抓取。jr 不路由；失敗一律回傳 null，退路交給呼叫端決定。 */
export function makeRoadFetcher({ fetchFn = fetch, maxConcurrent = 3 } = {}) {
  const cache = new Map();
  let active = 0;
  const queue = [];

  function acquire() {
    return new Promise(resolve => {
      const run = () => { active++; resolve(() => { active--; const next = queue.shift(); if (next) next(); }); };
      if (active < maxConcurrent) run(); else queue.push(run);
    });
  }

  async function request(profile, from, to) {
    const coords = `${from.lng.toFixed(5)},${from.lat.toFixed(5)};${to.lng.toFixed(5)},${to.lat.toFixed(5)}`;
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;
    const res = await fetchFn(url);
    if (!res.ok) return null;
    const data = await res.json();
    const coordinates = data.routes?.[0]?.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) return null;
    return coordinates.map(([lng, lat]) => ({ lat, lng }));
  }

  return {
    async fetchRoad(mode, from, to) {
      if (mode === 'jr') return null;
      const profile = PROFILE[mode] || 'driving';
      const key = `${profile}:${from.lat},${from.lng}:${to.lat},${to.lng}`;
      if (cache.has(key)) return cache.get(key);

      const release = await acquire();
      try {
        const line = await request(profile, from, to).catch(() => null);
        cache.set(key, line);
        return line;
      } finally {
        release();
      }
    },
  };
}
