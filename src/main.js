import { fetchTabsIndividually } from './sheets.js';
import { buildItinerary } from './itinerary.js';
import { makeResolver } from './places.js';
import { makeGeocoder } from './geocode.js';
import { createMap } from './map.js';
import { renderTimeline } from './timeline.js';
import { startAutoplay } from './cards.js';
import { computeStats } from './overview.js';
import { buildCities } from './cities.js';
import { buildSights } from './sights.js';
import { parseDining } from './dining.js';
import { buildLodging } from './lodging.js';
import { addLodgingBookends } from './bookend.js';
import { addOpeningFlight } from './opening.js';
import { addRopewayBaseStations } from './ropeway.js';
import { summarizeBudget } from './budget.js';
import { RATE } from '../config.js';
import { summarizePrep } from './prep.js';
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

/**
 * 「全部明細」彈出視窗。面板裡只放得下前幾項，其餘從這裡看。
 * 開啟時鎖住背景捲動——否則在視窗內捲到底會接著捲動整個頁面，
 * 關掉之後會發現自己跑到別的區塊去了。
 */
const costModal = {
  el: document.getElementById('costmodal'),
  lastFocus: null,
  open() {
    this.lastFocus = document.activeElement;
    this.el.hidden = false;
    document.body.style.overflow = 'hidden';
    this.el.querySelector('.mclose').focus();
  },
  close() {
    this.el.hidden = true;
    document.body.style.overflow = '';
    this.lastFocus?.focus();
  },
};

// 點背景或關閉鈕都收起來；點在視窗內容上不會誤觸（e.target 是 .mbox 的子孫）
costModal.el.addEventListener('click', e => {
  if (e.target === costModal.el || e.target.closest('.mclose')) costModal.close();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !costModal.el.hidden) costModal.close();
});

