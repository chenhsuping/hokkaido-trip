import { daysBetweenInclusive } from './dates.js';
import { buildCities } from './cities.js';

const R = 6371;
const rad = x => (x * Math.PI) / 180;

export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * 總移動距離為各 leg 兩端直線距離的累加，非實際里程，畫面應標示「約」。
 * 城市數透過 buildCities 取得，套用與五座城市區塊相同的分區對照——
 * 不能直接數 spot.city 的相異字串，否則「虻田郡」「有珠郡」會被誤算成兩個城市。
 */
export function computeStats({ days, resolve, tripStart, tripEnd }) {
  const spotNames = new Set();
  let totalKm = 0;

  for (const day of days) {
    for (const spot of day.spots) {
      if (spot.name) spotNames.add(spot.name);
    }
    for (const leg of day.legs) {
      const a = resolve(day.spots[leg.fromIndex]?.name);
      const b = resolve(day.spots[leg.toIndex]?.name);
      if (a && b) totalKm += haversineKm(a, b);
    }
  }

  return {
    plannedDays: days.length,
    totalDaySpan: daysBetweenInclusive(tripStart, tripEnd),
    cityCount: buildCities(days).length,
    spotCount: spotNames.size,
    totalKm,
  };
}
