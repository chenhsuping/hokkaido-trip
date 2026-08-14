const norm = s => String(s ?? '').replace(/\s+/g, '').toLowerCase();

/** 建立地名解析器。主鍵與別名皆可解析，並忽略空白差異。 */
export function makeResolver(places) {
  const index = new Map();
  for (const [key, value] of Object.entries(places)) {
    index.set(norm(key), value);
    for (const alias of value.aliases || []) index.set(norm(alias), value);
  }
  return name => index.get(norm(name)) || null;
}

/** Leaflet 使用 [lat, lng]，地名簿存具名的 lng / lat 欄位。 */
export function latLng(place) {
  return [place.lat, place.lng];
}