async function start() {
  // 六個頁籤同時開始抓，但各自獨立等待。地圖需要 itinerary（行程）
  // 加上 lodging／todo（推導每天頭尾的住宿點），三者是並行發出的，
  // 等的是最大值而非總和，仍遠優於原本等齊六個（實測合計約 6.5 秒）。
  const pending = fetchTabsIndividually();
  const [itineraryTab, lodgingTab, todoTab, placesRes] = await Promise.all([
    pending.itinerary,
    pending.lodging,
    pending.todo,
    fetch('places.json').then(r => r.json()).catch(() => ({})),
  ]);

  const messages = [];

  if (!itineraryTab.ok) {
    document.getElementById('map').innerHTML =
      `<div style="padding:40px">無法載入行程資料（${itineraryTab.error}）。`
      + `可能原因：試算表未公開，或裝置離線。</div>`;
    return;
  }

  // 每天頭尾補上住宿：早上從昨晚住的地方出發、晚上回到當晚住的地方。
  // 行程頁籤沒記錄這兩段，但那是實際會發生的移動，由住宿頁籤推導補上。
  const stays = buildLodging({
    lodgingRows: lodgingTab.ok ? lodgingTab.rows : [],
    todoRows: todoTab.ok ? todoTab.rows : [],
    tripStart: TRIP_START, tripEnd: TRIP_END,
  });
  // 行程頁籤只記了要去的地方，實際會發生的移動要補回來：
  const days = [
    addRopewayBaseStations,                    // 纜車段先步行到山麓站再上山
    d => addLodgingBookends(d, stays),         // 每天從住宿出發、回到住宿
    addOpeningFlight,                          // Day 1 開頭的桃園→新千歲
  ].reduce((d, step) => step(d), buildItinerary(itineraryTab.rows));
  const baseResolve = makeResolver(placesRes);

  const anomalies = findDateAnomalies(days.map(d => d.date), TRIP_START);
  for (const a of anomalies) messages.push(`日期異常：${a.iso} ${a.reason}`);

  const unknownNames = [...new Set(
    days.flatMap(d => d.spots).filter(s => s.name && !baseResolve(s.name)).map(s => s.name)
  )];

  // 地理編碼是序列查詢、每次至少間隔 1 秒（Nominatim 使用政策），
  // 讓它擋住地圖渲染會白等好幾秒。改為背景進行，查到再補畫。
  const geocoded = new Map();
  const resolve = augmentResolver(baseResolve, geocoded);

  showNotice(messages);

  document.getElementById('herodates').innerHTML =
    `${TRIP_START.replace(/-/g, '.')} — ${TRIP_END.replace(/-/g, '.')}`;

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
    </div>`;

  // buildCities 仍用於封面的城市列與總覽的城市數統計（「五座城市」區塊已移除）
  document.getElementById('herocities').textContent =
    buildCities(days).map(c => c.name).join('　');

  const nt = n => 'NT$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const md = iso => iso.slice(5).replace('-', '/');

  /**
   * 三個區塊共用的牌卡。kind 只決定左上角徽章的顏色。
   *
   * onerror 把載不到的圖片直接移除，露出 .ph 的底色——地名簿可以先寫上
   * 檔名、照片之後再補進 photos/，中間這段期間不會卡著一排破圖圖示。
   */
  const pcard = ({ kind, tag, photo, city, name, dt, memo, foot }) => `
    <article class="pcard ${kind}">
      <div class="ph">${photo
        ? `<img src="${photo}" alt="${name}" loading="lazy" onerror="this.remove()">` : ''}
        ${tag ? `<span class="tag">${tag}</span>` : ''}</div>
      <div class="bd">
        ${city ? `<div class="ct">${city}</div>` : ''}
        <h3>${name}</h3>
        ${dt ? `<div class="dt">${dt}</div>` : ''}
        ${memo ? `<div class="memo">${memo}</div>` : ''}
        ${foot ? `<div class="ft">${foot}</div>` : ''}
      </div>
    </article>`;

  // stays 已在上方為了補每天頭尾而算好，直接沿用
  document.getElementById('staysgrid').innerHTML = stays.map(s => pcard({
    kind: 'stay',
    tag: s.nights != null ? `${s.nights} 晚` : '',
    photo: resolve(s.name)?.photo,
    city: s.city,
    name: s.name,
    dt: s.checkinIso && s.checkoutIso
      ? `${md(s.checkinIso)} — ${md(s.checkoutIso)}` : '日期待補',
    memo: s.memo,
    foot: `<div class="price${s.ntd ? '' : ' todo'}">${s.ntd ? nt(s.ntd) : '費用待補'}</div>
      <span class="badge ${s.booked ? 'ok' : 'no'}">${s.booked ? '已訂房' : '未訂房'}</span>`,
  })).join('');

  // 以下每個內容區塊各自等自己需要的頁籤，誰先到誰先渲染，互不阻塞。
  pending.dining.then(diningTab => {
    const dishes = parseDining(diningTab.ok ? diningTab.rows : []).filter(d => d.name);

    document.getElementById('eatsgrid').innerHTML = dishes.map(d => {
      const place = resolve(d.name);
      // 拉麵流派不再獨立成一個區塊，改成卡片上的一枚徽章，
      // 資訊留著但不打斷這一區依日期排下來的節奏。
      const flavor = place?.ramen ? `<span class="badge flavor">${place.ramen}拉麵</span>` : '';
      const rz = d.reserved === null ? ''
        : `<span class="badge ${d.reserved ? 'ok' : 'no'}">${d.reserved ? '已訂位' : '未訂位'}</span>`;
      return pcard({
        kind: 'eat',
        tag: d.meal,
        photo: place?.photo,
        city: d.city,
        name: d.name,
        dt: md(d.date),
        memo: d.note,
        foot: flavor || rz ? `${flavor}${rz}` : '',
      });
    }).join('');

    // 逛哪裡要扣掉餐廳，所以得等用餐頁籤到齊才能算
    const sights = buildSights({ days, diningNames: dishes.map(d => d.name) });
    document.getElementById('seesgrid').innerHTML = sights.map(s => pcard({
      kind: 'see',
      tag: `Day ${s.dayIndex + 1}`,
      photo: resolve(s.name)?.photo,
      city: s.city,
      name: s.name,
      dt: `${md(s.date)}${s.time ? `　${s.time}` : ''}`,
      memo: resolve(s.name)?.desc || s.activity,
    })).join('');
  });

  pending.budget.then(budgetTab => {
    const CAT_COLOR = { 交通: '#0e7ad4', 住宿: '#7a5cc4', 餐飲: '#f4622e', 生活: '#12a97a' };
    const budget = summarizeBudget(budgetTab.ok ? budgetTab.rows : [], RATE);
    const jp = n => '¥' + n.toLocaleString('en-US');

    const citem = it => `
      <div class="citem${it.filled ? '' : ' blank'}">
        <div class="nm">${it.name}<i>${it.category} · ${it.subcategory}</i></div>
        <div class="amt">${it.filled ? nt(Math.round(it.twd)) + (it.jpy ? `<em>${jp(it.jpy)}</em>` : '') : '待補'}</div>
      </div>`;

    document.getElementById('costblock').innerHTML = `
      <div class="rate">匯率　<b>¥1 = NT$${RATE}</b></div>
      <div class="costtop">
        <div class="stat"><div class="v">${nt(Math.round(budget.totalTwd))}</div><div class="k">已登錄總額（台幣）</div></div>
        <div class="stat"><div class="v">${budget.filledCount}<small> / ${budget.totalCount} 項</small></div><div class="k">已填金額項數</div></div>
      </div>
      <div class="costgrid">
        <div class="panel cats"><h3>分類佔比</h3>
          ${budget.categoryTotals.sort((a, b) => (b.twd ?? 0) - (a.twd ?? 0)).map(c => `
            <div class="cat">
              <div class="top"><b>${c.category}</b><span>${c.twd != null ? nt(Math.round(c.twd)) : '待補'}</span></div>
              <div class="bar"><i style="width:${budget.totalTwd && c.twd ? (c.twd / budget.totalTwd * 100) : 0}%;
                background:${CAT_COLOR[c.category] || '#a89c8c'}"></i></div>
            </div>`).join('')}
        </div>
        <div class="panel detail"><h3>明細</h3>
          <div class="dlist">${budget.items.map(citem).join('')}</div>
          <button type="button" class="more">全部展開　${budget.totalCount} 項</button>
        </div>
      </div>`;

    document.getElementById('costmodalbody').innerHTML = budget.items.map(citem).join('');
    document.getElementById('costmodalcount').textContent = `　${budget.totalCount} 項`;
    document.querySelector('#costblock .more').addEventListener('click', () => costModal.open());

    // 明細裁到與分類佔比同高。左欄高度取決於分類數（今天是四類，之後可能變），
    // 所以量出來設定而不是寫死；ResizeObserver 也讓字體載入、視窗縮放後跟著調整。
    const cats = document.querySelector('#costblock .panel.cats');
    const detail = document.querySelector('#costblock .panel.detail');
    const syncHeight = () => {
      // 窄畫面時 costgrid 收成單欄，左右不再並排，裁切失去意義
      detail.style.height = window.matchMedia('(min-width:1081px)').matches
        ? `${cats.offsetHeight}px` : '';
    };
    new ResizeObserver(syncHeight).observe(cats);
    window.addEventListener('resize', syncHeight);
    syncHeight();
  });

  pending.todo.then(todoTab => {
    const prep = summarizePrep(todoTab.ok ? todoTab.rows : []);
    document.getElementById('prepblock').innerHTML = `
      <div class="prep">
        <div class="ring"><div class="pct">${prep.pct}%</div>
          <div class="sub">${prep.doneCount} / ${prep.totalCount} 項完成</div></div>
        <div class="tasks">${prep.items.map(it => `
          <div class="task ${it.done ? 'done' : 'open'}">
            <span class="mk">${it.done ? '✓' : ''}</span>
            <span class="tx">${it.name}<i>${it.category}</i></span>
          </div>`).join('')}
        </div>
      </div>`;
  });

  const mapApi = createMap(document.getElementById('map'), { days, resolve });
  let autoplay = null;
  let userPicked = false;

  const timeline = renderTimeline(document.getElementById('daylist'), {
    days, tripEnd: TRIP_END,
    onSelect: index => {
      if (index === null) {
        mapApi.showAll();
        return Promise.resolve();
      }
      mapApi.showDay(index);
      return mapApi.playDay(index);
    },
  });

  document.getElementById('daylist').addEventListener('click', () => {
    if (userPicked) return;
    userPicked = true;
    autoplay?.stop();
  }, { capture: true });

  // 直接從 Day 1 開始（startAutoplay 內部會 select(0)），不再以全程直線圖開場
  autoplay = startAutoplay({ days, timeline });

  window.__trip = { days, resolve, pending, unknownNames, geocoded, mapApi, timeline, autoplay };

  // 地理編碼在背景跑：每筆至少間隔 1 秒（Nominatim 使用政策），放在渲染流程裡
  // 會讓地圖白等好幾秒。查到的座標寫進 geocoded，供之後切換日期時取用——
  // 不主動重畫，那會打斷使用者當下正在看的那一天。
  if (unknownNames.length) {
    const geocoder = makeGeocoder();
    (async () => {
      for (const name of unknownNames) {
        const coords = await geocoder.lookup(name);
        if (coords) geocoded.set(name, coords);
      }
      const stillUnknown = unknownNames.filter(n => !geocoded.has(n));
      if (stillUnknown.length) {
        showNotice([...messages, `以下地點尚無座標，未顯示於地圖：${stillUnknown.join('、')}`]);
      }
    })();
  }
}

start();
