/**
 * jr 也用 driving：OSRM demo 沒有鐵路 profile，但北海道的幹線鐵路大致沿著
 * 主要道路的走廊前進（函館本線／室蘭本線都是如此），driving 路徑遠比兩點直線
 * 貼近實際鐵道走向。實測札幌→旭川，driving 中點與直線中點相差約 8 公里。
 */
const PROFILE = { jr: 'driving', drive: 'driving', bus: 'driving', walk: 'foot', tram: 'foot' };

/**
 * 沒有道路可循的模式，直接回傳 null 讓呼叫端自己畫線，不必浪費一次請求：
 * 飛機走天空（跨海根本無路可規劃），纜車走纜索（山路的 foot 路徑是繞行的
 * 登山道，與纜車直上直下的路徑完全是兩回事）。
 */
const NO_ROAD = new Set(['flight', 'ropeway']);

/** OSRM demo 道路路徑抓取。失敗一律回傳 null，退路交給呼叫端決定。 */
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
      if (NO_ROAD.has(mode)) return null;
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
