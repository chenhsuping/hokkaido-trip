import { describe, it, expect, vi } from 'vitest';
import { makeRoadFetcher } from '../src/roads.js';

const okResponse = coords => ({
  ok: true,
  json: async () => ({ routes: [{ geometry: { coordinates: coords } }] }),
});

describe('makeRoadFetcher', () => {
  it('jr 模式一律不呼叫 OSRM，直接回傳 null', async () => {
    const fetchFn = vi.fn();
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    const result = await fetchRoad('jr', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 });
    expect(result).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('drive 模式使用 driving 路線並轉為 {lat,lng}', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse([[141, 43], [141.1, 43.1]]));
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    const result = await fetchRoad('drive', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 });
    expect(result).toEqual([{ lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 }]);
    expect(fetchFn.mock.calls[0][0]).toContain('/driving/');
  });

  it('walk 模式使用 foot 路線', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse([[141, 43], [141.1, 43.1]]));
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    await fetchRoad('walk', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 });
    expect(fetchFn.mock.calls[0][0]).toContain('/foot/');
  });

  it('bus 與 tram 沿用 driving／foot', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse([[141, 43], [141.1, 43.1]]));
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    await fetchRoad('bus', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 });
    await fetchRoad('tram', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 });
    expect(fetchFn.mock.calls[0][0]).toContain('/driving/');
    expect(fetchFn.mock.calls[1][0]).toContain('/foot/');
  });

  it('HTTP 失敗時回傳 null', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false });
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    expect(await fetchRoad('drive', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 })).toBeNull();
  });

  it('網路例外時回傳 null 而不拋出', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'));
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    expect(await fetchRoad('drive', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 })).toBeNull();
  });

  it('回應缺少路線資料時回傳 null', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ routes: [] }) });
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    expect(await fetchRoad('drive', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 })).toBeNull();
  });

  it('相同請求會快取，第二次不重新呼叫', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse([[141, 43], [141.1, 43.1]]));
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    const from = { lat: 43, lng: 141 }, to = { lat: 43.1, lng: 141.1 };
    await fetchRoad('drive', from, to);
    await fetchRoad('drive', from, to);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('同時最多 maxConcurrent 個請求在飛行中', async () => {
    let inFlight = 0, maxInFlight = 0;
    const fetchFn = vi.fn().mockImplementation(async () => {
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      await new Promise(r => setTimeout(r, 10));
      inFlight--;
      return okResponse([[141, 43], [141.1, 43.1]]);
    });
    const { fetchRoad } = makeRoadFetcher({ fetchFn, maxConcurrent: 2 });
    await Promise.all([0, 1, 2, 3, 4].map(i =>
      fetchRoad('drive', { lat: 43 + i, lng: 141 }, { lat: 43.1 + i, lng: 141.1 })));
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});
