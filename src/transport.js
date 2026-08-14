/** 判斷順序即陣列順序，先命中者為準。 */
const RULES = [
  { mode: 'jr',     re: /JR|特急|特級|本線|Rapid Airport/i },
  { mode: 'drive',  re: /開車|租車/ },
  { mode: 'bus',    re: /巴士|接駁車/ },
  { mode: 'tram',   re: /市電|地下鐵/ },
  { mode: 'walk',   re: /步行/ },
  { mode: 'flight', re: /航空|虎航|\bIT\d{3}\b|\bFD\d{3}\b/ },
];

export const MODE_COLORS = {
  jr: '#0e7ad4',
  drive: '#f4622e',
  bus: '#12a97a',
  tram: '#f0ad2a',
  walk: '#f0ad2a',
  flight: null,
};

export function classifyMode(label) {
  const s = String(label ?? '').trim();
  if (!s) return 'walk';
  for (const r of RULES) if (r.re.test(s)) return r.mode;
  return 'walk';
}
