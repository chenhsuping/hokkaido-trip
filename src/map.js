import { latLng } from './places.js';
import { MODE_COLORS } from './transport.js';
import { ICON } from './icons.js';
import { smoothPath } from './curve.js';
import { computeHeading } from './heading.js';
import { makeRoadFetcher } from './roads.js';

/**
 * 「全程」模式的每日色票。單日模式改用該段 leg 的交通色。
 * 以固定調色盤而非取當日第一段的交通色——後者會讓多天撞色
 * （例如多天都以步行起頭，全部變成同一個黃色）。
 */
export const DAY_COLORS = [
  '#0e7ad4', '#12a97a', '#7a5cc4', '#f4622e',
  '#f0ad2a', '#c2557a', '#0e7ad4', '#12a97a',
  '#7a5cc4', '#f4622e',
];

export function createMap(el, { days, resolve: resolvePlace }) {
  const map = L.map(el, { zoomControl: false, scrollWheelZoom: true, zoomSnap: 0.25 });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const layers = {
    route: L.layerGroup().addTo(map),
    pins: L.layerGroup().addTo(map),
    veh: L.layerGroup().addTo(map),
    card: L.layerGroup().addTo(map),
  };

  const roadFetcher = makeRoadFetcher();
  let playToken = 0;

  function stopPlayback() {
    playToken += 1;
  }

  /** place → 真正的 L.LatLng 實體（非陣列）——呼叫端需要 .distanceTo()／.lat／.lng。 */
  function toLatLng(place) {
    return L.latLng(place.lat, place.lng);
  }

  /** 取得某段 leg 的兩端座標；任一端無座標則回傳 null。 */
  function legCoords(day, leg) {
    const a = resolvePlace(day.spots[leg.fromIndex].name);
    const b = resolvePlace(day.spots[leg.toIndex].name);
    return a && b ? [latLng(a), latLng(b)] : null;
  }

  function clear() {
    layers.route.clearLayers();
    layers.pins.clearLayers();
    layers.veh.clearLayers();
    layers.card.clearLayers();
  }

  function showAll() {
    stopPlayback();
    clear();
    const myToken = playToken;
    const bounds = [];
    for (const [i, day] of days.entries()) {
      const color = DAY_COLORS[i % DAY_COLORS.length];
      for (const leg of day.legs) {
        const pts = legCoords(day, leg);
        if (!pts) continue;
        const c = MODE_COLORS[leg.mode];
        if (!c) continue;
        const line = L.polyline(pts, {
          color, weight: 3.2, opacity: 0.85, lineCap: 'round',
          dashArray: leg.mode === 'drive' ? '8 8' : null,
        }).addTo(layers.route);
        bounds.push(...pts);

        const from = resolvePlace(day.spots[leg.fromIndex].name);
        const to = resolvePlace(day.spots[leg.toIndex].name);
        if (from && to) {
          roadFetcher.fetchRoad(leg.mode, from, to).then(road => {
            if (myToken !== playToken) return;
            // JR 沒有道路路徑（fetchRoad 回傳 null），退回與載具相同的平滑曲線，
            // 兩者才會重合；直接留兩點直線的話圖示會偏離畫出來的線。
            const path = road || smoothPath([from, to]);
            line.setLatLngs(path.map(p => L.latLng(p.lat, p.lng)));
          });
        }
      }
    }
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [46, 46] });
  }

  function showDay(index) {
    stopPlayback();
    clear();
    const day = days[index];
    const myToken = playToken;
    const bounds = [];
    for (const leg of day.legs) {
      const pts = legCoords(day, leg);
      if (!pts) continue;
      const c = MODE_COLORS[leg.mode];
      if (!c) continue;
      const line = L.polyline(pts, {
        color: c, weight: 3, opacity: 0.95, lineCap: 'round',
        dashArray: leg.mode === 'drive' ? '7 7' : null,
      }).addTo(layers.route);
      bounds.push(...pts);

      // 先用兩點直線立刻畫出來（不必等網路），道路資料回來後就地升級成實際路線。
      // 載具走的也是同一份資料，兩者才會完全重合——否則圖示會偏離畫出來的線。
      const from = resolvePlace(day.spots[leg.fromIndex].name);
      const to = resolvePlace(day.spots[leg.toIndex].name);
      if (from && to) {
        roadFetcher.fetchRoad(leg.mode, from, to).then(road => {
          if (!road || myToken !== playToken) return;
          line.setLatLngs(road.map(p => L.latLng(p.lat, p.lng)));
        });
      }
    }
    for (const spot of day.spots) {
      const p = resolvePlace(spot.name);
      if (!p) continue;
      L.circleMarker(latLng(p), {
        radius: 6, color: '#fff', weight: 2,
        fillColor: spot.stay ? '#7a5cc4' : '#0e7ad4', fillOpacity: 1,
      }).addTo(layers.pins);
      bounds.push(latLng(p));
    }
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 12 });
  }

  /**
   * 播放單日動畫：載具依序沿每段路線移動、鏡頭跟隨、抵達景點彈出圖卡並回呼 onArrive。
   * 回傳的 Promise 在動畫自然播完時 resolve；若播放中途被 stopPlayback() 中止
   * （切換到其他日期／全程），Promise 永遠不會 resolve——呼叫端（startAutoplay）
   * 一律先檢查 stopped 旗標，所以被棄置的 Promise 不會造成錯誤行為。
   */
  function playDay(index, { onArrive } = {}) {
    const myToken = ++playToken;
    const day = days[index];
    const vehIcon = mode => L.divIcon({
      className: '', iconSize: [0, 0],
      html: `<div class="veh"><div class="core">${ICON[mode](40)}</div></div>`,
    });

    return new Promise(done => {
      const legsWithCoords = day.legs
        .map(leg => {
          const from = resolvePlace(day.spots[leg.fromIndex].name);
          const to = resolvePlace(day.spots[leg.toIndex].name);
          return from && to ? { leg, from, to } : null;
        })
        .filter(Boolean);

      if (!legsWithCoords.length) { done(); return; }

      let headFlip = 1;
      const vehMarker = L.marker(toLatLng(legsWithCoords[0].from), {
        icon: vehIcon(legsWithCoords[0].leg.mode), interactive: false, zIndexOffset: -100,
      }).addTo(layers.veh);

      function applyHeadingToMarker(dx, dy) {
        const elCore = vehMarker.getElement()?.querySelector('.core');
        if (!elCore) return;
        const { angle, flip } = computeHeading(dx, dy, headFlip);
        headFlip = flip;
        elCore.style.transform = `rotate(${angle.toFixed(1)}deg) scaleX(${flip})`;
      }

      function showArrivalCard(spotIndex) {
        layers.card.clearLayers();
        const spot = day.spots[spotIndex];
        const place = resolvePlace(spot.name);
        const ll = toLatLng(place);
        const screenX = map.latLngToContainerPoint(ll).x;
        const flip = screenX > map.getSize().x * 0.55;
        const photo = place.photo ? `<div class="ph" style="background-image:url('${place.photo}')"></div>` : '';
        const html = `<div class="spotpop${flip ? ' flip' : ''}">${photo}
          <div class="tx"><b>${spot.name}</b><span>${spot.time}　${spot.activity}</span></div></div>`;
        L.marker(ll, { icon: L.divIcon({ className: '', html, iconSize: [0, 0] }), interactive: false, zIndexOffset: 2000 })
          .addTo(layers.card);
        onArrive?.(spotIndex);
      }

      async function step(k) {
        if (myToken !== playToken) return;
        if (k >= legsWithCoords.length) { done(); return; }

        const { leg, from, to } = legsWithCoords[k];
        vehMarker.setIcon(vehIcon(leg.mode));
        layers.card.clearLayers();

        const fromLL = toLatLng(from), toLL = toLatLng(to);
        const fromPt = map.latLngToContainerPoint(fromLL), toPt = map.latLngToContainerPoint(toLL);
        applyHeadingToMarker(toPt.x - fromPt.x, toPt.y - fromPt.y);

        const legDistM = fromLL.distanceTo(toLL);
        if (legDistM < 30) { await step(k + 1); return; }

        const roadLine = await roadFetcher.fetchRoad(leg.mode, from, to);
        if (myToken !== playToken) return;
        const points = (roadLine || smoothPath([from, to])).map(p => L.latLng(p.lat, p.lng));

        // 轉車站只是路過換車，不是真的景點——放大過去會讓鏡頭在同一個車站
        // 前後拉近兩次（進站、出站），節奏很突兀。維持當下視野直接開過去。
        const arrivingAtTransfer = day.spots[leg.toIndex]?.transfer;

        if (arrivingAtTransfer) {
          // 不調整視野
        } else if (legDistM < 2600) {
          const mid = L.latLng((fromLL.lat + toLL.lat) / 2, (fromLL.lng + toLL.lng) / 2);
          map.flyTo(mid, legDistM < 900 ? 16 : 15, { duration: 0.9 });
        } else if (legDistM < 16000) {
          map.flyToBounds(L.latLngBounds([fromLL, toLL]), { padding: [90, 90], maxZoom: 13.5, duration: 1 });
        } else if (map.getZoom() > 12.2) {
          map.flyToBounds(L.latLngBounds(day.spots.map(s => {
            const p = resolvePlace(s.name); return p ? toLatLng(p) : null;
          }).filter(Boolean)), { padding: [70, 70], maxZoom: 12, duration: 1.1 });
        }

        await new Promise(r => setTimeout(r, 900));
        if (myToken !== playToken) return;

        // 放慢：原本 legDist/16 上限 9 秒，改為 /9 上限 16 秒，讓長途路段看得出移動過程。
        const durationMs = Math.max(5200, Math.min(16000, legDistM / 9));
        const startedAt = performance.now();
        let lastPanAt = startedAt;
        // 震動要掛在內層 .veh，不是 getElement() 回傳的外層 .leaflet-marker-icon——
        // 那層的 transform 被 Leaflet 用來定位，每次 setLatLng() 都會覆寫掉。
        const vehEl = vehMarker.getElement()?.querySelector('.veh');

        await new Promise(r => {
          function tick(now) {
            if (myToken !== playToken) { r(); return; }
            const t = Math.min(1, (now - startedAt) / durationMs);
            const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const idx = Math.min(points.length - 1, Math.round(eased * (points.length - 1)));
            const here = points[idx];
            vehMarker.setLatLng(here);

            // 行駛震動：疊在外層 .veh 上，不動內層 .core 的 rotate/scaleX
            // （那是 applyHeadingToMarker 在管方向的，覆寫會讓車頭轉錯邊）。
            // 兩個不同頻率的正弦相加，避免規律到看起來像機械擺動。
            if (vehEl) {
              const shake = Math.sin(now / 42) * 0.7 + Math.sin(now / 27) * 0.35;
              const bob = Math.sin(now / 95) * 0.5;
              vehEl.style.transform = `translate(${bob.toFixed(2)}px, ${shake.toFixed(2)}px)`;
            }

            if (now - lastPanAt > 260) {
              lastPanAt = now;
              const sz = map.getSize();
              const p = map.latLngToContainerPoint(here);
              const margin = { x: sz.x * 0.26, y: sz.y * 0.26 };
              if (p.x < margin.x || p.x > sz.x - margin.x || p.y < margin.y || p.y > sz.y - margin.y) {
                map.panTo(here, { animate: true, duration: 0.7, easeLinearity: 0.35 });
              }
            }
            if (t < 1) requestAnimationFrame(tick); else r();
          }
          requestAnimationFrame(tick);
        });
        if (myToken !== playToken) return;
        if (vehEl) vehEl.style.transform = '';   // 停穩後歸零，否則會停在震動的偏移位置

        const arrivedSpotIndex = leg.toIndex;

        // 轉車站只是換車，不拉近視野、不彈景點圖卡、短暫停頓就接續下一段。
        if (arrivingAtTransfer) {
          await new Promise(r => setTimeout(r, 700));
          await step(k + 1);
          return;
        }

        map.flyTo(toLL, Math.max(map.getZoom(), 14.5), { duration: 1 });
        await new Promise(r => setTimeout(r, 1050));
        if (myToken !== playToken) return;
        showArrivalCard(arrivedSpotIndex);
        await new Promise(r => setTimeout(r, 5400));
        await step(k + 1);
      }

      step(0);
    });
  }

  return { showAll, showDay, playDay, stopPlayback };
}
