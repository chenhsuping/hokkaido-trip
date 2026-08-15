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
  ropeway: '#7a5cc4',
  flight: '#5c9ecf',
};

/**
 * 依「目的地名稱」覆寫交通方式。
 *
 * 有些路段的實際交通工具無法從「交通工具」欄看出來——函館山纜車那列填的是
 * 「步行」（走到纜車站再搭纜車，填表時記的是前半段），但畫面上顯示一路走上
 * 函館山並不合理。這類地點以名稱判定，覆寫掉欄位的分類結果。
 *
 * 放在這裡而不是 classifyMode：classifyMode 的職責是解析交通工具字串，
 * 不該知道地點名。這是獨立的一層覆寫規則。
 */
const DESTINATION_MODE = [
  { re: /纜車|ロープウェイ|ropeway/i, mode: 'ropeway' },
];

export function overrideModeByDestination(mode, destinationName) {
  const name = String(destinationName ?? '');
  for (const r of DESTINATION_MODE) if (r.re.test(name)) return r.mode;
  return mode;
}

export function classifyMode(label) {
  const s = String(label ?? '').trim();
  if (!s) return 'walk';
  for (const r of RULES) if (r.re.test(s)) return r.mode;
  return 'walk';
}
