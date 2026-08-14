import { latLng } from './places.js';
import { MODE_COLORS } from './transport.js';

/**
 * 「全程」模式的每日色票。單日模式改用該段 leg 的交通色。
 * 以固定調色盤而非取當日第一段的交通色——後者會讓多天撞色
 * （例如多天都以步行起頭，全部變成同一個黃色）。
 */
export const DAY_COLORS = [
  '#0e7ad4', '#12a97a', '#7a5cc4', '#f4622e',
  '#f0ad2a', '#c2557a', '#0e7ad4', '#12a97a',
  '#7a5cc4', '#f4622e',
];

export function createMap(el, { days, resolve }) {
  const map = L.map(el, { zoomControl: false, scrollWheelZoom: true, zoomSnap: 0.25 });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const layers = {
    route: L.layerGroup().addTo(map),
    pins: L.layerGroup().addTo(map),
  };

  /** 取得某段 leg 的兩端座標；任一端無座標則回傳 null。 */
  function legCoords(day, leg) {
    const a = resolve(day.spots[leg.fromIndex].name);
    const b = resolve(day.spots[leg.toIndex].name);
    return a && b ? [latLng(a), latLng(b)] : null;
  }

  function clear() {
    layers.route.clearLayers();
    layers.pins.clearLayers();
  }

  function showAll() {
    clear();
    const bounds = [];
    for (const [i, day] of days.entries()) {
      const color = DAY_COLORS[i % DAY_COLORS.length];
      for (const leg of day.legs) {
        const pts = legCoords(day, leg);
        if (!pts) continue;
        const c = MODE_COLORS[leg.mode];
        if (!c) continue;
        L.polyline(pts, {
          color, weight: 3.2, opacity: 0.85, lineCap: 'round',
          dashArray: leg.mode === 'drive' ? '8 8' : null,
        }).addTo(layers.route);
        bounds.push(...pts);
      }
    }
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [46, 46] });
  }

  function showDay(index) {
    clear();
    const day = days[index];
    const bounds = [];
    for (const leg of day.legs) {
      const pts = legCoords(day, leg);
      if (!pts) continue;
      const c = MODE_COLORS[leg.mode];
      if (!c) continue;
      L.polyline(pts, {
        color: c, weight: 3, opacity: 0.95, lineCap: 'round',
        dashArray: leg.mode === 'drive' ? '7 7' : null,
      }).addTo(layers.route);
      bounds.push(...pts);
    }
    for (const spot of day.spots) {
      const p = resolve(spot.name);
      if (!p) continue;
      L.circleMarker(latLng(p), {
        radius: 6, color: '#fff', weight: 2,
        fillColor: spot.stay ? '#7a5cc4' : '#0e7ad4', fillOpacity: 1,
      }).addTo(layers.pins);
      bounds.push(latLng(p));
    }
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 12 });
  }

  return { showAll, showDay };
}
