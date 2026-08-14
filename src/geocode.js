export const CACHE_KEY = 'hokkaido:geocode';

const defaultSleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Nominatim 地理編碼。僅用於 places.json 未涵蓋的地點。
 * 遵守使用政策：請求序列化執行，且相鄰兩次至少間隔 minIntervalMs。
 * 結果（含查無結果的 null）快取於 storage，避免重複查詢。
 */
export function makeGeocoder({
  fetchFn = fetch,
  storage = localStorage,
  minIntervalMs = 1000,
  sleep = defaultSleep,
} = {}) {
  let cache = null;
  let queue = Promise.resolve();
  let lastAt = 0;

  function readCache() {
    if (cache) return cache;
    try {
      cache = JSON.parse(storage.getItem(CACHE_KEY) || '{}');
    } catch {
      cache = {};
    }
    return cache;
  }

  function writeCache(name, value) {
    const c = readCache();
    c[name] = value;
    try {
      storage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch {
      /* 儲存空間滿或被停用時，僅失去快取，不影響功能 */
    }
  }

  async function request(name) {
    const wait = minIntervalMs - (Date.now() - lastAt);
    await sleep(wait > 0 ? wait : 0);
    lastAt = Date.now();

    const url = 'https://nominatim.openstreetmap.org/search'
      + `?format=json&limit=1&q=${encodeURIComponent(name + ' 北海道')}`;
    const res = await fetchFn(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const hits = await res.json();
    if (!hits.length) {
      writeCache(name, null);
      return null;
    }
    const coords = { lat: Number(hits[0].lat), lng: Number(hits[0].lon) };
    writeCache(name, coords);
    return coords;
  }

  return {
    async lookup(name) {
      const c = readCache();
      if (name in c) return c[name];

      const run = queue.then(() => request(name).catch(() => null));
      queue = run.then(() => undefined, () => undefined);
      return run;
    },
  };
}
