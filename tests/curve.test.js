import { describe, it, expect } from 'vitest';
import { lerpLine, catmullRom, smoothPath, arcPath } from '../src/curve.js';

describe('lerpLine', () => {
  it('起訖點正確', () => {
    const line = lerpLine({ lat: 0, lng: 0 }, { lat: 10, lng: 10 });
    expect(line[0]).toEqual({ lat: 0, lng: 0 });
    expect(line.at(-1)).toEqual({ lat: 10, lng: 10 });
  });

  it('中點在兩端連線上', () => {
    const line = lerpLine({ lat: 0, lng: 0 }, { lat: 10, lng: 0 }, 2);
    expect(line[1].lat).toBeCloseTo(5, 5);
  });
});

describe('catmullRom', () => {
  it('保留起訖點', () => {
    const pts = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 2, lng: 0 }];
    const out = catmullRom(pts);
    expect(out[0]).toEqual(pts[0]);
    expect(out.at(-1)).toEqual(pts.at(-1));
  });

  it('產生的點數多於輸入點數（有插值）', () => {
    const pts = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 2, lng: 0 }];
    expect(catmullRom(pts).length).toBeGreaterThan(pts.length);
  });
});

describe('smoothPath', () => {
  it('兩點時走直線插值', () => {
    const a = { lat: 0, lng: 0 }, b = { lat: 1, lng: 1 };
    expect(smoothPath([a, b])).toEqual(lerpLine(a, b));
  });

  it('三點以上時走 Catmull-Rom', () => {
    const pts = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 2, lng: 0 }];
    expect(smoothPath(pts)).toEqual(catmullRom(pts));
  });
});

describe('arcPath', () => {
  const TPE = { lat: 25.0777, lng: 121.2328 };
  const CTS = { lat: 42.775, lng: 141.692 };

  it('起訖點就是傳入的兩點', () => {
    const p = arcPath(TPE, CTS);
    expect(p[0].lat).toBeCloseTo(TPE.lat, 6);
    expect(p[0].lng).toBeCloseTo(TPE.lng, 6);
    expect(p.at(-1).lat).toBeCloseTo(CTS.lat, 6);
    expect(p.at(-1).lng).toBeCloseTo(CTS.lng, 6);
  });

  it('中段偏離直線——直線畫出來看不出是在飛', () => {
    const p = arcPath(TPE, CTS);
    const mid = p[Math.floor(p.length / 2)];
    const straightMid = { lat: (TPE.lat + CTS.lat) / 2, lng: (TPE.lng + CTS.lng) / 2 };
    expect(Math.hypot(mid.lat - straightMid.lat, mid.lng - straightMid.lng)).toBeGreaterThan(1);
  });

  it('往北鼓起，與大圓航線在麥卡托上的彎法一致', () => {
    const p = arcPath(TPE, CTS);
    const mid = p[Math.floor(p.length / 2)];
    expect(mid.lat).toBeGreaterThan((TPE.lat + CTS.lat) / 2);
    expect(mid.lng).toBeLessThan((TPE.lng + CTS.lng) / 2);
  });

  it('bow 為 0 時退回直線', () => {
    const p = arcPath(TPE, CTS, { bow: 0 });
    const mid = p[Math.floor(p.length / 2)];
    expect(mid.lat).toBeCloseTo((TPE.lat + CTS.lat) / 2, 6);
  });

  it('點數足夠讓曲線平滑', () => {
    expect(arcPath(TPE, CTS).length).toBeGreaterThan(50);
  });
});
