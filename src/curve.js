export function lerpLine(a, b, steps = 24) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
  }
  return out;
}

/** Catmull-Rom 平滑：讓折線貼近實際路線又不生硬。 */
export function catmullRom(points) {
  const p4 = [points[0], ...points, points.at(-1)];
  const out = [];
  for (let i = 1; i < p4.length - 2; i++) {
    const p0 = p4[i - 1], p1 = p4[i], p2 = p4[i + 1], p3 = p4[i + 2];
    for (let j = 0; j < 16; j++) {
      const t = j / 16, t2 = t * t, t3 = t2 * t;
      out.push({
        lat: 0.5 * ((2 * p1.lat) + (-p0.lat + p2.lat) * t + (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 + (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3),
        lng: 0.5 * ((2 * p1.lng) + (-p0.lng + p2.lng) * t + (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * t2 + (-p0.lng + 3 * p1.lng - 3 * p2.lng + p3.lng) * t3),
      });
    }
  }
  out.push(points.at(-1));
  return out;
}

export function smoothPath(points) {
  return points.length === 2 ? lerpLine(points[0], points[1]) : catmullRom(points);
}

/**
 * 航線弧：兩點之間往航向左側鼓起的曲線。
 *
 * 飛機沒有路可循，退回 smoothPath 只會得到一條橫越海面的直線，看不出是在飛。
 * 大圓航線在麥卡托投影上本來就是往北彎的弧，畫成弧線既接近真實航路，
 * 也讓這段長距離移動在畫面上看得出方向感。
 *
 * bow 是弧頂相對於兩點距離的偏移比例。二次貝茲在 t=0.5 只走到控制點偏移的
 * 一半，所以控制點推兩倍，bow 才等於實際看到的鼓起程度。
 */
export function arcPath(a, b, { bow = 0.12, steps = 96 } = {}) {
  const dLat = b.lat - a.lat, dLng = b.lng - a.lng;
  const cLng = (a.lng + b.lng) / 2 - dLat * bow * 2;
  const cLat = (a.lat + b.lat) / 2 + dLng * bow * 2;
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    out.push({
      lat: u * u * a.lat + 2 * u * t * cLat + t * t * b.lat,
      lng: u * u * a.lng + 2 * u * t * cLng + t * t * b.lng,
    });
  }
  return out;
}
