const INK = '#2b2721';
function wide(s, inner) {
  return `<svg width="${s * 1.55}" height="${s}" viewBox="0 0 44 24" fill="none">${inner}</svg>`;
}

/**
 * 高速列車圖示：流線車頭、灰白漸層車身、深色車窗帶、車尾拖出的橘色速度殘影、
 * 會自轉的車輪——這些都是刻意的視覺線索，讓靜止的截圖也讀得出「正在高速行駛」。
 * 車頭朝右（沿用 car/bus 圖示既有的朝向慣例），moves left→right 時不需翻面。
 * 不做內部縮小：地圖上的載具只有 40px，車頭／車窗／殘影線這些細節再乘 0.7
 * 就會糊成一個看不出形狀的深色小點（實測過）。bus 與 walk 造型單純才禁得起縮小。
 */
export function trainIcon(s) {
  const size = s;
  return wide(size,
    `<defs>
      <linearGradient id="trainBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="58%" stop-color="#f4f5f7"/>
        <stop offset="100%" stop-color="#d9dce2"/>
      </linearGradient>
    </defs>
    <line x1="0" y1="8" x2="5.5" y2="7.4" stroke="#f0a02a" stroke-width="1.5" stroke-linecap="round" opacity=".9"/>
    <line x1=".5" y1="11.5" x2="6" y2="11" stroke="#f5b451" stroke-width="1.3" stroke-linecap="round" opacity=".75"/>
    <line x1="1.5" y1="15" x2="6.5" y2="14.6" stroke="#f8c778" stroke-width="1.1" stroke-linecap="round" opacity=".6"/>
    <path d="M7 4.5 h20 c7 0 12.5 2.5 15.5 6.2 c.6 .8 .6 1.6 0 2.4 c-.8 1 -2 1.4 -3.5 1.4 H7 c-1.4 0 -2.2 -.8 -2.2 -2 V6.5 c0 -1.2 .8 -2 2.2 -2 z"
      fill="url(#trainBody)" stroke="#b9bec7" stroke-width=".7" stroke-linejoin="round"/>
    <rect x="7.5" y="6.6" width="18" height="4.4" rx="1.2" fill="#2c3145"/>
    <path d="M27.5 6.6 h1.8 c4.2 .6 7.6 2.4 10 4.4 h-11.8 z" fill="#2c3145"/>
    <ellipse cx="36.5" cy="12.8" rx="2" ry="1.2" fill="#f5f6f8" opacity=".9"/>
    <rect x="5.5" y="14.6" width="35" height="1.6" rx=".8" fill="#f0a02a" opacity=".9"/>
    <g>
      <circle cx="13" cy="18.2" r="3.1" fill="#262b33"/>
      <circle cx="13" cy="18.2" r="1.7" fill="#6f7681"/>
      <rect x="11.4" y="17.7" width="3.2" height=".9" rx=".45" fill="#262b33"/>
      <rect x="11.4" y="17.7" width="3.2" height=".9" rx=".45" fill="#262b33" transform="rotate(60 13 18.2)"/>
      <rect x="11.4" y="17.7" width="3.2" height=".9" rx=".45" fill="#262b33" transform="rotate(120 13 18.2)"/>
      <circle cx="13" cy="18.2" r=".7" fill="#e9ebee"/>
      <animateTransform attributeName="transform" type="rotate" from="0 13 18.2" to="360 13 18.2" dur=".45s" repeatCount="indefinite"/>
    </g>
    <g>
      <circle cx="27" cy="18.2" r="3.1" fill="#262b33"/>
      <circle cx="27" cy="18.2" r="1.7" fill="#6f7681"/>
      <rect x="25.4" y="17.7" width="3.2" height=".9" rx=".45" fill="#262b33"/>
      <rect x="25.4" y="17.7" width="3.2" height=".9" rx=".45" fill="#262b33" transform="rotate(60 27 18.2)"/>
      <rect x="25.4" y="17.7" width="3.2" height=".9" rx=".45" fill="#262b33" transform="rotate(120 27 18.2)"/>
      <circle cx="27" cy="18.2" r=".7" fill="#e9ebee"/>
      <animateTransform attributeName="transform" type="rotate" from="0 27 18.2" to="360 27 18.2" dur=".45s" repeatCount="indefinite"/>
    </g>`);
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
