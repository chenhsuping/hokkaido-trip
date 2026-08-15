import { latLng } from './places.js';
import { MODE_COLORS } from './transport.js';
import { ICON } from './icons.js';
import { smoothPath, arcPath } from './curve.js';
import { computeHeading, computeTrackHeading } from './heading.js';
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

  // 兩個獨立的世代編號，不能共用：
  //   playToken   — 播放世代。stopPlayback() 遞增，用來中止進行中的動畫。
  //   renderToken — 顯示世代。切換顯示哪一天時才遞增，用來丟棄舊日期尚未回來的道路資料。
  // 曾經共用一個：showDay() 捕捉當下的 playToken，緊接著 playDay() 又把它 +1，
  // 導致 showDay 的道路資料回來時被自己判定為過期而放棄更新，線就永遠停在直線，
  // 但載具照樣沿著同一份道路資料跑——畫面上線與圖示因此分離。
  let playToken = 0;
  let renderToken = 0;

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
    const myRender = ++renderToken;
    const bounds = [];
    for (const [i, day] of days.entries()) {
      const color = DAY_COLORS[i % DAY_COLORS.length];
      for (const leg of day.legs) {
        if (leg.opening) continue;      // 開場航段只在播放時出現，見下方 showDay 的說明
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
            if (myRender !== renderToken) return;   // 使用者已切到別天，這份資料過期了
            // 路由失敗時退回與載具相同的平滑曲線，兩者才會重合；
            // 直接留兩點直線的話圖示會偏離畫出來的線。
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
    const myRender = ++renderToken;
    const bounds = [];
    // 開場的桃園→新千歲航段不畫進靜態視圖：它會把邊界撐到包含台灣，
    // 北海道當天的行程被壓縮成畫面角落的一小塊。那段只在播放時飛一次。
    for (const leg of day.legs) {
      if (leg.opening) continue;
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
          if (myRender !== renderToken) return;   // 使用者已切到別天，這份資料過期了
          const path = road || smoothPath([from, to]);
          line.setLatLngs(path.map(p => L.latLng(p.lat, p.lng)));
        });
      }
    }
    for (const spot of day.spots) {
      if (spot.opening) continue;
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

      /**
       * 更新車頭朝向。列車與飛機用 computeTrackHeading（不限傾角，機／車頭真的
       * 指向前進方向——飛機是俯視圖，硬把角度壓在 ±20 度會完全看不出航向）；
       * 其餘交通工具沿用 computeHeading 的 ±20 度限制，避免圖示過度傾斜難以辨識。
       */
      function applyHeadingToMarker(dx, dy, mode) {
        const elCore = vehMarker.getElement()?.querySelector('.core');
        if (!elCore) return;
        const fn = (mode === 'jr' || mode === 'flight') ? computeTrackHeading : computeHeading;
        const { angle, flip } = fn(dx, dy, headFlip);
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
        applyHeadingToMarker(toPt.x - fromPt.x, toPt.y - fromPt.y, leg.mode);

        const legDistM = fromLL.distanceTo(toLL);
        if (legDistM < 30) { await step(k + 1); return; }

        const isFlight = leg.mode === 'flight';

        // 飛機沒有路可循，直接走弧線航路；OSRM 對跨海也規劃不出東西。
        const roadLine = isFlight ? null : await roadFetcher.fetchRoad(leg.mode, from, to);
        if (myToken !== playToken) return;
        const points = (isFlight ? arcPath(from, to) : roadLine || smoothPath([from, to]))
          .map(p => L.latLng(p.lat, p.lng));

        // 轉車站只是路過換車，不是真的景點——放大過去會讓鏡頭在同一個車站
        // 前後拉近兩次（進站、出站），節奏很突兀。維持當下視野直接開過去。
        // 但飛機落地後一定要拉回北海道，否則鏡頭會停在看得到台灣的高度。
        const arrivingAtTransfer = day.spots[leg.toIndex]?.transfer && !isFlight;

        // 長途 JR 移動先把鏡頭拉開，讓整段路線都在畫面內——否則會一路貼著
        // 列車跑，只看得到腳下的一小塊地圖，感覺不出跨了多遠。
        const isLongHaul = leg.mode === 'jr' && legDistM >= 16000;

        if (isFlight) {
          // 拉遠到台灣與北海道同時入鏡，這段航程的距離才有感覺
          map.flyToBounds(L.latLngBounds([fromLL, toLL]), { padding: [56, 56], duration: 1.5 });
        } else if (arrivingAtTransfer && !isLongHaul) {
          // 轉車站不調整視野
        } else if (isLongHaul) {
          map.flyToBounds(L.latLngBounds([fromLL, toLL]), {
            padding: [80, 80], maxZoom: 9, duration: 1.2,
          });
        } else if (legDistM < 2600) {
          const mid = L.latLng((fromLL.lat + toLL.lat) / 2, (fromLL.lng + toLL.lng) / 2);
          map.flyTo(mid, legDistM < 900 ? 16 : 15, { duration: 0.9 });
        } else if (legDistM < 16000) {
          map.flyToBounds(L.latLngBounds([fromLL, toLL]), { padding: [90, 90], maxZoom: 13.5, duration: 1 });
        } else if (map.getZoom() > 12.2) {
          // 排除開場的出發機場，否則邊界會被撐到包含台灣
          map.flyToBounds(L.latLngBounds(day.spots.filter(s => !s.opening).map(s => {
            const p = resolvePlace(s.name); return p ? toLatLng(p) : null;
          }).filter(Boolean)), { padding: [70, 70], maxZoom: 12, duration: 1.1 });
        }

        await new Promise(r => setTimeout(r, 900));
        if (myToken !== playToken) return;

        // 放慢：原本 legDist/16 上限 9 秒，改為 /9 上限 16 秒，讓長途路段看得出移動過程。
        // 航段例外：桃園到新千歲近 3000 公里，套同一個公式會直接吃滿 16 秒上限，
        // 但這只是開場的破題畫面，不該佔掉當天四分之一的播放時間。
        const durationMs = isFlight ? 7000 : Math.max(5200, Math.min(16000, legDistM / 9));
        const startedAt = performance.now();
        let lastPanAt = startedAt;
        // 震動要掛在內層 .veh，不是 getElement() 回傳的外層 .leaflet-marker-icon——
        // 那層的 transform 被 Leaflet 用來定位，每次 setLatLng() 都會覆寫掉。
        const vehEl = vehMarker.getElement()?.querySelector('.veh');

        let lastHeadingIdx = -1;

        await new Promise(r => {
          function tick(now) {
            if (myToken !== playToken) { r(); return; }
            const t = Math.min(1, (now - startedAt) / durationMs);
            const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const idx = Math.min(points.length - 1, Math.round(eased * (points.length - 1)));
            const here = points[idx];
            vehMarker.setLatLng(here);

            // 沿途即時更新車頭方向。原本只在每段開始時算一次整段的起訖方向，
            // 但路線是彎的，行進方向沿途一直在變，車頭因此貼不上實際走向。
            // 取前方一小段的位移當作切線方向，位置沒變就不重算。
            if (idx !== lastHeadingIdx) {
              lastHeadingIdx = idx;
              const ahead = points[Math.min(points.length - 1, idx + 2)];
              if (ahead !== here) {
                const a = map.latLngToContainerPoint(here);
                const b = map.latLngToContainerPoint(ahead);
                applyHeadingToMarker(b.x - a.x, b.y - a.y, leg.mode);
              }
            }

            // 行駛震動：疊在外層 .veh 上，不動內層 .core 的 rotate/scaleX
            // （那是 applyHeadingToMarker 在管方向的，覆寫會讓車頭轉錯邊）。
            // 兩個不同頻率的正弦相加，避免規律到看起來像機械擺動。
            // 飛機不套用行駛震動：那個頻率是輪軌接縫的節奏，飛在三萬呎上
            // 抖成那樣只會像壞掉。改用週期長很多的緩慢浮沉。
            if (vehEl) {
              const shake = isFlight ? 0 : Math.sin(now / 42) * 0.7 + Math.sin(now / 27) * 0.35;
              const bob = isFlight ? Math.sin(now / 520) * 1.1 : Math.sin(now / 95) * 0.5;
              vehEl.style.transform = `translate(${bob.toFixed(2)}px, ${shake.toFixed(2)}px)`;
            }

            // 長途與航段已經拉開到整段可見，再跟著 pan 會把視野扯回載具腳下
            if (!isLongHaul && !isFlight && now - lastPanAt > 260) {
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
