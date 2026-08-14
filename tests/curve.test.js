import { describe, it, expect } from 'vitest';
import { lerpLine, catmullRom, smoothPath } from '../src/curve.js';

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
