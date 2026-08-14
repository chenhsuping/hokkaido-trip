const INK = '#2b2721';
function wide(s, inner) {
  return `<svg width="${s * 1.55}" height="${s}" viewBox="0 0 44 24" fill="none">${inner}</svg>`;
}

export function trainIcon(s) {
  const D = '#22414d', T = '#6ecfc8';
  return wide(s,
    `<circle cx="8.6" cy="17.6" r="1.7" fill="${D}"/><circle cx="12" cy="17.6" r="1.7" fill="${D}"/>
    <circle cx="15.4" cy="17.6" r="1.7" fill="${D}"/><circle cx="27.4" cy="17.6" r="1.7" fill="${D}"/>
    <circle cx="30.8" cy="17.6" r="1.7" fill="${D}"/><circle cx="34.2" cy="17.6" r="1.7" fill="${D}"/>
    <path d="M3.2 9.2c0-1.5 1.1-2.6 2.6-2.6h20.6c5.2 0 9.9 1.4 14 4.4 1.4 1 2 1.9 2 2.9 0 1.5-1.2 2.5-3 2.5H5.6c-1.5 0-2.4-1-2.4-2.4z" fill="#fff" stroke="${D}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M6.6 8.8h21.6v4.6H6.6z" fill="${D}"/>
    <rect x="13.2" y="9.6" width="2.6" height="3" rx=".7" fill="${T}"/>
    <rect x="16.8" y="9.6" width="2.6" height="3" rx=".7" fill="${T}"/>
    <rect x="20.4" y="9.6" width="2.6" height="3" rx=".7" fill="${T}"/>
    <rect x="24" y="9.6" width="2.6" height="3" rx=".7" fill="${T}"/>
    <rect x="8.2" y="8.4" width="3" height="5.4" rx=".8" fill="${T}"/>
    <rect x="28.6" y="8.4" width="3" height="5.4" rx=".8" fill="${T}"/>
    <path d="M33.4 9.6c2.4.8 4.4 1.9 6.2 3.2v.8h-6.2z" fill="${T}" stroke="${D}" stroke-width="1" stroke-linejoin="round"/>
    <path d="M4.4 14.2h36.4c.5.6.8 1.1.8 1.6 0 .3-.1.5-.2.8H4.6c-.2-.4-.2-.8-.2-1.2z" fill="${T}"/>
    <path d="M3.2 14.2h38.6" stroke="${D}" stroke-width="1.1"/>`);
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
