import { describe, it, expect, vi } from 'vitest';
import { makeGeocoder, CACHE_KEY } from '../src/geocode.js';

function memStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
  };
}

const okResponse = (lat, lon) => ({ ok: true, json: async () => [{ lat: String(lat), lon: String(lon) }] });

describe('makeGeocoder', () => {
  it('查詢成功時回傳座標', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse(43.06, 141.35));
    const g = makeGeocoder({ fetchFn, storage: memStorage(), sleep: async () => {} });
    expect(await g.lookup('某新地點')).toEqual({ lat: 43.06, lng: 141.35 });
  });

  it('結果寫入快取', async () => {
    const storage = memStorage();
    const fetchFn = vi.fn().mockResolvedValue(okResponse(43.06, 141.35));
    const g = makeGeocoder({ fetchFn, storage, sleep: async () => {} });
    await g.lookup('某新地點');
    expect(JSON.parse(storage.getItem(CACHE_KEY))['某新地點']).toEqual({ lat: 43.06, lng: 141.35 });
  });

  it('快取命中時不再發出請求', async () => {
    const storage = memStorage({ [CACHE_KEY]: JSON.stringify({ 快取地點: { lat: 1, lng: 2 } }) });
    const fetchFn = vi.fn();
    const g = makeGeocoder({ fetchFn, storage, sleep: async () => {} });
    expect(await g.lookup('快取地點')).toEqual({ lat: 1, lng: 2 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('查無結果時回傳 null 並快取該結果', async () => {
    const storage = memStorage();
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    const g = makeGeocoder({ fetchFn, storage, sleep: async () => {} });
    expect(await g.lookup('查不到的地方')).toBeNull();
    expect(JSON.parse(storage.getItem(CACHE_KEY))['查不到的地方']).toBeNull();

    await g.lookup('查不到的地方');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('網路錯誤時回傳 null 且不寫入快取', async () => {
    const storage = memStorage();
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'));
    const g = makeGeocoder({ fetchFn, storage, sleep: async () => {} });
    expect(await g.lookup('某地')).toBeNull();
    expect(storage.getItem(CACHE_KEY)).toBeNull();
  });

  it('連續查詢之間至少間隔 minIntervalMs', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchFn = vi.fn().mockResolvedValue(okResponse(43, 141));
    const g = makeGeocoder({ fetchFn, storage: memStorage(), minIntervalMs: 1000, sleep });
    await g.lookup('A');
    await g.lookup('B');
    expect(sleep).toHaveBeenCalled();
    expect(sleep.mock.calls.some(c => c[0] > 0)).toBe(true);
  });

  it('請求為序列化執行，不並行', async () => {
    let inFlight = 0, maxInFlight = 0;
    const fetchFn = vi.fn().mockImplementation(async () => {
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      await Promise.resolve();
      inFlight--;
      return okResponse(43, 141);
    });
    const g = makeGeocoder({ fetchFn, storage: memStorage(), sleep: async () => {} });
    await Promise.all([g.lookup('A'), g.lookup('B'), g.lookup('C')]);
    expect(maxInFlight).toBe(1);
  });
});
