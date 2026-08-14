import { fetchAllTabs } from './sheets.js';
import { buildItinerary } from './itinerary.js';
import { makeResolver } from './places.js';
import { makeGeocoder } from './geocode.js';
import { createMap, DAY_COLORS } from './map.js';
import { renderTimeline } from './timeline.js';
import { renderCards, startAutoplay } from './cards.js';
import { computeStats } from './overview.js';
import { buildCities } from './cities.js';
import { findDateAnomalies } from './dates.js';
import { formatCountdown } from './countdown.js';
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

  document.getElementById('cd').textContent = formatCountdown(TRIP_START);
  document.getElementById('herodates').innerHTML =
    `${TRIP_START.replace(/-/g, '.')} — ${TRIP_END.replace(/-/g, '.')}`;
  const heroImg = document.getElementById('heroimg');
  const firstPhoto = days.flatMap(d => d.spots).map(s => resolve(s.name)?.photo).find(Boolean);
  if (firstPhoto) heroImg.src = firstPhoto;

  const navLinks = [...document.querySelectorAll('#navlinks a')];
  const sections = navLinks.map(a => document.querySelector(a.getAttribute('href')));
  const spy = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const idx = sections.indexOf(e.target);
      navLinks.forEach((a, i) => a.classList.toggle('on', i === idx));
    }
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => s && spy.observe(s));

  const stats = computeStats({ days, resolve, tripStart: TRIP_START, tripEnd: TRIP_END });
  document.getElementById('statband').innerHTML = `
    <div class="stats">
      <div class="stat"><div class="v">${stats.plannedDays}<small> / ${stats.totalDaySpan} 天</small></div><div class="k">已規劃天數</div></div>
      <div class="stat"><div class="v">${stats.cityCount}<small>座</small></div><div class="k">停留城市</div></div>
      <div class="stat"><div class="v">${stats.spotCount}<small>個</small></div><div class="k">造訪地點</div></div>
      <div class="stat"><div class="v">約 ${Math.round(stats.totalKm)}<small>km</small></div><div class="k">總移動距離</div></div>
    </div>
    <div class="daykey">${days.map((d, i) =>
      `<b><i style="background:${DAY_COLORS[i % DAY_COLORS.length]}"></i>${d.date.iso.slice(5).replace('-', '/')}　${d.city}</b>`
    ).join('')}</div>`;

  const CITY_COPY = {
    '旭川': { en: 'Asahikawa',
      d: '行程的最北點。從新千歲搭特急北上，隔天一早直奔冬季限定的企鵝散步。' },
    '小樽': { en: 'Otaru',
      d: '只待一個晚上加一個早上。傍晚抵達，隔天在市場吃完海鮮丼就上車南下。' },
    '洞爺': { en: 'Toya',
      d: '唯一的溫泉夜。湖畔泡完湯，隔天早上取車，這趟唯一的自駕日從這裡開始。' },
    '函館': { en: 'Hakodate',
      d: '待最久的城市。夜景、元町坡道、五稜郭、朝市，還有吃不完的東西。' },
    '札幌': { en: 'Sapporo',
      d: '前面幾天都只是在這裡轉車，最後才真正走進市區，然後跨年。' },
  };
  const cities = buildCities(days);
  document.getElementById('herocities').textContent = cities.map(c => c.name).join('　');
  document.getElementById('citiesgrid').innerHTML = cities.map(c => {
    const copy = CITY_COPY[c.name] || { en: '', d: '' };
    const photo = c.spotNames.map(n => resolve(n)?.photo).find(Boolean);
    const dayLabel = c.dayIndices.length
      ? `Day ${c.dayIndices[0] + 1}${c.dayIndices.length > 1 ? '–' + (c.dayIndices.at(-1) + 1) : ''}`
      : '';
    return `<article class="city">
      <div class="ph">${photo ? `<img src="${photo}" alt="${c.name}">` : ''}<span class="idx">${dayLabel}</span></div>
      <div class="bd">
        <h3>${c.name}<span>${copy.en}</span></h3>
        <p>${copy.d}</p>
        <div class="spots">${[...new Set(c.spotNames)].map(n => `<b>${n}</b>`).join('')}</div>
      </div>
    </article>`;
  }).join('');

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
