const INK = '#2b2721';
function wide(s, inner) {
  return `<svg width="${s * 1.55}" height="${s}" viewBox="0 0 44 24" fill="none">${inner}</svg>`;
}

/**
 * 高速列車圖示：兩節車廂、流線車頭、灰白漸層車身、深色車窗帶、車尾橘色速度殘影。
 * 車頭朝右（沿用 car/bus 圖示既有的朝向慣例），左→右移動時不需翻面。
 *
 * 刻意不畫車輪：高速列車的裙板本來就會遮住轉向架，而且在 40px 的地圖尺寸下，
 * 輪子只會變成車底一排看不出是什麼的黑點，反而干擾車身輪廓的辨識。
 * 速度感改由橘色殘影線 + map.js 的行駛震動負責。
 *
 * 縮到 0.62 倍：兩節車廂讓水平長度比單節長不少，加上長途會把鏡頭拉遠，
 * 圖示相對地圖顯得更大——縮小後比例才合理，也不會蓋住路線。
 */
export function trainIcon(s) {
  const size = s * 0.62;
  return wide(size,
    `<defs>
      <linearGradient id="trainBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="58%" stop-color="#f4f5f7"/>
        <stop offset="100%" stop-color="#d9dce2"/>
      </linearGradient>
    </defs>
    <line x1="0" y1="7.6" x2="4.5" y2="7.1" stroke="#f0a02a" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>
    <line x1=".4" y1="11" x2="5" y2="10.6" stroke="#f5b451" stroke-width="1.2" stroke-linecap="round" opacity=".75"/>
    <line x1="1.2" y1="14.4" x2="5.4" y2="14.1" stroke="#f8c778" stroke-width="1" stroke-linecap="round" opacity=".6"/>

    <rect x="6" y="5" width="15.5" height="10" rx="2.2"
      fill="url(#trainBody)" stroke="#b9bec7" stroke-width=".7" stroke-linejoin="round"/>
    <rect x="8" y="7" width="11.5" height="4.4" rx="1.1" fill="#2c3145"/>
    <rect x="6" y="13.5" width="15.5" height="1.5" rx=".75" fill="#f0a02a" opacity=".9"/>

    <rect x="21.8" y="8.5" width="1.4" height="4" fill="#8f96a1"/>

    <path d="M23.5 5 h9.5 c5.8 0 10.4 2.4 13 6 c.5 .7 .5 1.6 0 2.3 c-.8 1.1 -2.1 1.7 -3.7 1.7 H23.5 z"
      fill="url(#trainBody)" stroke="#b9bec7" stroke-width=".7" stroke-linejoin="round"/>
    <rect x="25" y="7" width="7.5" height="4.4" rx="1.1" fill="#2c3145"/>
    <path d="M33.8 7 h1.2 c3.4 .5 6.2 2 8.2 3.6 h-9.4 z" fill="#2c3145"/>
    <ellipse cx="40.5" cy="12.6" rx="1.6" ry="1" fill="#f5f6f8" opacity=".9"/>
    <rect x="23.5" y="13.5" width="19" height="1.5" rx=".75" fill="#f0a02a" opacity=".9"/>`);
}

export function carIcon(s) {
  const D = '#23262b', G = '#8d939a';
  return wide(s,
    `<path d="M3 16.4c0-1.4.6-2.5 1.9-2.9l4.6-1.3 5.1-3.6c1.2-.9 2.5-1.3 4-1.3h7.9c1.7 0 3.2.5 4.4 1.6l3.2 2.8 4.3 1.1c1.3.3 2 1.2 2 2.5v1.5c0 1-.6 1.6-1.7 1.6H4.7c-1.1 0-1.7-.6-1.7-1.6z" fill="#fff" stroke="${D}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M15.6 12.1l3.8-2.7c.6-.4 1.2-.6 1.9-.6h1.1v3.3z" fill="${D}"/>
    <path d="M23.9 8.8h3.9c1 0 1.9.3 2.6 1l2.5 2.3h-9z" fill="${D}"/>
    <path d="M23.4 12.6v5.2" stroke="${D}" stroke-width="1"/>
    <rect x="18.6" y="13.4" width="2.8" height="1" rx=".5" fill="${G}"/>
    <rect x="25.4" y="13.4" width="2.8" height="1" rx=".5" fill="${G}"/>
    <rect x="38.2" y="13.2" width="2.8" height="1.8" rx=".7" fill="#fff" stroke="${D}" stroke-width=".9"/>
    <rect x="3.6" y="13.2" width="2.4" height="1.8" rx=".7" fill="#e04b3c"/>
    <circle cx="12.8" cy="17.2" r="4" fill="${D}"/><circle cx="12.8" cy="17.2" r="2.2" fill="${G}"/>
    <circle cx="12.8" cy="17.2" r=".8" fill="#fff"/>
    <circle cx="31.4" cy="17.2" r="4" fill="${D}"/><circle cx="31.4" cy="17.2" r="2.2" fill="${G}"/>
    <circle cx="31.4" cy="17.2" r=".8" fill="#fff"/>`);
}

export function busIcon(s, c) {
  c = c || '#12a97a';
  const sz = s * 0.72;
  return wide(sz,
    `<rect x="4" y="5.6" width="35" height="13.6" rx="4.4" fill="#fff" stroke="${INK}" stroke-width="1.3"/>
    <path d="M6.4 8.8h13.2v4.4H6.4zM21.8 8.8h9.4v4.4h-9.4z" fill="${INK}" opacity=".8"/>
    <rect x="33.4" y="9" width="3.4" height="4" rx="1.2" fill="${c}"/>
    <rect x="4" y="15.4" width="35" height="1.6" fill="${c}" opacity=".85"/>
    <circle cx="12.6" cy="19.6" r="3.2" fill="${INK}"/><circle cx="12.6" cy="19.6" r="1.3" fill="#fff"/>
    <circle cx="30.6" cy="19.6" r="3.2" fill="${INK}"/><circle cx="30.6" cy="19.6" r="1.3" fill="#fff"/>`);
}

export function walkIcon(s, c) {
  c = c || INK;
  const sz = s * 0.62;
  return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="${c}">
    <ellipse cx="8.4" cy="16.2" rx="3.3" ry="4.7" transform="rotate(-10 8.4 16.2)"/>
    <circle cx="5.4" cy="10.4" r="1.25"/><circle cx="8.2" cy="9.5" r="1.35"/>
    <circle cx="11" cy="9.9" r="1.15"/><circle cx="13" cy="11.4" r=".95"/>
    <ellipse cx="16.6" cy="11.6" rx="2.9" ry="4.2" transform="rotate(-10 16.6 11.6)"/>
    <circle cx="13.9" cy="6.3" r="1.1"/><circle cx="16.5" cy="5.5" r="1.2"/>
    <circle cx="19" cy="5.9" r="1"/><circle cx="20.8" cy="7.2" r=".85"/>
  </svg>`;
}

export const ICON = { jr: trainIcon, drive: carIcon, bus: busIcon, walk: walkIcon, tram: walkIcon };
