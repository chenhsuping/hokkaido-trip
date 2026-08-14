import { fetchAllTabs } from './sheets.js';
import { buildItinerary } from './itinerary.js';
import { makeResolver } from './places.js';
import { makeGeocoder } from './geocode.js';
import { createMap } from './map.js';
import { renderTimeline } from './timeline.js';
import { renderCards, startAutoplay } from './cards.js';
import { findDateAnomalies } from './dates.js';
import { TRIP_START, TRIP_END } from '../config.js';

const notice = document.getElementById('notice');

function showNotice(lines) {
  if (!lines.length) return;
  notice.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
  notice.classList.add('on');
}

/**
 * 疊加地理編碼結果的解析器：先查地名簿，查不到才查地理編碼快取。
 * 讓 Task 8 的 geocoder 實際被用來補上 places.json 未涵蓋的地點，
 * 而不只是被自己的單元測試呼叫。
 */
function augmentResolver(baseResolve, geocoded) {
  return name => baseResolve(name) || geocoded.get(name) || null;
}

async function start() {
  const [tabs, placesRes] = await Promise.all([
    fetchAllTabs(),
    fetch('places.json').then(r => r.json()).catch(() => ({})),
  ]);

  const messages = [];

  if (!tabs.itinerary.ok) {
    document.getElementById('map').innerHTML =
      `<div style="padding:40px">無法載入行程資料（${tabs.itinerary.error}）。`
      + `可能原因：試算表未公開，或裝置離線。</div>`;
    return;
  }

  const days = buildItinerary(tabs.itinerary.rows);
  const baseResolve = makeResolver(placesRes);

  const anomalies = findDateAnomalies(days.map(d => d.date), TRIP_START);
  for (const a of anomalies) messages.push(`日期異常：${a.iso} ${a.reason}`);

  const unknownNames = [...new Set(
    days.flatMap(d => d.spots).filter(s => s.name && !baseResolve(s.name)).map(s => s.name)
  )];

  const geocoded = new Map();
  if (unknownNames.length) {
    const geocoder = makeGeocoder();
    for (const name of unknownNames) {
      const coords = await geocoder.lookup(name);
      if (coords) geocoded.set(name, coords);
    }
  }

  const resolve = augmentResolver(baseResolve, geocoded);
  const stillUnknown = unknownNames.filter(n => !geocoded.has(n));
  if (stillUnknown.length) {
    messages.push(`以下地點尚無座標，未顯示於地圖：${stillUnknown.join('、')}`);
  }

  showNotice(messages);

  const mapApi = createMap(document.getElementById('map'), { days, resolve });
  const cardsEl = document.getElementById('cards');
  let autoplay = null;
  let userPicked = false;

  const timeline = renderTimeline(document.getElementById('daylist'), {
    days, tripEnd: TRIP_END,
    onSelect: index => {
      if (index === null) {
        mapApi.showAll();
        cardsEl.innerHTML = '';
      } else {
        mapApi.showDay(index);
        renderCards(cardsEl, { day: days[index], resolve });
      }
    },
  });

  document.getElementById('daylist').addEventListener('click', () => {
    if (userPicked) return;
    userPicked = true;
    autoplay?.stop();
  }, { capture: true });

  timeline.select(null);
  autoplay = startAutoplay({ days, timeline });

  window.__trip = { days, resolve, tabs, unknownNames, geocoded, mapApi, timeline, autoplay };
}

start();
