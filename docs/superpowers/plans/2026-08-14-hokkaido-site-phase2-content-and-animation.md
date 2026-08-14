# 北海道小旅行網站 — 階段二：內容區塊與動畫 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在階段一的核心可用網站上，加上導覽列、封面、全行程總覽、五座城市、吃什麼、住哪裡、花多少、行前準備八個內容區塊，並補上單日動畫播放（載具沿路移動、鏡頭跟隨、抵達彈卡、卡片同步高亮）。

**Architecture:** 延續階段一的模式：純邏輯（日期擴充、城市分區、餐飲/住宿/費用/待辦資料處理、曲線與方向數學）拆成可單獨測試的模組，由 vitest 驗證；DOM 渲染與 Leaflet 動畫以瀏覽器實測驗證。動畫直接擴充既有的 `src/map.js`，不另立模組，因為動畫與地圖的圖層、視野狀態緊密耦合。

**Tech Stack:** 沿用階段一：原生 JavaScript ES modules、Leaflet 1.9.4、OSRM demo、vitest。

**Spec:** `openspec/changes/build-hokkaido-trip-site/`（specs/trip-overview、specs/dining-guide、specs/lodging-guide、specs/budget-summary、specs/prep-checklist、specs/site-shell、specs/itinerary-map 的單日動畫與道路路徑部分）
**視覺參考：** `_mockup.html`（已呈現給使用者的內容區塊視覺稿，class 名稱與 CSS 值直接沿用）
**前一階段：** `docs/superpowers/plans/2026-08-14-hokkaido-site-phase1-core.md`（已完成，index.html／src/*.js 現況以此為準）

## Global Constraints

延續階段一 `docs/superpowers/plans/2026-08-14-hokkaido-site-phase1-core.md` 的 Global Constraints，額外補充：

- 匯率：`config.js` 的 `RATE`（目前 0.21）
- 分類語意色：交通 `#0e7ad4`、住宿 `#7a5cc4`、餐飲 `#f4622e`、生活 `#12a97a`
- 拉麵流派來自 `places.json` 各地點的 `ramen` 欄（`醬油`／`鹽味`／`味噌`），不得以字串猜測
- 城市分區對照：`旭川市→旭川`、`小樽市→小樽`、`虻田郡`/`有珠郡→洞爺`、`函館市→函館`、`札幌市→札幌`、`千歲市→不成區塊`
- 費用總額標籤必須是「已登錄總額」而非「總預算」；未填金額顯示「待補」，不得顯示為 0
- 行前準備清單為唯讀，不可在網站上勾選
- **JR 路段不呼叫 OSRM**，僅 drive／bus／walk／tram 四種模式才呼叫；OSRM 失敗一律退回平滑曲線
- **本階段不做 Wikipedia 圖片後援、不做原型的 VIA 沿線車站硬編碼折點**——理由見 Task 11 的設計說明
- 訂位代號等敏感欄位持續遵守欄位白名單（`src/sheets.js` 的 `COLUMNS`），本階段新讀取的四個頁籤已在階段一列好白名單，不需更動

## Current State（階段一完成後）

```
index.html       頁面骨架、逐日行程區塊的 CSS
config.js         SHEET_ID / TABS / RATE / TRIP_START / TRIP_END / csvUrl()
places.json       36 個地點的地名簿（座標／desc／photo／ramen／aliases）
photos/           18 張已命名照片
src/csv.js        parseCsv / toObjects
src/dates.js      parseDate / compareDates / monthDay / matchByDate / findDateAnomalies
src/transport.js  classifyMode / MODE_COLORS
src/sheets.js     COLUMNS / pickColumns / fetchTab / fetchAllTabs
src/itinerary.js  buildItinerary → Day[] { index, date, city, spots, legs }
src/places.js     makeResolver / latLng
src/geocode.js    makeGeocoder（未知地點地理編碼＋速率限制＋快取）
src/map.js        createMap → { showAll, showDay }；DAY_COLORS
src/timeline.js   renderTimeline → { select(index|null) }
src/cards.js      renderCards；startAutoplay → { stop() }
src/main.js       組裝與啟動；augmentResolver 疊加地理編碼結果
```

`Day.spots[]` 的每個 spot 形狀：`{ name, time, city, activity, stay, transfer, pending }`。
`Day.legs[]` 的每個 leg 形狀：`{ fromIndex, toIndex, mode, label, mins }`。

## File Structure

| 檔案 | 責任 |
|---|---|
| `src/dates.js` | **擴充**：新增 `inferYear`、`diffDays`、`daysBetweenInclusive` |
| `src/cities.js` | 城市分區對照、依非轉車景點計算停留天數 |
| `src/overview.js` | 全行程統計數字（haversine 距離、天數／城市／地點計數） |
| `src/dining.js` | 餐飲頁籤解析、拉麵三大天王篩選 |
| `src/lodging.js` | 住宿頁籤解析、跨頁籤補齊缺漏 |
| `src/budget.js` | 費用頁籤解析、雙幣別換算、分類彙總 |
| `src/prep.js` | 待辦清單解析、完成度計算 |
| `src/icons.js` | 交通工具 SVG 圖示產生器 |
| `src/curve.js` | Catmull-Rom 平滑曲線、兩點直線插值 |
| `src/heading.js` | 載具朝向／翻面角度計算 |
| `src/roads.js` | OSRM 道路路徑抓取（含並行數限制與快取），JR 一律回傳 null |
| `src/map.js` | **擴充**：新增 `playDay(index, callbacks)`，回傳 Promise |
| `src/cards.js` | **擴充**：`renderCards` 加上 `data-index`；`startAutoplay` 改由動畫完成驅動 |
| `src/timeline.js` | **擴充**：`select()` 回傳 `onSelect()` 的回傳值 |
| `src/main.js` | **擴充**：組裝八個新區塊、串接動畫回呼 |
| `index.html` | **擴充**：導覽列、封面、總覽、城市、美食、住宿、費用、行前準備的標記與 CSS |

---

### Task 1: 日期工具擴充

**Files:**
- Modify: `src/dates.js`
- Test: `tests/dates.test.js`（新增案例，既有案例不變）

**Interfaces:**
- Consumes: 無（延續既有 `parseDate`、`compareDates`）
- Produces：
  - `inferYear(month: number, tripStartIso: string, tripEndIso: string): number` — 行程跨年時，依月份判斷該用起始年或結束年
  - `diffDays(aIso: string, bIso: string): number` — 兩個完整日期相差的天數（b − a）
  - `daysBetweenInclusive(startIso: string, endIso: string): number` — 頭尾都算入的天數（用於「總天數」）

- [ ] **Step 1: 寫失敗的測試**

在 `tests/dates.test.js` 檔案末端追加：

```js
describe('inferYear', () => {
  it('月份接近行程起始月時用起始年', () => {
    expect(inferYear(12, '2026-12-25', '2027-01-03')).toBe(2026);
  });

  it('月份接近行程結束月時用結束年', () => {
    expect(inferYear(1, '2026-12-25', '2027-01-03')).toBe(2027);
  });

  it('行程未跨年時兩者同年', () => {
    expect(inferYear(7, '2026-07-01', '2026-07-10')).toBe(2026);
  });
});

describe('diffDays', () => {
  it('計算相差天數', () => {
    expect(diffDays('2026-12-28', '2026-12-31')).toBe(3);
  });

  it('跨年也正確', () => {
    expect(diffDays('2026-12-31', '2027-01-02')).toBe(2);
  });

  it('同一天為 0', () => {
    expect(diffDays('2026-12-25', '2026-12-25')).toBe(0);
  });
});

describe('daysBetweenInclusive', () => {
  it('頭尾都算入', () => {
    expect(daysBetweenInclusive('2026-12-25', '2027-01-03')).toBe(10);
  });

  it('單日行程為 1', () => {
    expect(daysBetweenInclusive('2026-12-25', '2026-12-25')).toBe(1);
  });
});
```

並把檔案頂端的 import 改為：

```js
import { parseDate, compareDates, monthDay, matchByDate, findDateAnomalies, inferYear, diffDays, daysBetweenInclusive } from '../src/dates.js';
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/dates.test.js`
Expected: FAIL，`inferYear`／`diffDays`／`daysBetweenInclusive` 未定義

- [ ] **Step 3: 在 src/dates.js 末端新增實作**

```js
/**
 * 行程跨年時，依月份判斷該月屬於起始年或結束年。
 * 例：行程 2026-12-25～2027-01-03，月份 12 屬於 2026，月份 1 屬於 2027。
 */
export function inferYear(month, tripStartIso, tripEndIso) {
  const start = parseDate(tripStartIso);
  const end = parseDate(tripEndIso);
  if (start.y === end.y) return start.y;
  return month >= start.m ? start.y : end.y;
}

/** 完整日期相差天數（b − a），可為負值。 */
export function diffDays(aIso, bIso) {
  const a = parseDate(aIso);
  const b = parseDate(bIso);
  const ms = Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d);
  return Math.round(ms / 86400000);
}

/** 頭尾都算入的天數。 */
export function daysBetweenInclusive(startIso, endIso) {
  return diffDays(startIso, endIso) + 1;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/dates.test.js`
Expected: PASS，17 個測試全綠（原 10 個 + 新增 7 個）

- [ ] **Step 5: Commit**

```bash
git add src/dates.js tests/dates.test.js
git commit -m "feat: add year inference and day-diff utilities"
```

---

### Task 2: 城市分區與停留天數

**Files:**
- Create: `src/cities.js`
- Test: `tests/cities.test.js`

**Interfaces:**
- Consumes: `Day[]`（`src/itinerary.js` 的 `buildItinerary` 輸出）
- Produces:
  - `CITY_MAP: Record<string,string|null>` — 試算表城市欄 → 網站城市名；值為 `null` 表示不成區塊
  - `canonicalCity(raw: string): string` — 對照表沒有的城市名，回傳原字串
  - `buildCities(days: Day[]): {name:string, dayIndices:number[], spotNames:string[]}[]` — 依首次出現順序排列

- [ ] **Step 1: 寫失敗的測試**

`tests/cities.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { CITY_MAP, canonicalCity, buildCities } from '../src/cities.js';

describe('CITY_MAP', () => {
  it('虻田郡與有珠郡都對應到洞爺', () => {
    expect(CITY_MAP['虻田郡']).toBe('洞爺');
    expect(CITY_MAP['有珠郡']).toBe('洞爺');
  });

  it('千歲市對應到 null（不成區塊）', () => {
    expect(CITY_MAP['千歲市']).toBeNull();
  });
});

describe('canonicalCity', () => {
  it('對照表內的城市轉換為網站名稱', () => {
    expect(canonicalCity('旭川市')).toBe('旭川');
    expect(canonicalCity('函館市')).toBe('函館');
  });

  it('對照表以外的城市原樣回傳', () => {
    expect(canonicalCity('稚內市')).toBe('稚內市');
  });
});

const day = (o = {}) => ({
  index: 0, date: { iso: '2026-12-25' }, city: '', spots: [], legs: [], ...o,
});
const spot = (o = {}) => ({
  name: '', time: '', city: '', activity: '', stay: false, transfer: false, pending: false, ...o,
});

describe('buildCities', () => {
  it('依首次出現順序列出城市', () => {
    const days = [
      day({ date: { iso: '2026-12-25' }, spots: [spot({ name: 'A', city: '旭川市' })] }),
      day({ date: { iso: '2026-12-26' }, spots: [spot({ name: 'B', city: '小樽市' })] }),
    ];
    expect(buildCities(days).map(c => c.name)).toEqual(['旭川', '小樽']);
  });

  it('轉車日不計入停留天數', () => {
    const days = [
      day({ index: 0, spots: [spot({ name: 'JR 札幌站', city: '札幌市', activity: '轉車' })] }),
      day({ index: 1, spots: [spot({ name: '大通公園', city: '札幌市', activity: '走走逛逛' })] }),
    ];
    const sapporo = buildCities(days).find(c => c.name === '札幌');
    expect(sapporo.dayIndices).toEqual([1]);
  });

  it('虻田郡與有珠郡合併為同一個洞爺區塊', () => {
    const days = [
      day({ index: 0, spots: [spot({ name: 'A', city: '虻田郡' })] }),
      day({ index: 1, spots: [spot({ name: 'B', city: '有珠郡' })] }),
    ];
    const cities = buildCities(days);
    expect(cities.filter(c => c.name === '洞爺')).toHaveLength(1);
    expect(cities.find(c => c.name === '洞爺').dayIndices).toEqual([0, 1]);
  });

  it('千歲市不產生區塊', () => {
    const days = [day({ spots: [spot({ name: '新千歲空港', city: '千歲市' })] })];
    expect(buildCities(days).find(c => c.name === '千歲市')).toBeUndefined();
  });

  it('對照表以外的城市仍新增區塊', () => {
    const days = [day({ spots: [spot({ name: 'X', city: '稚內市' })] })];
    expect(buildCities(days).map(c => c.name)).toContain('稚內市');
  });

  it('蒐集每座城市造訪過的地點名稱', () => {
    const days = [day({ spots: [
      spot({ name: 'A', city: '函館市' }),
      spot({ name: 'B', city: '函館市', activity: '轉車' }),
    ] })];
    expect(buildCities(days).find(c => c.name === '函館').spotNames).toEqual(['A', 'B']);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/cities.test.js`
Expected: FAIL，找不到 `../src/cities.js`

- [ ] **Step 3: 實作 src/cities.js**

```js
export const CITY_MAP = {
  '旭川市': '旭川',
  '小樽市': '小樽',
  '虻田郡': '洞爺',
  '有珠郡': '洞爺',
  '函館市': '函館',
  '札幌市': '札幌',
  '千歲市': null,
};

export function canonicalCity(raw) {
  return raw in CITY_MAP ? (CITY_MAP[raw] ?? raw) : raw;
}

/**
 * 依景點的城市欄分組，統計停留天數。
 * 「停留天數」只計入當日有非轉車景點的日子——札幌在 Day 1–3 只是轉車經過，
 * 若不排除轉車會誤報成停留了不該算的天數。
 */
export function buildCities(days) {
  const order = [];
  const byName = new Map();

  for (const day of days) {
    for (const spot of day.spots) {
      if (!spot.city) continue;
      if (CITY_MAP[spot.city] === null) continue;
      const name = canonicalCity(spot.city);

      if (!byName.has(name)) {
        byName.set(name, { name, dayIndices: new Set(), spotNames: [] });
        order.push(name);
      }
      const entry = byName.get(name);
      if (!spot.transfer) entry.dayIndices.add(day.index);
      if (spot.name) entry.spotNames.push(spot.name);
    }
  }

  return order.map(name => {
    const e = byName.get(name);
    return { name: e.name, dayIndices: [...e.dayIndices].sort((a, b) => a - b), spotNames: e.spotNames };
  });
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/cities.test.js`
Expected: PASS，8 個測試全綠

- [ ] **Step 5: 以真實資料驗證**

```bash
node -e "
import('./src/sheets.js').then(async ({fetchAllTabs}) => {
  const { buildItinerary } = await import('./src/itinerary.js');
  const { buildCities } = await import('./src/cities.js');
  const all = await fetchAllTabs();
  const days = buildItinerary(all.itinerary.rows);
  console.log(buildCities(days).map(c => c.name + ' days=' + c.dayIndices.length));
});
"
```
Expected: 五座城市（旭川、小樽、洞爺、函館、札幌），札幌只有 1 天（Day 7），不含千歲

- [ ] **Step 6: Commit**

```bash
git add src/cities.js tests/cities.test.js
git commit -m "feat: derive city sections excluding transfer days"
```

---

### Task 3: 全行程統計數字

**Files:**
- Create: `src/overview.js`
- Test: `tests/overview.test.js`

**Interfaces:**
- Consumes: `Day[]`；`src/places.js` 的 resolver 函式型別 `(name:string)=>Place|null`；`src/dates.js` 的 `daysBetweenInclusive`；`src/cities.js` 的 `buildCities`（城市數必須套用同一套分區對照，否則「虻田郡」「有珠郡」會被算成兩個城市、「千歲市」也會被誤計入，跟 Task 10 畫面顯示的城市卡片數對不上）
- Produces:
  - `haversineKm(a: {lat,lng}, b: {lat,lng}): number`
  - `computeStats({days, resolve, tripStart, tripEnd}): {plannedDays:number, totalDaySpan:number, cityCount:number, spotCount:number, totalKm:number}`

- [ ] **Step 1: 寫失敗的測試**

`tests/overview.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { haversineKm, computeStats } from '../src/overview.js';

describe('haversineKm', () => {
  it('同一點距離為 0', () => {
    expect(haversineKm({ lat: 43, lng: 141 }, { lat: 43, lng: 141 })).toBe(0);
  });

  it('札幌到函館約 220 公里量級', () => {
    const km = haversineKm({ lat: 43.0686, lng: 141.3507 }, { lat: 41.7687, lng: 140.7288 });
    expect(km).toBeGreaterThan(140);
    expect(km).toBeLessThan(160);
  });
});

const day = (o = {}) => ({ index: 0, date: { iso: '2026-12-25' }, city: '', spots: [], legs: [], ...o });
const spot = (o = {}) => ({ name: '', time: '', city: '', activity: '', stay: false, transfer: false, pending: false, ...o });

describe('computeStats', () => {
  const places = {
    A: { lat: 43, lng: 141 },
    B: { lat: 43.1, lng: 141.1 },
  };
  const resolve = name => places[name] || null;

  it('計算已規劃天數與總天數', () => {
    const days = [day({ index: 0 }), day({ index: 1 })];
    const s = computeStats({ days, resolve, tripStart: '2026-12-25', tripEnd: '2026-12-30' });
    expect(s.plannedDays).toBe(2);
    expect(s.totalDaySpan).toBe(6);
  });

  it('城市數套用與 buildCities 相同的分區對照——虻田郡與有珠郡合併，千歲市不計入', () => {
    const days = [day({ spots: [
      spot({ name: 'A', city: '旭川市' }),
      spot({ name: 'B', city: '虻田郡' }),
      spot({ name: 'A', city: '有珠郡' }),
      spot({ name: 'A', city: '千歲市' }),
    ] })];
    const s = computeStats({ days, resolve, tripStart: '2026-12-25', tripEnd: '2026-12-25' });
    expect(s.cityCount).toBe(2);
  });

  it('計算地點數（唯一地點名）', () => {
    const days = [day({ spots: [
      spot({ name: 'A', city: '旭川市' }),
      spot({ name: 'B', city: '小樽市' }),
    ] })];
    const s = computeStats({ days, resolve, tripStart: '2026-12-25', tripEnd: '2026-12-25' });
    expect(s.spotCount).toBe(2);
  });

  it('地點為空或重複不計入地點數', () => {
    const days = [day({ spots: [
      spot({ name: 'A', city: '旭川市' }),
      spot({ name: 'A', city: '旭川市' }),
      spot({ name: '', city: '旭川市' }),
    ] })];
    const s = computeStats({ days, resolve, tripStart: '2026-12-25', tripEnd: '2026-12-25' });
    expect(s.spotCount).toBe(1);
  });

  it('依可解析座標的相鄰景點累加距離', () => {
    const days = [day({ legs: [{ fromIndex: 0, toIndex: 1, mode: 'walk', label: '', mins: 5 }],
      spots: [spot({ name: 'A' }), spot({ name: 'B' })] })];
    const s = computeStats({ days, resolve, tripStart: '2026-12-25', tripEnd: '2026-12-25' });
    expect(s.totalKm).toBeGreaterThan(0);
  });

  it('缺座標的 leg 不中斷計算', () => {
    const days = [day({ legs: [{ fromIndex: 0, toIndex: 1, mode: 'walk', label: '', mins: 5 }],
      spots: [spot({ name: 'A' }), spot({ name: '不存在的地點' })] })];
    const s = computeStats({ days, resolve, tripStart: '2026-12-25', tripEnd: '2026-12-25' });
    expect(s.totalKm).toBe(0);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/overview.test.js`
Expected: FAIL，找不到 `../src/overview.js`

- [ ] **Step 3: 實作 src/overview.js**

```js
import { daysBetweenInclusive } from './dates.js';
import { buildCities } from './cities.js';

const R = 6371;
const rad = x => (x * Math.PI) / 180;

export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * 總移動距離為各 leg 兩端直線距離的累加，非實際里程，畫面應標示「約」。
 * 城市數透過 buildCities 取得，套用與五座城市區塊相同的分區對照——
 * 不能直接數 spot.city 的相異字串，否則「虻田郡」「有珠郡」會被誤算成兩個城市。
 */
export function computeStats({ days, resolve, tripStart, tripEnd }) {
  const spotNames = new Set();
  let totalKm = 0;

  for (const day of days) {
    for (const spot of day.spots) {
      if (spot.name) spotNames.add(spot.name);
    }
    for (const leg of day.legs) {
      const a = resolve(day.spots[leg.fromIndex]?.name);
      const b = resolve(day.spots[leg.toIndex]?.name);
      if (a && b) totalKm += haversineKm(a, b);
    }
  }

  return {
    plannedDays: days.length,
    totalDaySpan: daysBetweenInclusive(tripStart, tripEnd),
    cityCount: buildCities(days).length,
    spotCount: spotNames.size,
    totalKm,
  };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/overview.test.js`
Expected: PASS，8 個測試全綠

- [ ] **Step 5: Commit**

```bash
git add src/overview.js tests/overview.test.js
git commit -m "feat: compute trip-wide stats from itinerary and gazetteer"
```

---

### Task 4: 吃什麼資料處理（餐飲、拉麵三大天王）

**Files:**
- Create: `src/dining.js`
- Test: `tests/dining.test.js`

**Interfaces:**
- Consumes: 「餐飲」頁籤列（`{日期,城市,'餐廳/地點',餐別,預約狀態,備註}`）；resolver 函式
- Produces:
  - `parseDining(rows): {date:string, city:string, name:string, meal:string, reserved:boolean|null, note:string}[]`
  - `ramenTrio(dishes, resolve): {flavor:string, name:string, city:string, date:string, meal:string, photo?:string}[]`

- [ ] **Step 1: 寫失敗的測試**

`tests/dining.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { parseDining, ramenTrio } from '../src/dining.js';

const row = (o = {}) => ({
  日期: '2026-12-25', 城市: '旭川市', '餐廳/地點': '蜂屋 五条創業店',
  餐別: '晚餐', 預約狀態: '', 備註: '醬油拉麵', ...o,
});

describe('parseDining', () => {
  it('解析基本欄位', () => {
    const [d] = parseDining([row()]);
    expect(d).toEqual({
      date: '2026-12-25', city: '旭川市', name: '蜂屋 五条創業店',
      meal: '晚餐', reserved: null, note: '醬油拉麵',
    });
  });

  it('TRUE 視為已訂位', () => {
    expect(parseDining([row({ 預約狀態: 'TRUE' })])[0].reserved).toBe(true);
  });

  it('FALSE 視為未訂位', () => {
    expect(parseDining([row({ 預約狀態: 'FALSE' })])[0].reserved).toBe(false);
  });

  it('空值視為不適用（null），不是未訂位', () => {
    expect(parseDining([row({ 預約狀態: '' })])[0].reserved).toBeNull();
  });

  it('餐廳/地點為空時 name 為空字串，不中斷', () => {
    const [d] = parseDining([row({ '餐廳/地點': '' })]);
    expect(d.name).toBe('');
  });
});

describe('ramenTrio', () => {
  const places = {
    '蜂屋 五条創業店': { ramen: '醬油' },
    '山崎洋服店': { ramen: '鹽味' },
    '札幌一粒庵': { ramen: '味噌', photo: 'photos/ichiryuan.png' },
    '三角市場': {},
  };
  const resolve = name => places[name] || null;

  it('只取有 ramen 標記的餐廳', () => {
    const dishes = parseDining([
      row({ '餐廳/地點': '蜂屋 五条創業店' }),
      row({ '餐廳/地點': '三角市場', 餐別: '午餐' }),
    ]);
    const trio = ramenTrio(dishes, resolve);
    expect(trio).toHaveLength(1);
    expect(trio[0].flavor).toBe('醬油');
  });

  it('三種流派齊全時回傳三筆，附照片（若有）', () => {
    const dishes = parseDining([
      row({ '餐廳/地點': '蜂屋 五条創業店' }),
      row({ '餐廳/地點': '山崎洋服店' }),
      row({ '餐廳/地點': '札幌一粒庵' }),
    ]);
    const trio = ramenTrio(dishes, resolve);
    expect(trio.map(t => t.flavor).sort()).toEqual(['味噌', '醬油', '鹽味']);
    expect(trio.find(t => t.flavor === '味噌').photo).toBe('photos/ichiryuan.png');
  });

  it('未知地點（resolve 回傳 null）不列入', () => {
    const dishes = parseDining([row({ '餐廳/地點': '不存在的店' })]);
    expect(ramenTrio(dishes, resolve)).toEqual([]);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/dining.test.js`
Expected: FAIL，找不到 `../src/dining.js`

- [ ] **Step 3: 實作 src/dining.js**

```js
/** 訂位狀態直接反映試算表原意：TRUE=已訂位、FALSE=未訂位、空值=不適用（不強行視為未訂位）。 */
export function parseDining(rows) {
  return rows.map(r => ({
    date: r['日期'] || '',
    city: r['城市'] || '',
    name: r['餐廳/地點'] || '',
    meal: r['餐別'] || '',
    reserved: r['預約狀態'] === 'TRUE' ? true : r['預約狀態'] === 'FALSE' ? false : null,
    note: r['備註'] || '',
  }));
}

/**
 * 北海道拉麵三大天王：旭川醬油、函館鹽味、札幌味噌。
 * 流派來自 places.json 的 ramen 欄，不以店名或備註字串猜測。
 */
export function ramenTrio(dishes, resolve) {
  return dishes
    .map(d => ({ dish: d, place: d.name ? resolve(d.name) : null }))
    .filter(({ place }) => place?.ramen)
    .map(({ dish, place }) => ({
      flavor: place.ramen,
      name: dish.name,
      city: dish.city,
      date: dish.date,
      meal: dish.meal,
      photo: place.photo,
    }));
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/dining.test.js`
Expected: PASS，8 個測試全綠

- [ ] **Step 5: 以真實資料驗證**

```bash
node -e "
import('./src/sheets.js').then(async ({fetchAllTabs}) => {
  const { parseDining, ramenTrio } = await import('./src/dining.js');
  const places = await (await fetch('http://localhost:8777/places.json')).json().catch(()=>({}));
  const all = await fetchAllTabs();
  const dishes = parseDining(all.dining.rows);
  console.log('dishes:', dishes.length);
  const { makeResolver } = await import('./src/places.js');
  console.log('ramen:', ramenTrio(dishes, makeResolver(places)).map(t=>t.flavor));
});
" 2>&1 || echo "若 fetch 失敗，先用 npm run dev 另開終端再重跑"
```
Expected: `dishes: 10`（或更多，視試算表當下列數而定），`ramen` 含 `醬油`、`鹽味`、`味噌`

- [ ] **Step 6: Commit**

```bash
git add src/dining.js tests/dining.test.js
git commit -m "feat: parse dining rows and select the ramen trio"
```

---

### Task 5: 住哪裡資料處理（跨頁籤補齊）

**Files:**
- Create: `src/lodging.js`
- Test: `tests/lodging.test.js`

**Interfaces:**
- Consumes: 「住宿」頁籤列、「待辦清單」頁籤列；`src/dates.js` 的 `parseDate`、`diffDays`、`inferYear`
- Produces:
  - `extractDateRange(text: string): {checkin:{m,d}, checkout:{m,d}|null} | null`
  - `buildLodging({lodgingRows, todoRows, tripStart, tripEnd}): Stay[]`，其中
    `Stay = {name, city, checkinIso:string|null, checkoutIso:string|null, nights:number|null, ntd:number|null, booked:boolean, memo:string, fromLodgingTab:boolean}`

**設計說明**：規格要求「住宿頁籤缺漏時，日期區間取自待辦清單的項目名稱」。待辦清單的住宿項目長這樣：`住宿旅館-函館 (12/28 ~ 12/30)`——只有月/日、沒有年份，且用中文頓號式的城市簡稱（不是完整的飯店名稱）。所以补齊邏輯是：先列出「住宿」頁籤已有的飯店（直接用頁籤資料），再找出待辦清單裡「分類1 為住宿」且名稱含「住宿旅館」的項目，用**城市簡稱**（`函館`、`札幌`⋯，取自 `src/cities.js` 的 `CITY_MAP` 值）比對是否已被「住宿」頁籤涵蓋，沒被涵蓋的才建立一筆補齊資料。

- [ ] **Step 1: 寫失敗的測試**

`tests/lodging.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { extractDateRange, buildLodging } from '../src/lodging.js';

describe('extractDateRange', () => {
  it('解析日期區間', () => {
    expect(extractDateRange('住宿旅館-函館 (12/28 ~ 12/30)')).toEqual({
      checkin: { m: 12, d: 28 }, checkout: { m: 12, d: 30 },
    });
  });

  it('解析用連字號分隔的區間', () => {
    expect(extractDateRange('住宿旅館-札幌 (12/31 - 01/02)')).toEqual({
      checkin: { m: 12, d: 31 }, checkout: { m: 1, d: 2 },
    });
  });

  it('解析單一日期（只有入住日）', () => {
    expect(extractDateRange('去程機票 (12/25 )')).toEqual({
      checkin: { m: 12, d: 25 }, checkout: null,
    });
  });

  it('沒有括號日期時回傳 null', () => {
    expect(extractDateRange('駕照譯本')).toBeNull();
  });
});

const lodgingRow = (o = {}) => ({
  入住日: '2026-12-25', 退房日: '2026-12-26', 城市: '旭川市',
  飯店名稱: '旭川 JR 酒店', '費用 (NTD)': '3,709', 訂房狀態: 'TRUE', 備註: '含早餐', ...o,
});
const todoRow = (o = {}) => ({ 分類1: '住宿', 項目名稱: '', 已完成: 'FALSE', ...o });

describe('buildLodging', () => {
  it('住宿頁籤有資料時直接使用，晚數由入住退房日計算', () => {
    const stays = buildLodging({
      lodgingRows: [lodgingRow()], todoRows: [],
      tripStart: '2026-12-25', tripEnd: '2027-01-03',
    });
    expect(stays).toHaveLength(1);
    expect(stays[0].nights).toBe(1);
    expect(stays[0].ntd).toBe(3709);
    expect(stays[0].booked).toBe(true);
    expect(stays[0].fromLodgingTab).toBe(true);
  });

  it('住宿頁籤缺漏時由待辦清單補上日期區間與訂房狀態', () => {
    const stays = buildLodging({
      lodgingRows: [lodgingRow(), lodgingRow({ 飯店名稱: '' }), lodgingRow({ 飯店名稱: '' })],
      todoRows: [
        todoRow({ 項目名稱: '住宿旅館-函館 (12/28 ~ 12/30)', 已完成: 'TRUE' }),
      ],
      tripStart: '2026-12-25', tripEnd: '2027-01-03',
    });
    const hakodate = stays.find(s => s.city === '函館');
    expect(hakodate).toBeDefined();
    expect(hakodate.checkinIso).toBe('2026-12-28');
    expect(hakodate.checkoutIso).toBe('2026-12-30');
    expect(hakodate.nights).toBe(2);
    expect(hakodate.booked).toBe(true);
    expect(hakodate.ntd).toBeNull();
    expect(hakodate.fromLodgingTab).toBe(false);
  });

  it('待辦清單日期跨年時年份判斷正確', () => {
    const stays = buildLodging({
      lodgingRows: [lodgingRow({ 飯店名稱: '' })],
      todoRows: [todoRow({ 項目名稱: '住宿旅館-札幌 (12/31 ~ 01/02)', 已完成: 'TRUE' })],
      tripStart: '2026-12-25', tripEnd: '2027-01-03',
    });
    const sapporo = stays.find(s => s.city === '札幌');
    expect(sapporo.checkinIso).toBe('2026-12-31');
    expect(sapporo.checkoutIso).toBe('2027-01-02');
  });

  it('待辦清單也找不到對應項目時仍產生卡片，日期為 null', () => {
    const stays = buildLodging({
      lodgingRows: [lodgingRow({ 城市: '', 飯店名稱: '' })],
      todoRows: [],
      tripStart: '2026-12-25', tripEnd: '2027-01-03',
    });
    expect(stays).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/lodging.test.js`
Expected: FAIL，找不到 `../src/lodging.js`

- [ ] **Step 3: 實作 src/lodging.js**

```js
import { parseDate, diffDays, inferYear } from './dates.js';
import { CITY_MAP } from './cities.js';

const RANGE_RE = /\((\d{1,2})\/(\d{1,2})\s*(?:~|-|至)\s*(\d{1,2})\/(\d{1,2})\)/;
const SINGLE_RE = /\((\d{1,2})\/(\d{1,2})\s*\)/;

/** 從待辦清單的項目名稱擷取括號內的日期區間或單一日期。 */
export function extractDateRange(text) {
  const range = RANGE_RE.exec(text);
  if (range) {
    return {
      checkin: { m: +range[1], d: +range[2] },
      checkout: { m: +range[3], d: +range[4] },
    };
  }
  const single = SINGLE_RE.exec(text);
  if (single) {
    return { checkin: { m: +single[1], d: +single[2] }, checkout: null };
  }
  return null;
}

function toIso(md, tripStart, tripEnd) {
  if (!md) return null;
  const y = inferYear(md.m, tripStart, tripEnd);
  const iso = `${y}-${String(md.m).padStart(2, '0')}-${String(md.d).padStart(2, '0')}`;
  return parseDate(iso) ? iso : null;
}

function parseNtd(s) {
  const n = Number(String(s ?? '').replace(/,/g, ''));
  return s && !Number.isNaN(n) ? n : null;
}

/**
 * 住宿頁籤為主要來源；缺漏的住宿改由待辦清單補齊，
 * 用城市簡稱比對「住宿旅館」開頭的待辦項目（規格要求日期區間取自待辦清單的項目名稱）。
 */
export function buildLodging({ lodgingRows, todoRows, tripStart, tripEnd }) {
  const fromTab = lodgingRows
    .filter(r => r['飯店名稱'])
    .map(r => {
      const checkinIso = r['入住日'] || null;
      const checkoutIso = r['退房日'] || null;
      return {
        name: r['飯店名稱'],
        city: r['城市'] || '',
        checkinIso,
        checkoutIso,
        nights: checkinIso && checkoutIso ? diffDays(checkinIso, checkoutIso) : null,
        ntd: parseNtd(r['費用 (NTD)']),
        booked: r['訂房狀態'] === 'TRUE',
        memo: r['備註'] || '',
        fromLodgingTab: true,
      };
    });

  const coveredCities = new Set(fromTab.map(s => CITY_MAP[s.city] ?? s.city));

  const fromTodo = todoRows
    .filter(r => r['分類1'] === '住宿' && r['項目名稱'].includes('住宿旅館'))
    .map(r => {
      const cityLabel = Object.values(CITY_MAP).find(c => c && r['項目名稱'].includes(c));
      if (!cityLabel || coveredCities.has(cityLabel)) return null;
      const range = extractDateRange(r['項目名稱']);
      const checkinIso = toIso(range?.checkin, tripStart, tripEnd);
      const checkoutIso = toIso(range?.checkout, tripStart, tripEnd);
      return {
        name: cityLabel,
        city: cityLabel,
        checkinIso,
        checkoutIso,
        nights: checkinIso && checkoutIso ? diffDays(checkinIso, checkoutIso) : null,
        ntd: null,
        booked: r['已完成'] === 'TRUE',
        memo: '「住宿」頁籤未填',
        fromLodgingTab: false,
      };
    })
    .filter(Boolean);

  return [...fromTab, ...fromTodo].sort((a, b) =>
    (a.checkinIso || '').localeCompare(b.checkinIso || ''));
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/lodging.test.js`
Expected: PASS，9 個測試全綠

- [ ] **Step 5: 以真實資料驗證**

```bash
node -e "
import('./src/sheets.js').then(async ({fetchAllTabs}) => {
  const { buildLodging } = await import('./src/lodging.js');
  const { TRIP_START, TRIP_END } = await import('./config.js');
  const all = await fetchAllTabs();
  const stays = buildLodging({ lodgingRows: all.lodging.rows, todoRows: all.todo.rows, tripStart: TRIP_START, tripEnd: TRIP_END });
  console.log(stays.map(s => \`\${s.name} \${s.checkinIso}~\${s.checkoutIso} nights=\${s.nights} ntd=\${s.ntd} booked=\${s.booked} fromTab=\${s.fromLodgingTab}\`).join('\n'));
});
"
```
Expected: 5 筆，前 3 筆 `fromTab=true`（旭川／小樽／洞爺），後 2 筆 `fromTab=false`（函館／札幌，`ntd=null`、`booked=true`）

- [ ] **Step 6: Commit**

```bash
git add src/lodging.js tests/lodging.test.js
git commit -m "feat: build lodging list with todo-list fallback for gaps"
```

---

### Task 6: 花多少資料處理

**Files:**
- Create: `src/budget.js`
- Test: `tests/budget.test.js`

**Interfaces:**
- Consumes: 「費用規劃」頁籤列（`{分類1,分類2,項目,NTD,JPY,備註}`）；`RATE`
- Produces:
  - `toTwd(row: {ntd, jpy}, rate: number): number|null`
  - `summarizeBudget(rows, rate): { items: Item[], totalTwd:number, filledCount:number, totalCount:number, categoryTotals: {category:string, twd:number|null}[] }`
    其中 `Item = {category, subcategory, name, ntd:number|null, jpy:number|null, twd:number|null, filled:boolean}`

- [ ] **Step 1: 寫失敗的測試**

`tests/budget.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { toTwd, summarizeBudget } from '../src/budget.js';

describe('toTwd', () => {
  it('只有 NTD 時直接使用', () => {
    expect(toTwd({ ntd: 1000, jpy: null }, 0.21)).toBe(1000);
  });

  it('只有 JPY 時依匯率換算', () => {
    expect(toTwd({ ntd: null, jpy: 1000 }, 0.21)).toBeCloseTo(210, 5);
  });

  it('兩者皆空回傳 null', () => {
    expect(toTwd({ ntd: null, jpy: null }, 0.21)).toBeNull();
  });
});

const row = (o = {}) => ({ 分類1: '交通', 分類2: '機票', 項目: '台灣虎航 IT234', NTD: '42,957', JPY: '', 備註: '', ...o });

describe('summarizeBudget', () => {
  it('解析千分位逗號金額', () => {
    const { items } = summarizeBudget([row()], 0.21);
    expect(items[0].ntd).toBe(42957);
  });

  it('未填金額標記 filled:false，不計為 0', () => {
    const { items } = summarizeBudget([row({ NTD: '', JPY: '' })], 0.21);
    expect(items[0].filled).toBe(false);
    expect(items[0].twd).toBeNull();
  });

  it('已填金額項數與總項數', () => {
    const { filledCount, totalCount } = summarizeBudget([
      row(), row({ NTD: '', JPY: '' }),
    ], 0.21);
    expect(filledCount).toBe(1);
    expect(totalCount).toBe(2);
  });

  it('總額只加總已填項目，日圓依匯率換算', () => {
    const { totalTwd } = summarizeBudget([
      row({ NTD: '1000', JPY: '' }),
      row({ NTD: '', JPY: '1000' }),
      row({ NTD: '', JPY: '' }),
    ], 0.21);
    expect(totalTwd).toBeCloseTo(1210, 5);
  });

  it('分類彙總依分類1加總，未填則該分類為 null', () => {
    const { categoryTotals } = summarizeBudget([
      row({ 分類1: '交通', NTD: '1000' }),
      row({ 分類1: '生活', NTD: '', JPY: '' }),
    ], 0.21);
    const life = categoryTotals.find(c => c.category === '生活');
    expect(life.twd).toBeNull();
    const transport = categoryTotals.find(c => c.category === '交通');
    expect(transport.twd).toBe(1000);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/budget.test.js`
Expected: FAIL，找不到 `../src/budget.js`

- [ ] **Step 3: 實作 src/budget.js**

```js
function parseAmount(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

export function toTwd({ ntd, jpy }, rate) {
  if (ntd == null && jpy == null) return null;
  return (ntd ?? 0) + (jpy != null ? jpy * rate : 0);
}

/**
 * 總額只加總「已填」項目，未填顯示待補而非 0——
 * 避免把低估值誤讀為完整預算（見規格「已登錄總額」而非「總預算」）。
 */
export function summarizeBudget(rows, rate) {
  const items = rows.map(r => {
    const ntd = parseAmount(r['NTD']);
    const jpy = parseAmount(r['JPY']);
    const filled = ntd != null || jpy != null;
    return {
      category: r['分類1'] || '',
      subcategory: r['分類2'] || '',
      name: r['項目'] || '',
      ntd, jpy,
      twd: filled ? toTwd({ ntd, jpy }, rate) : null,
      filled,
    };
  });

  const totalTwd = items.reduce((sum, it) => sum + (it.twd ?? 0), 0);
  const filledCount = items.filter(it => it.filled).length;

  const byCategory = new Map();
  for (const it of items) {
    if (!byCategory.has(it.category)) byCategory.set(it.category, { hasAny: false, sum: 0 });
    const c = byCategory.get(it.category);
    if (it.filled) { c.hasAny = true; c.sum += it.twd; }
  }
  const categoryTotals = [...byCategory.entries()].map(([category, c]) => ({
    category, twd: c.hasAny ? c.sum : null,
  }));

  return { items, totalTwd, filledCount, totalCount: items.length, categoryTotals };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/budget.test.js`
Expected: PASS，10 個測試全綠

- [ ] **Step 5: Commit**

```bash
git add src/budget.js tests/budget.test.js
git commit -m "feat: summarize budget rows with honest unfilled handling"
```

---

### Task 7: 行前準備資料處理

**Files:**
- Create: `src/prep.js`
- Test: `tests/prep.test.js`

**Interfaces:**
- Consumes: 「待辦清單」頁籤列（`{分類1,項目名稱,已完成}`）
- Produces: `summarizePrep(rows): { items: {category, name, done:boolean}[], doneCount:number, totalCount:number, pct:number }`

- [ ] **Step 1: 寫失敗的測試**

`tests/prep.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { summarizePrep } from '../src/prep.js';

const row = (o = {}) => ({ 分類1: '交通', 項目名稱: '去程機票', 已完成: 'TRUE', ...o });

describe('summarizePrep', () => {
  it('解析每一項的完成狀態', () => {
    const { items } = summarizePrep([row(), row({ 已完成: 'FALSE', 項目名稱: 'eSim' })]);
    expect(items).toEqual([
      { category: '交通', name: '去程機票', done: true },
      { category: '交通', name: 'eSim', done: false },
    ]);
  });

  it('計算完成數與總數', () => {
    const { doneCount, totalCount } = summarizePrep([row(), row({ 已完成: 'FALSE' }), row({ 已完成: 'FALSE' })]);
    expect(doneCount).toBe(1);
    expect(totalCount).toBe(3);
  });

  it('百分比四捨五入為整數', () => {
    const rows = [row(), row(), row({ 已完成: 'FALSE' })];
    expect(summarizePrep(rows).pct).toBe(67);
  });

  it('空值視為未完成', () => {
    expect(summarizePrep([row({ 已完成: '' })])[0]?.done).toBeUndefined();
    expect(summarizePrep([row({ 已完成: '' })]).items[0].done).toBe(false);
  });

  it('沒有項目時不除以零', () => {
    expect(summarizePrep([])).toEqual({ items: [], doneCount: 0, totalCount: 0, pct: 0 });
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/prep.test.js`
Expected: FAIL，找不到 `../src/prep.js`

- [ ] **Step 3: 實作 src/prep.js**

```js
/** 完成度完全來自試算表，網站不提供勾選互動或本機覆寫。 */
export function summarizePrep(rows) {
  const items = rows.map(r => ({
    category: r['分類1'] || '',
    name: r['項目名稱'] || '',
    done: r['已完成'] === 'TRUE',
  }));
  const doneCount = items.filter(it => it.done).length;
  const totalCount = items.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  return { items, doneCount, totalCount, pct };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/prep.test.js`
Expected: PASS，5 個測試全綠

- [ ] **Step 5: Commit**

```bash
git add src/prep.js tests/prep.test.js
git commit -m "feat: summarize prep checklist completion"
```

---

### Task 8: 導覽列與封面

**Files:**
- Modify: `index.html`（加入 nav、hero 的標記與 CSS，並把逐日行程等既有內容包進 `<section id="days">`）
- Modify: `src/main.js`（倒數計算、導覽列 scroll-spy）
- Test: `tests/countdown.test.js`

**Interfaces:**
- Consumes: `TRIP_START`（`config.js`）
- Produces: `formatCountdown(tripStartIso: string, now: Date): string` — 由 `src/countdown.js` 匯出

- [ ] **Step 1: 寫失敗的測試**

`tests/countdown.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { formatCountdown } from '../src/countdown.js';

describe('formatCountdown', () => {
  it('出發前顯示剩餘天數', () => {
    expect(formatCountdown('2026-12-25', new Date('2026-08-14T00:00:00+09:00'))).toBe('D-133');
  });

  it('出發當天顯示 D-DAY', () => {
    expect(formatCountdown('2026-12-25', new Date('2026-12-25T09:00:00+09:00'))).toBe('D-DAY');
  });

  it('出發後顯示已出發', () => {
    expect(formatCountdown('2026-12-25', new Date('2027-01-01T00:00:00+09:00'))).toBe('已出發');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/countdown.test.js`
Expected: FAIL，找不到 `../src/countdown.js`

- [ ] **Step 3: 實作 src/countdown.js**

```js
/** 以日本時區（UTC+9，行程實際所在地）為準計算天數差。 */
export function formatCountdown(tripStartIso, now = new Date()) {
  const start = new Date(`${tripStartIso}T00:00:00+09:00`);
  const diffMs = start - now;
  const days = Math.ceil(diffMs / 86400000);
  if (days > 0) return `D-${days}`;
  if (days === 0) return 'D-DAY';
  return '已出發';
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/countdown.test.js`
Expected: PASS，3 個測試全綠

- [ ] **Step 5: 加入導覽列與封面的 CSS**

於 `index.html` 的 `<style>` 區塊、`</style>` 之前加入（class 名稱與數值取自使用者已審閱的 `_mockup.html`）：

```css
nav{position:sticky;top:0;z-index:1000;background:rgba(255,248,236,.86);
  backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
nav .wrap{display:flex;align-items:center;justify-content:space-between;height:58px;gap:24px;flex-wrap:wrap}
nav .brand{font-family:"Zen Maru Gothic";font-weight:700;font-size:15px;letter-spacing:.1em}
nav ul{display:flex;gap:22px;list-style:none;margin:0;padding:0;flex-wrap:wrap}
nav a{color:var(--ink-2);text-decoration:none;font-size:12px;letter-spacing:.06em;font-weight:500;
  padding:6px 0;border-bottom:2px solid transparent;transition:.2s}
nav a:hover{color:var(--ink);border-bottom-color:var(--drive)}
nav a.on{color:var(--ink);border-bottom-color:var(--drive)}

.cap{font-size:10px;letter-spacing:.26em;font-weight:500;color:var(--drive);text-transform:uppercase}
.hero{position:relative;height:min(560px,72vh);overflow:hidden;display:flex;align-items:flex-end}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero::after{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(20,16,12,.42) 0%,rgba(20,16,12,.12) 34%,rgba(20,16,12,.72) 100%)}
.hero .wrap{position:relative;z-index:2;padding-bottom:40px;width:100%;color:#fff;
  display:flex;align-items:flex-end;justify-content:space-between;gap:36px;flex-wrap:wrap}
.hero .cap{color:#ffd9c6}
.hero h1{font-size:52px;font-weight:700;letter-spacing:.13em;line-height:1.1;margin:12px 0 14px;
  text-shadow:0 2px 24px rgba(0,0,0,.35)}
.hero .dates{font-size:14px;letter-spacing:.1em;font-weight:500;margin-bottom:8px}
.hero .cities{font-size:12.5px;letter-spacing:.18em;color:rgba(255,255,255,.82)}
.countdown{text-align:right;flex-shrink:0}
.countdown .num{font-family:"Zen Maru Gothic";font-weight:700;font-size:58px;line-height:1;
  text-shadow:0 2px 24px rgba(0,0,0,.35)}
.countdown .lbl{font-size:10.5px;letter-spacing:.22em;color:rgba(255,255,255,.8);margin-top:8px}

section{padding:64px 0}
.shead{margin-bottom:30px}
.shead h2{font-size:25px;font-weight:700;letter-spacing:.08em;margin:9px 0 8px}
.shead p{font-size:12.5px;color:var(--ink-2);line-height:1.9;margin:0;max-width:660px}
@media(max-width:820px){.hero h1{font-size:36px}.countdown .num{font-size:42px}}
```

- [ ] **Step 6: 加入導覽列與封面的標記，並把逐日行程包進 section**

`index.html` 的 `<body>` 整段改為（沿用既有的 `#notice`／`#daylist`／`#map`／`#cards`，只是包進帶 id 的 section，供導覽列跳轉）：

```html
<body>
<nav>
  <div class="wrap">
    <div class="brand">北海道小旅行</div>
    <ul id="navlinks">
      <li><a href="#overview">總覽</a></li>
      <li><a href="#days">逐日行程</a></li>
      <li><a href="#cities">五座城市</a></li>
      <li><a href="#food">吃什麼</a></li>
      <li><a href="#stay">住哪裡</a></li>
      <li><a href="#cost">花多少</a></li>
      <li><a href="#prep">行前準備</a></li>
    </ul>
  </div>
</nav>

<header class="hero" id="hero">
  <img id="heroimg" alt="">
  <div class="wrap">
    <div>
      <div class="cap">Hokkaido · Winter Itinerary</div>
      <h1>北海道小旅行</h1>
      <div class="dates" id="herodates"></div>
      <div class="cities" id="herocities"></div>
    </div>
    <div class="countdown">
      <div class="num" id="cd">—</div>
      <div class="lbl">距離出發</div>
    </div>
  </div>
</header>

<main class="wrap">
  <div id="notice"></div>

  <section id="overview">
    <div class="shead"><div class="cap">Overview</div><h2>這趟怎麼走</h2>
      <p>先一路北上到旭川，再往南經小樽、洞爺抵達函館，最後拉回札幌跨年。</p></div>
    <div id="statband"></div>
  </section>

  <section id="days" style="padding-top:0">
    <div class="top">
      <div id="daylist"></div>
      <div id="map"></div>
    </div>
    <div id="cards"></div>
  </section>

  <section id="cities">
    <div class="shead"><div class="cap">Five cities</div><h2>五座城市</h2>
      <p>每座城市停留的天數、去了哪些地方。</p></div>
    <div id="citiesgrid"></div>
  </section>

  <section id="food">
    <div class="shead"><div class="cap">What to eat</div><h2>吃什麼</h2></div>
    <div id="ramenblock"></div>
    <div id="eatsgrid"></div>
  </section>

  <section id="stay">
    <div class="shead"><div class="cap">Where to stay</div><h2>住哪裡</h2></div>
    <div id="staysgrid"></div>
  </section>

  <section id="cost">
    <div class="shead"><div class="cap">Budget</div><h2>花多少</h2></div>
    <div id="costblock"></div>
  </section>

  <section id="prep">
    <div class="shead"><div class="cap">Preparation</div><h2>行前準備</h2></div>
    <div id="prepblock"></div>
  </section>
</main>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script type="module" src="src/main.js"></script>
</body>
```

- [ ] **Step 7: 在 main.js 接上倒數、封面與導覽列**

於 `src/main.js` 加入 import：

```js
import { formatCountdown } from './countdown.js';
```

在 `start()` 內、`showNotice(messages);` 之後加入：

```js
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
```

`herocities` 的內容留給 Task 10（依賴 `buildCities` 的結果），此步驟先不填。

- [ ] **Step 8: 啟動開發伺服器並以瀏覽器驗證**

```bash
node tools/serve.js . 8777
```

另開終端：

```bash
agent-browser open "http://localhost:8777/"
agent-browser eval "document.getElementById('cd').textContent"
```
Expected: `D-<正整數>`（依當下日期而定，出發日固定為 2026-12-25）

```bash
agent-browser eval "document.querySelectorAll('nav a').length"
```
Expected: `7`

- [ ] **Step 9: 執行完整測試套件**

Run: `npm test`
Expected: PASS，全部測試綠燈（含新增的 3 個 countdown 測試）

- [ ] **Step 10: Commit**

```bash
git add index.html src/main.js src/countdown.js tests/countdown.test.js
git commit -m "feat: add nav bar and hero section with departure countdown"
```

---

### Task 9: 總覽數字帶與每日圖例

**Files:**
- Modify: `index.html`（加入 `.stats`／`.daykey` CSS）
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/overview.js` 的 `computeStats`；`src/map.js` 的 `DAY_COLORS`

- [ ] **Step 1: 加入 CSS**

於 `index.html` 的 `<style>` 內加入：

```css
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);
  border:1px solid var(--line);border-radius:18px;overflow:hidden;margin-bottom:22px}
.stat{background:var(--paper);padding:22px 24px}
.stat .v{font-family:"Zen Maru Gothic";font-weight:700;font-size:30px;letter-spacing:.02em;line-height:1}
.stat .v small{font-size:14px;font-weight:500;margin-left:3px;color:var(--ink-2)}
.stat .k{font-size:10.5px;letter-spacing:.14em;color:var(--ink-3);margin-top:8px}
.daykey{display:flex;flex-wrap:wrap;gap:9px}
.daykey b{display:flex;align-items:center;gap:8px;background:var(--paper);border:1.5px solid var(--line);
  border-radius:99px;padding:6px 14px;font-size:11px;font-weight:500;letter-spacing:.05em}
.daykey i{width:18px;height:2.5px;border-radius:2px;display:block}
@media(max-width:1080px){.stats{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.stats{grid-template-columns:1fr}}
```

- [ ] **Step 2: 在 main.js 渲染總覽區塊**

加入 import：

```js
import { computeStats } from './overview.js';
import { DAY_COLORS } from './map.js';
```

在 `mapApi`／`timeline` 建立之後（`timeline.select(null);` 之前）加入：

```js
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
```

- [ ] **Step 3: 以瀏覽器驗證**

```bash
agent-browser open "http://localhost:8777/"
agent-browser eval "document.querySelectorAll('.stat').length"
```
Expected: `4`

```bash
agent-browser eval "document.querySelector('.daykey').children.length"
```
Expected: 等於已規劃天數（目前為 7）

- [ ] **Step 4: Commit**

```bash
git add index.html src/main.js
git commit -m "feat: render trip-wide stat band and day color legend"
```

---

### Task 10: 五座城市區塊

**Files:**
- Modify: `index.html`（加入 `.cities-grid` CSS）
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/cities.js` 的 `buildCities`

**設計說明**：`buildCities` 只給城市名、天數索引、造訪過的地點名——沒有介紹文案與代表照片，那是編輯性內容。文案沿用已呈現給使用者的 `_mockup.html` 草稿（design.md 的 Open Questions 已記錄「五座城市的介紹文案為暫擬，需使用者確認」），寫死在 `main.js` 的 `CITY_COPY`，供之後使用者直接修改文字即可、不需碰渲染邏輯。

- [ ] **Step 1: 加入 CSS**

```css
.cities-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px}
.city{background:var(--paper);border:1px solid var(--line);border-radius:20px;overflow:hidden;
  box-shadow:0 1px 1px rgba(43,39,33,.03),0 20px 34px -32px rgba(43,39,33,.6);
  transition:transform .25s;display:flex;flex-direction:column}
.city:hover{transform:translateY(-3px)}
.city .ph{aspect-ratio:4/3;background:#f4ece0;position:relative;overflow:hidden}
.city .ph img{width:100%;height:100%;object-fit:cover;display:block}
.city .ph .idx{position:absolute;top:12px;left:12px;background:rgba(255,254,251,.93);
  border-radius:99px;padding:4px 11px;font-size:10px;letter-spacing:.14em;font-weight:500}
.city .bd{padding:17px 19px 20px;display:flex;flex-direction:column;gap:8px;flex:1}
.city h3{font-size:18px;font-weight:700;letter-spacing:.04em;margin:0}
.city h3 span{font-size:10.5px;font-weight:500;color:var(--ink-3);letter-spacing:.1em;margin-left:8px}
.city p{font-size:12px;line-height:1.85;color:var(--ink-2);margin:0}
.city .spots{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:6px}
.city .spots b{font-size:10px;font-weight:400;color:var(--ink-2);background:#f7f1e4;
  border-radius:99px;padding:4px 9px;letter-spacing:.02em}
```

- [ ] **Step 2: 在 main.js 加入城市文案與渲染**

加入 import：

```js
import { buildCities } from './cities.js';
```

在總覽區塊渲染之後加入：

```js
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
```

- [ ] **Step 3: 以瀏覽器驗證**

```bash
agent-browser eval "document.querySelectorAll('.city').length"
```
Expected: `5`

```bash
agent-browser eval "document.getElementById('herocities').textContent"
```
Expected: `旭川　小樽　洞爺　函館　札幌`

- [ ] **Step 4: Commit**

```bash
git add index.html src/main.js
git commit -m "feat: render five-city section with stay-day ranges"
```

---

### Task 11: 吃什麼區塊

**Files:**
- Modify: `index.html`（加入 `.ramen`／`.eats` CSS）
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/dining.js` 的 `parseDining`、`ramenTrio`

- [ ] **Step 1: 加入 CSS**

```css
.ramen{background:var(--paper);border:1px solid var(--line);border-radius:22px;padding:28px 30px;margin-bottom:26px;
  box-shadow:0 1px 1px rgba(43,39,33,.03),0 26px 46px -34px rgba(43,39,33,.5)}
.ramen .rh{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.ramen .rh h3{font-size:20px;font-weight:700;letter-spacing:.06em;margin:0}
.ramen .rh em{font-style:normal;font-size:11px;letter-spacing:.12em;color:var(--drive);font-weight:500}
.trio{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px}
.rcard{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff}
.rcard .ph{aspect-ratio:16/10;background:#f4ece0}
.rcard .ph img{width:100%;height:100%;object-fit:cover;display:block}
.rcard .bd{padding:14px 16px 17px}
.rcard .ty{display:inline-block;background:var(--drive);color:#fff;border-radius:99px;
  padding:3px 11px;font-size:10.5px;letter-spacing:.08em;font-weight:500;margin-bottom:8px}
.rcard h4{font-family:"Zen Maru Gothic";font-size:15px;font-weight:700;letter-spacing:.02em;margin:0 0 4px}
.rcard .mt{font-size:10px;letter-spacing:.08em;color:var(--ink-3)}
.eats{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.eat{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden;
  box-shadow:0 1px 1px rgba(43,39,33,.03),0 16px 28px -28px rgba(43,39,33,.6)}
.eat .ph{aspect-ratio:4/3;background:#f4ece0}
.eat .ph img{width:100%;height:100%;object-fit:cover;display:block}
.eat .bd{padding:12px 14px 15px}
.eat .tg{font-size:9.5px;letter-spacing:.12em;color:var(--jr);font-weight:500}
.eat h4{font-family:"Zen Maru Gothic";font-size:13.5px;font-weight:700;margin:5px 0 3px;letter-spacing:.02em}
.eat .mt{font-size:10px;color:var(--ink-3);letter-spacing:.05em;line-height:1.6}
.eat .rz{font-size:9.5px;letter-spacing:.08em;font-weight:500;margin-top:5px}
.eat .rz.yes{color:#0d7a58}
.eat .rz.no{color:#c2451c}
```

- [ ] **Step 2: 在 main.js 渲染**

加入 import：

```js
import { parseDining, ramenTrio } from './dining.js';
```

加入渲染邏輯：

```js
  const dishes = parseDining(tabs.dining.ok ? tabs.dining.rows : []);
  const trio = ramenTrio(dishes, resolve);
  const trioNames = new Set(trio.map(t => t.name));

  document.getElementById('ramenblock').innerHTML = trio.length ? `
    <div class="ramen">
      <div class="rh"><h3>北海道拉麵三大天王</h3><em>${trio.length}/3</em></div>
      <div class="trio">${trio.map(t => `
        <div class="rcard">
          <div class="ph">${t.photo ? `<img src="${t.photo}" alt="${t.name}">` : ''}</div>
          <div class="bd"><span class="ty">${t.flavor}</span><h4>${t.name}</h4>
            <div class="mt">${t.city}　${t.date.slice(5).replace('-', '/')} ${t.meal}</div></div>
        </div>`).join('')}
      </div>
    </div>` : '';

  document.getElementById('eatsgrid').innerHTML = dishes
    .filter(d => d.name && !trioNames.has(d.name))
    .map(d => {
      const photo = resolve(d.name)?.photo;
      const rz = d.reserved === null ? '' :
        `<div class="rz ${d.reserved ? 'yes' : 'no'}">${d.reserved ? '已訂位' : '未訂位'}</div>`;
      return `<article class="eat">
        <div class="ph">${photo ? `<img src="${photo}" alt="${d.name}">` : ''}</div>
        <div class="bd">
          <div class="tg">${d.date.slice(5).replace('-', '/')} · ${d.meal}</div>
          <h4>${d.name || '待定'}</h4>
          <div class="mt">${d.city}　${d.note}</div>
          ${rz}
        </div>
      </article>`;
    }).join('');
```

- [ ] **Step 3: 以瀏覽器驗證**

```bash
agent-browser eval "JSON.stringify({trio: document.querySelectorAll('.rcard').length, eats: document.querySelectorAll('.eat').length})"
```
Expected: `trio` 為 0–3（視試算表當下資料是否三種流派齊全），`eats` 大於 0

- [ ] **Step 4: Commit**

```bash
git add index.html src/main.js
git commit -m "feat: render dining section with ramen trio spotlight"
```

---

### Task 12: 住哪裡區塊

**Files:**
- Modify: `index.html`（加入 `.stays` CSS）
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/lodging.js` 的 `buildLodging`

- [ ] **Step 1: 加入 CSS**

```css
.stays{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:20px}
.stay{background:var(--paper);border:1px solid var(--line);border-radius:20px;overflow:hidden;
  display:flex;flex-direction:column;box-shadow:0 1px 1px rgba(43,39,33,.03),0 20px 34px -32px rgba(43,39,33,.6);
  transition:transform .25s}
.stay:hover{transform:translateY(-3px)}
.stay .ph{aspect-ratio:16/10;background:#f4ece0;position:relative;overflow:hidden}
.stay .ph img{width:100%;height:100%;object-fit:cover;display:block}
.stay .ph .nights{position:absolute;top:11px;left:11px;background:var(--stay);color:#fff;
  border-radius:99px;padding:4px 11px;font-size:10px;letter-spacing:.1em;font-weight:500}
.stay .bd{padding:15px 17px 19px;display:flex;flex-direction:column;gap:7px;flex:1}
.stay .ct{font-size:10px;letter-spacing:.14em;color:var(--ink-3)}
.stay h3{font-size:15px;font-weight:700;letter-spacing:.02em;margin:0;line-height:1.4}
.stay .dt{font-size:11px;color:var(--ink-2);letter-spacing:.05em;font-variant-numeric:tabular-nums}
.stay .ft{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:10px;
  border-top:1px dashed rgba(43,39,33,.16)}
.stay .price{font-family:"Zen Maru Gothic";font-weight:700;font-size:16px}
.stay .price.todo{font-size:11.5px;font-weight:500;color:var(--ink-3);font-family:"Noto Sans TC"}
.badge{font-size:9.5px;letter-spacing:.08em;font-weight:500;border-radius:99px;padding:4px 9px}
.badge.ok{background:#e3f6ee;color:#0d7a58}
.badge.no{background:#fdece5;color:#c2451c}
.stay .memo{font-size:10px;color:var(--ink-3);letter-spacing:.04em}
```

- [ ] **Step 2: 在 main.js 渲染**

加入 import：

```js
import { buildLodging } from './lodging.js';
```

加入渲染邏輯：

```js
  const nt = n => 'NT$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const stays = buildLodging({
    lodgingRows: tabs.lodging.ok ? tabs.lodging.rows : [],
    todoRows: tabs.todo.ok ? tabs.todo.rows : [],
    tripStart: TRIP_START, tripEnd: TRIP_END,
  });
  document.getElementById('staysgrid').innerHTML = stays.map(s => {
    const photo = resolve(s.name)?.photo;
    const dt = s.checkinIso && s.checkoutIso
      ? `${s.checkinIso.slice(5).replace('-', '/')} — ${s.checkoutIso.slice(5).replace('-', '/')}`
      : '日期待補';
    return `<article class="stay">
      <div class="ph">${photo ? `<img src="${photo}" alt="${s.name}">` : ''}
        ${s.nights != null ? `<span class="nights">${s.nights} 晚</span>` : ''}</div>
      <div class="bd">
        <div class="ct">${s.city}</div>
        <h3>${s.name}</h3>
        <div class="dt">${dt}</div>
        <div class="memo">${s.memo}</div>
        <div class="ft">
          <div class="price${s.ntd ? '' : ' todo'}">${s.ntd ? nt(s.ntd) : '費用待補'}</div>
          <span class="badge ${s.booked ? 'ok' : 'no'}">${s.booked ? '已訂房' : '未訂房'}</span>
        </div>
      </div>
    </article>`;
  }).join('');
```

- [ ] **Step 3: 以瀏覽器驗證**

```bash
agent-browser eval "document.querySelectorAll('.stay').length"
```
Expected: 目前應為 `5`

```bash
agent-browser eval "[...document.querySelectorAll('.stay .badge')].every(b=>b.textContent==='已訂房')"
```
Expected: `true`（試算表目前所有住宿的待辦清單皆已勾選完成）

- [ ] **Step 4: Commit**

```bash
git add index.html src/main.js
git commit -m "feat: render lodging section with cross-tab gap filling"
```

---

### Task 13: 花多少區塊

**Files:**
- Modify: `index.html`（加入 `.costtop`／`.panel`／`.cat`／`.citem` CSS）
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/budget.js` 的 `summarizeBudget`；`RATE`（`config.js`）

- [ ] **Step 1: 加入 CSS**

```css
.costtop{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);
  border:1px solid var(--line);border-radius:18px;overflow:hidden;margin-bottom:20px}
.costtop .stat .v{font-size:28px}
.rate{display:inline-flex;align-items:center;gap:8px;background:var(--paper);border:1.5px solid var(--line);
  border-radius:99px;padding:6px 14px;font-size:11px;letter-spacing:.05em;color:var(--ink-2);margin-bottom:18px}
.rate b{font-weight:500;color:var(--ink);font-variant-numeric:tabular-nums}
.costgrid{display:grid;grid-template-columns:1fr 1.25fr;gap:20px;align-items:start}
.panel{background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:22px 24px;
  box-shadow:0 1px 1px rgba(43,39,33,.03),0 20px 34px -32px rgba(43,39,33,.6)}
.panel h3{font-size:13px;font-weight:700;letter-spacing:.08em;margin:0 0 16px;color:var(--ink-2)}
.cat{margin-bottom:15px}
.cat .top{display:flex;justify-content:space-between;align-items:baseline;font-size:12px;margin-bottom:6px}
.cat .top b{font-weight:500;letter-spacing:.06em}
.cat .top span{font-family:"Zen Maru Gothic";font-weight:700;font-size:13.5px;font-variant-numeric:tabular-nums}
.bar{height:6px;border-radius:99px;background:#f0e8da;overflow:hidden}
.bar i{display:block;height:100%;border-radius:99px}
.citem{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:baseline;
  padding:10px 0;border-bottom:1px dashed rgba(43,39,33,.13)}
.citem:last-child{border-bottom:0}
.citem .nm{font-size:12px;letter-spacing:.02em}
.citem .nm i{font-style:normal;display:block;font-size:9.5px;color:var(--ink-3);letter-spacing:.08em;margin-top:2px}
.citem .amt{font-family:"Zen Maru Gothic";font-weight:700;font-size:13.5px;white-space:nowrap}
.citem .amt em{font-style:normal;font-size:10px;color:var(--ink-3);font-weight:500;display:block;
  font-family:"Noto Sans TC"}
.citem.blank .nm{color:var(--ink-3)}
.citem.blank .amt{font-size:10.5px;font-weight:400;color:var(--ink-3);font-family:"Noto Sans TC"}
@media(max-width:1080px){.costgrid{grid-template-columns:1fr}}
@media(max-width:820px){.costtop{grid-template-columns:1fr}}
```

- [ ] **Step 2: 在 main.js 渲染**

加入 import：

```js
import { summarizeBudget } from './budget.js';
import { RATE } from '../config.js';
```

（`TRIP_START, TRIP_END` 已有的 import 行加上 `RATE` 即可，或另起一行 import。）加入渲染邏輯：

```js
  const CAT_COLOR = { 交通: '#0e7ad4', 住宿: '#7a5cc4', 餐飲: '#f4622e', 生活: '#12a97a' };
  const budget = summarizeBudget(tabs.budget.ok ? tabs.budget.rows : [], RATE);
  const jp = n => '¥' + n.toLocaleString('en-US');

  document.getElementById('costblock').innerHTML = `
    <div class="rate">匯率　<b>¥1 = NT$${RATE}</b></div>
    <div class="costtop">
      <div class="stat"><div class="v">${nt(Math.round(budget.totalTwd))}</div><div class="k">已登錄總額（台幣）</div></div>
      <div class="stat"><div class="v">${budget.filledCount}<small> / ${budget.totalCount} 項</small></div><div class="k">已填金額項數</div></div>
    </div>
    <div class="costgrid">
      <div class="panel"><h3>分類佔比</h3>
        ${budget.categoryTotals.sort((a, b) => (b.twd ?? 0) - (a.twd ?? 0)).map(c => `
          <div class="cat">
            <div class="top"><b>${c.category}</b><span>${c.twd != null ? nt(Math.round(c.twd)) : '待補'}</span></div>
            <div class="bar"><i style="width:${budget.totalTwd && c.twd ? (c.twd / budget.totalTwd * 100) : 0}%;
              background:${CAT_COLOR[c.category] || '#a89c8c'}"></i></div>
          </div>`).join('')}
      </div>
      <div class="panel"><h3>明細</h3>
        ${budget.items.map(it => `
          <div class="citem${it.filled ? '' : ' blank'}">
            <div class="nm">${it.name}<i>${it.category} · ${it.subcategory}</i></div>
            <div class="amt">${it.filled ? nt(Math.round(it.twd)) + (it.jpy ? `<em>${jp(it.jpy)}</em>` : '') : '待補'}</div>
          </div>`).join('')}
      </div>
    </div>`;
```

- [ ] **Step 3: 以瀏覽器驗證**

```bash
agent-browser eval "JSON.stringify({cats: document.querySelectorAll('.cat').length, items: document.querySelectorAll('.citem').length})"
```
Expected: `cats` 等於分類1 的相異數（目前 4：交通／住宿／餐飲／生活），`items` 等於費用列數

- [ ] **Step 4: Commit**

```bash
git add index.html src/main.js
git commit -m "feat: render budget section with dual-currency conversion"
```

---

### Task 14: 行前準備區塊

**Files:**
- Modify: `index.html`（加入 `.prep`／`.ring`／`.task` CSS）
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/prep.js` 的 `summarizePrep`

- [ ] **Step 1: 加入 CSS**

```css
.prep{display:grid;grid-template-columns:230px 1fr;gap:22px;align-items:start}
.ring{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
  background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:30px 18px;
  box-shadow:0 1px 1px rgba(43,39,33,.03),0 20px 34px -32px rgba(43,39,33,.6)}
.ring .pct{font-family:"Zen Maru Gothic";font-weight:700;font-size:42px;line-height:1}
.ring .sub{font-size:10.5px;letter-spacing:.12em;color:var(--ink-3)}
.tasks{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.task{display:flex;align-items:flex-start;gap:10px;background:var(--paper);border:1px solid var(--line);
  border-radius:13px;padding:12px 14px}
.task .mk{width:16px;height:16px;border-radius:50%;flex-shrink:0;margin-top:1px;display:grid;place-items:center;
  font-size:9.5px;color:#fff;font-weight:700}
.task.done .mk{background:#12a97a}
.task.open .mk{background:transparent;border:1.5px solid #d8cdb9}
.task .tx{font-size:11.5px;line-height:1.5;letter-spacing:.02em}
.task .tx i{font-style:normal;display:block;font-size:9.5px;color:var(--ink-3);letter-spacing:.08em;margin-top:3px}
.task.done .tx{color:var(--ink-3)}
@media(max-width:1080px){.prep{grid-template-columns:1fr}}
```

- [ ] **Step 2: 在 main.js 渲染**

加入 import：

```js
import { summarizePrep } from './prep.js';
```

加入渲染邏輯：

```js
  const prep = summarizePrep(tabs.todo.ok ? tabs.todo.rows : []);
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
```

（待辦項目不綁定任何 click 事件——規格要求完成狀態完全來自試算表，網站不提供勾選互動。）

- [ ] **Step 3: 以瀏覽器驗證**

```bash
agent-browser eval "document.querySelector('.ring .pct').textContent"
```
Expected: 一個百分比字串，例如 `41%`

```bash
agent-browser eval "document.querySelectorAll('.task').length"
```
Expected: 等於待辦清單列數（目前 17）

```bash
agent-browser eval "document.querySelector('.task').click(); document.querySelector('.ring .pct').textContent"
```
Expected: 點擊前後百分比不變（無互動）

- [ ] **Step 4: 執行完整測試套件**

Run: `npm test`
Expected: PASS，全部測試綠燈

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.js
git commit -m "feat: render prep checklist section as read-only progress"
```

---

## 動畫子系統（Task 15–19）

以下五個 Task 實作「單日動畫播放」：交通工具沿實際路線移動、鏡頭跟隨、抵達彈出圖卡、下方卡片同步高亮。移植自 `design_handoff_hokkaido_trip/hokkaido-trip.html` 的 `trainIcon`/`carIcon`/`busIcon`/`walkIcon`（`:420-463`）、`smooth`/`curvePts`（`:507-526`）、`roadPath`（`:534-552`）、`applyHeading`（`:722-732`）、`render`（`:560-679`）。

**與原型的兩個刻意簡化（已記錄於階段一 design.md 的同類決策旁）：**

1. **不搬移原型的 `VIA` 硬編碼沿線車站折點表**——`VIA` 是用原型內部的英文短鍵（如 `chitose>sapporo`）對應固定折點座標，而本專案的地名簿以試算表的實際地點名為鍵、且試算表持續有新地點加入（如本次開發期間新增的 `Co-op Sapporo Suehiro-Nishi-ten`），沿用固定折點表無法涵蓋新地點、也無法隨試算表變動而更新。JR 路段改用兩點平滑插值（`smoothPath` 的 `lerpLine` 分支），視覺上是直線到略帶弧度的曲線，不是貼著鐵軌走，但不會斷裂或報錯。
2. **不做 Wikipedia 圖片後援**——openspec 的 `dining-guide`／`itinerary-map` 規格只要求 `places.json` 的 `photo` 欄位與缺照片時的佔位色，沒有要求外部圖片來源；原型的 `wikiPhoto` 是功能規格層級的構想，不在本次驗收範圍內。

### Task 15: 交通工具 SVG 圖示

**Files:**
- Create: `src/icons.js`
- Test: `tests/icons.test.js`

**Interfaces:**
- Consumes: 無
- Produces: `trainIcon(size)`, `carIcon(size)`, `busIcon(size)`, `walkIcon(size)`（皆回傳 SVG 字串）；`ICON: Record<'jr'|'drive'|'bus'|'walk'|'tram', (size:number)=>string>`

- [ ] **Step 1: 寫失敗的測試**

`tests/icons.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { trainIcon, carIcon, busIcon, walkIcon, ICON } from '../src/icons.js';

describe('icon generators', () => {
  it('每個圖示都回傳有效的 svg 字串', () => {
    for (const fn of [trainIcon, carIcon, busIcon, walkIcon]) {
      const svg = fn(40);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }
  });

  it('尺寸反映在 width/height 屬性上', () => {
    expect(trainIcon(40)).toMatch(/width="6\d(\.\d+)?"/);
  });
});

describe('ICON registry', () => {
  it('涵蓋五種交通模式，tram 與 walk 共用同一圖示', () => {
    expect(Object.keys(ICON).sort()).toEqual(['bus', 'drive', 'jr', 'tram', 'walk']);
    expect(ICON.tram).toBe(ICON.walk);
  });

  it('每個登記的產生器都是函式', () => {
    for (const fn of Object.values(ICON)) expect(typeof fn).toBe('function');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/icons.test.js`
Expected: FAIL，找不到 `../src/icons.js`

- [ ] **Step 3: 實作 src/icons.js**

由原型 `:418-463` 移植，函式內容原樣搬移（純繪圖用 SVG path，不含業務邏輯，不需改寫）：

```js
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
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/icons.test.js`
Expected: PASS，4 個測試全綠

- [ ] **Step 5: Commit**

```bash
git add src/icons.js tests/icons.test.js
git commit -m "feat: port vehicle SVG icon generators from the prototype"
```

---

### Task 16: 平滑曲線與方向數學

**Files:**
- Create: `src/curve.js`
- Create: `src/heading.js`
- Test: `tests/curve.test.js`
- Test: `tests/heading.test.js`

**Interfaces:**
- Consumes: 無（純數學，運作於一般 `{lat,lng}` 物件，不依賴 Leaflet 全域）
- Produces:
  - `lerpLine(a: {lat,lng}, b: {lat,lng}, steps=24): {lat,lng}[]`
  - `catmullRom(points: {lat,lng}[]): {lat,lng}[]`
  - `smoothPath(points: {lat,lng}[]): {lat,lng}[]` — 兩點用 `lerpLine`，三點以上用 `catmullRom`
  - `computeHeading(dx: number, dy: number, prevFlip: number): {angle:number, flip:number}`

- [ ] **Step 1: 寫失敗的測試**

`tests/curve.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { lerpLine, catmullRom, smoothPath } from '../src/curve.js';

describe('lerpLine', () => {
  it('起訖點正確', () => {
    const line = lerpLine({ lat: 0, lng: 0 }, { lat: 10, lng: 10 });
    expect(line[0]).toEqual({ lat: 0, lng: 0 });
    expect(line.at(-1)).toEqual({ lat: 10, lng: 10 });
  });

  it('中點在兩端連線上', () => {
    const line = lerpLine({ lat: 0, lng: 0 }, { lat: 10, lng: 0 }, 2);
    expect(line[1].lat).toBeCloseTo(5, 5);
  });
});

describe('catmullRom', () => {
  it('保留起訖點', () => {
    const pts = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 2, lng: 0 }];
    const out = catmullRom(pts);
    expect(out[0]).toEqual(pts[0]);
    expect(out.at(-1)).toEqual(pts.at(-1));
  });

  it('產生的點數多於輸入點數（有插值）', () => {
    const pts = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 2, lng: 0 }];
    expect(catmullRom(pts).length).toBeGreaterThan(pts.length);
  });
});

describe('smoothPath', () => {
  it('兩點時走直線插值', () => {
    const a = { lat: 0, lng: 0 }, b = { lat: 1, lng: 1 };
    expect(smoothPath([a, b])).toEqual(lerpLine(a, b));
  });

  it('三點以上時走 Catmull-Rom', () => {
    const pts = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 2, lng: 0 }];
    expect(smoothPath(pts)).toEqual(catmullRom(pts));
  });
});
```

`tests/heading.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { computeHeading } from '../src/heading.js';

describe('computeHeading', () => {
  it('水平右移時 flip 為 1', () => {
    const { flip } = computeHeading(10, 0, 1);
    expect(flip).toBe(1);
  });

  it('水平左移時 flip 為 -1', () => {
    const { flip } = computeHeading(-10, 0, 1);
    expect(flip).toBe(-1);
  });

  it('位移不明顯（小於 4px）時沿用先前的 flip', () => {
    const { flip } = computeHeading(1, 5, -1);
    expect(flip).toBe(-1);
  });

  it('俯仰角限制在 ±20 度之間', () => {
    const { angle } = computeHeading(1, 100, 1);
    expect(Math.abs(angle)).toBeLessThanOrEqual(20);
  });

  it('位移過小（小於 0.6）時角度為 0、flip 不變', () => {
    expect(computeHeading(0.1, 0.1, 1)).toEqual({ angle: 0, flip: 1 });
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/curve.test.js tests/heading.test.js`
Expected: FAIL，找不到 `../src/curve.js`、`../src/heading.js`

- [ ] **Step 3: 實作 src/curve.js**

由原型 `:507-526` 的 `smooth()`/`curvePts()` 改寫為不依賴 Leaflet 全域的純函式版本：

```js
export function lerpLine(a, b, steps = 24) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
  }
  return out;
}

/** Catmull-Rom 平滑：讓折線貼近實際路線又不生硬。 */
export function catmullRom(points) {
  const p4 = [points[0], ...points, points.at(-1)];
  const out = [];
  for (let i = 1; i < p4.length - 2; i++) {
    const p0 = p4[i - 1], p1 = p4[i], p2 = p4[i + 1], p3 = p4[i + 2];
    for (let j = 0; j < 16; j++) {
      const t = j / 16, t2 = t * t, t3 = t2 * t;
      out.push({
        lat: 0.5 * ((2 * p1.lat) + (-p0.lat + p2.lat) * t + (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 + (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3),
        lng: 0.5 * ((2 * p1.lng) + (-p0.lng + p2.lng) * t + (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * t2 + (-p0.lng + 3 * p1.lng - 3 * p2.lng + p3.lng) * t3),
      });
    }
  }
  out.push(points.at(-1));
  return out;
}

export function smoothPath(points) {
  return points.length === 2 ? lerpLine(points[0], points[1]) : catmullRom(points);
}
```

- [ ] **Step 4: 實作 src/heading.js**

由原型 `:722-732` 的 `applyHeading()` 拆出純數學部分（原函式混雜了 DOM 操作，這裡只保留角度計算，DOM 套用留給 Task 18 的動畫整合）：

```js
/**
 * 計算載具圖示的俯仰角與左右翻面。
 * 只有明顯的左右移動（|dx|>4）才改變翻面方向，避免垂直移動時抖動翻面。
 */
export function computeHeading(dx, dy, prevFlip) {
  const len = Math.hypot(dx, dy);
  if (len < 0.6) return { angle: 0, flip: prevFlip };
  const flip = Math.abs(dx) > 4 ? (dx < 0 ? -1 : 1) : prevFlip;
  let angle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI);
  angle = Math.max(-20, Math.min(20, angle)) * (flip < 0 ? -1 : 1);
  return { angle, flip };
}
```

- [ ] **Step 5: 執行測試確認通過**

Run: `npm test -- tests/curve.test.js tests/heading.test.js`
Expected: PASS，7 + 5 個測試全綠

- [ ] **Step 6: Commit**

```bash
git add src/curve.js src/heading.js tests/curve.test.js tests/heading.test.js
git commit -m "feat: add curve smoothing and heading math as pure functions"
```

---

### Task 17: 道路路徑抓取

**Files:**
- Create: `src/roads.js`
- Test: `tests/roads.test.js`

**Interfaces:**
- Consumes: `src/curve.js` 的 `smoothPath`
- Produces: `makeRoadFetcher({fetchFn, maxConcurrent=3}): { fetchRoad(mode: string, from: {lat,lng}, to: {lat,lng}): Promise<{lat,lng}[]|null> }`

**設計說明**：`mode==='jr'` 一律回傳 `null`（呼叫端據此改用 `smoothPath` 退路），不打 OSRM——符合規格「僅自駕／巴士／步行／市電使用 OSRM」。失敗或逾時同樣回傳 `null`，由呼叫端（Task 18）決定要不要退回 `smoothPath`；`roads.js` 本身不做退路繪製，保持單一職責。

- [ ] **Step 1: 寫失敗的測試**

`tests/roads.test.js`：

```js
import { describe, it, expect, vi } from 'vitest';
import { makeRoadFetcher } from '../src/roads.js';

const okResponse = coords => ({
  ok: true,
  json: async () => ({ routes: [{ geometry: { coordinates: coords } }] }),
});

describe('makeRoadFetcher', () => {
  it('jr 模式一律不呼叫 OSRM，直接回傳 null', async () => {
    const fetchFn = vi.fn();
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    const result = await fetchRoad('jr', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 });
    expect(result).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('drive 模式使用 driving 路線並轉為 {lat,lng}', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse([[141, 43], [141.1, 43.1]]));
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    const result = await fetchRoad('drive', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 });
    expect(result).toEqual([{ lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 }]);
    expect(fetchFn.mock.calls[0][0]).toContain('/driving/');
  });

  it('walk 模式使用 foot 路線', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse([[141, 43], [141.1, 43.1]]));
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    await fetchRoad('walk', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 });
    expect(fetchFn.mock.calls[0][0]).toContain('/foot/');
  });

  it('bus 與 tram 沿用 driving／foot', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse([[141, 43], [141.1, 43.1]]));
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    await fetchRoad('bus', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 });
    await fetchRoad('tram', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 });
    expect(fetchFn.mock.calls[0][0]).toContain('/driving/');
    expect(fetchFn.mock.calls[1][0]).toContain('/foot/');
  });

  it('HTTP 失敗時回傳 null', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false });
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    expect(await fetchRoad('drive', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 })).toBeNull();
  });

  it('網路例外時回傳 null 而不拋出', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'));
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    expect(await fetchRoad('drive', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 })).toBeNull();
  });

  it('回應缺少路線資料時回傳 null', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ routes: [] }) });
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    expect(await fetchRoad('drive', { lat: 43, lng: 141 }, { lat: 43.1, lng: 141.1 })).toBeNull();
  });

  it('相同請求會快取，第二次不重新呼叫', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse([[141, 43], [141.1, 43.1]]));
    const { fetchRoad } = makeRoadFetcher({ fetchFn });
    const from = { lat: 43, lng: 141 }, to = { lat: 43.1, lng: 141.1 };
    await fetchRoad('drive', from, to);
    await fetchRoad('drive', from, to);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('同時最多 maxConcurrent 個請求在飛行中', async () => {
    let inFlight = 0, maxInFlight = 0;
    const fetchFn = vi.fn().mockImplementation(async () => {
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      await new Promise(r => setTimeout(r, 10));
      inFlight--;
      return okResponse([[141, 43], [141.1, 43.1]]);
    });
    const { fetchRoad } = makeRoadFetcher({ fetchFn, maxConcurrent: 2 });
    await Promise.all([0, 1, 2, 3, 4].map(i =>
      fetchRoad('drive', { lat: 43 + i, lng: 141 }, { lat: 43.1 + i, lng: 141.1 })));
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/roads.test.js`
Expected: FAIL，找不到 `../src/roads.js`

- [ ] **Step 3: 實作 src/roads.js**

```js
const PROFILE = { drive: 'driving', bus: 'driving', walk: 'foot', tram: 'foot' };

/** OSRM demo 道路路徑抓取。jr 不路由；失敗一律回傳 null，退路交給呼叫端決定。 */
export function makeRoadFetcher({ fetchFn = fetch, maxConcurrent = 3 } = {}) {
  const cache = new Map();
  let active = 0;
  const queue = [];

  function acquire() {
    return new Promise(resolve => {
      const run = () => { active++; resolve(() => { active--; const next = queue.shift(); if (next) next(); }); };
      if (active < maxConcurrent) run(); else queue.push(run);
    });
  }

  async function request(profile, from, to) {
    const coords = `${from.lng.toFixed(5)},${from.lat.toFixed(5)};${to.lng.toFixed(5)},${to.lat.toFixed(5)}`;
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;
    const res = await fetchFn(url);
    if (!res.ok) return null;
    const data = await res.json();
    const coordinates = data.routes?.[0]?.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) return null;
    return coordinates.map(([lng, lat]) => ({ lat, lng }));
  }

  return {
    async fetchRoad(mode, from, to) {
      if (mode === 'jr') return null;
      const profile = PROFILE[mode] || 'driving';
      const key = `${profile}:${from.lat},${from.lng}:${to.lat},${to.lng}`;
      if (cache.has(key)) return cache.get(key);

      const release = await acquire();
      try {
        const line = await request(profile, from, to).catch(() => null);
        cache.set(key, line);
        return line;
      } finally {
        release();
      }
    },
  };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/roads.test.js`
Expected: PASS，9 個測試全綠

- [ ] **Step 5: Commit**

```bash
git add src/roads.js tests/roads.test.js
git commit -m "feat: fetch OSRM road paths with concurrency limit and cache"
```

---

### Task 18: 單日動畫播放

**Files:**
- Modify: `src/map.js`（新增 `playDay`，回傳 `Promise<void>`；`showAll`／`showDay` 加入播放中止邏輯）
- Modify: `src/cards.js`（`renderCards` 加上 `data-index`；`startAutoplay` 改由動畫完成驅動，不再用固定間隔）
- Modify: `src/timeline.js`（`select()` 回傳 `onSelect()` 的回傳值，讓呼叫端能 `await`）
- Modify: `src/main.js`（`onSelect` 串接 `playDay`，回傳其 Promise）
- Modify: `index.html`（加入載具、轉車節點、抵達圖卡的 CSS）

**Interfaces:**
- Consumes: `src/icons.js` 的 `ICON`；`src/curve.js` 的 `smoothPath`；`src/heading.js` 的 `computeHeading`；`src/roads.js` 的 `makeRoadFetcher`
- Produces: `mapApi.playDay(index: number, {onArrive?: (spotIndex:number)=>void}): Promise<void>`

**為什麼要動 `cards.js` 的 `startAutoplay` 與 `timeline.js` 的 `select`**：階段一的自動連播用固定 2.6 秒的計時器切換日期（那時每天是靜態渲染，切換是瞬間完成的）。現在每天的動畫本身可能長達數十秒（每段路程 3.2–9 秒＋抵達停留 5.4 秒），固定 2.6 秒會在動畫播到一半時就被切斷。改為「等這天動畫真正播完才排程下一天」，因此 `timeline.select()` 需要把 `onSelect()`（會呼叫 `playDay` 並回傳其 Promise）的回傳值往外傳，讓 `startAutoplay` 可以 `await`。

- [ ] **Step 1: 加入動畫相關 CSS**

於 `index.html` 的 `<style>` 內加入：

```css
.veh{width:80px;height:52px;margin:-26px 0 0 -40px;pointer-events:none}
.veh .core{filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 2px #fff) drop-shadow(0 3px 5px rgba(43,39,33,.35));
  transition:transform .5s cubic-bezier(.4,0,.2,1)}
.xfer{width:12px;height:12px;border-radius:50%;background:#fdfaf4;border:2px solid #5c5348}
.spotpop{width:180px;background:var(--paper);border:1px solid var(--line);border-radius:14px;overflow:hidden;
  box-shadow:0 18px 34px -22px rgba(43,39,33,.9);opacity:0;transform:translateY(8px) scale(.94);
  animation:pop .28s cubic-bezier(.2,.9,.3,1.2) forwards}
.spotpop.out{animation:popout .24s ease forwards}
@keyframes pop{to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes popout{to{opacity:0;transform:translateY(-4px) scale(.97)}}
.spotpop .ph{height:96px;background-size:cover;background-position:center}
.spotpop .tx{padding:9px 11px 11px}
.spotpop .tx b{display:block;font-family:"Zen Maru Gothic";font-weight:700;font-size:12.5px}
.spotpop .tx span{font-size:10.5px;color:var(--ink-3)}
.card.active{border-color:var(--jr);box-shadow:0 0 0 2px #dcefff,0 20px 34px -26px rgba(43,39,33,.6)}
```

- [ ] **Step 2: 在 cards.js 讓卡片可被索引定位**

修改 `renderCards`，在 `<article>` 上加上 `data-index`：

```js
/** 渲染當日景點卡片。地點為空者以「待定」呈現，不隱藏。 */
export function renderCards(el, { day, resolve }) {
  el.innerHTML = day.spots.map((s, i) => {
    const p = s.name ? resolve(s.name) : null;
    const img = p?.photo
      ? `<img src="${p.photo}" alt="${s.name}" loading="lazy">`
      : '';
    const desc = p?.desc || s.activity || '';
    return `<article class="card${s.pending ? ' pending' : ''}" data-index="${i}">
      <div class="img">${img}</div>
      <div class="body">
        <span class="tag${s.stay ? ' stay' : ''}">${i + 1} · ${s.time}</span>
        <h3>${s.name || '待定'}</h3>
        <div class="kana">${s.activity}</div>
        <p>${desc}</p>
      </div>
    </article>`;
  }).join('');
}

/** 把第 index 張卡片標記為 active，其餘清除。index 為 null 時只清除。 */
export function highlightCard(el, index) {
  el.querySelectorAll('.card.active').forEach(c => c.classList.remove('active'));
  if (index == null) return;
  el.querySelector(`.card[data-index="${index}"]`)?.classList.add('active');
}
```

`startAutoplay` 整段改為由動畫完成驅動：

```js
/**
 * 自動連播：「全程」停留 allDwellMs 後進 Day 1；每天動畫播完（由 timeline.select()
 * 回傳的 Promise resolve）才排程下一天，播完全部回到「全程」。
 * 固定間隔在階段一（靜態渲染）是對的，但單日動畫可能長達數十秒，
 * 必須等真正播完才切換，否則會在動畫播到一半時被切斷。
 */
export function startAutoplay({ days, timeline, allDwellMs = 2600, dayGapMs = 2600 }) {
  let stopped = false;
  let timer = null;

  function stop() {
    stopped = true;
    clearTimeout(timer);
  }

  function scheduleAll() {
    timeline.select(null);
    timer = setTimeout(() => { if (!stopped) playDay(0); }, allDwellMs);
  }

  async function playDay(i) {
    if (stopped) return;
    if (i >= days.length) return scheduleAll();
    await timeline.select(i);
    if (stopped) return;
    timer = setTimeout(() => playDay(i + 1), dayGapMs);
  }

  scheduleAll();
  return { stop };
}
```

- [ ] **Step 3: 讓 timeline.select() 回傳 onSelect() 的回傳值**

於 `src/timeline.js`，把：

```js
  function select(index) {
    rows.forEach(r => r.el.classList.toggle('on', r.index === index));
    onSelect(index);
  }
```

改為：

```js
  function select(index) {
    rows.forEach(r => r.el.classList.toggle('on', r.index === index));
    return onSelect(index);
  }
```

- [ ] **Step 4: 在 map.js 加入 playDay**

`createMap` 的第二個參數原本解構為 `{ days, resolve }`，`resolve` 這個名字在 `playDay` 內部會跟 Promise 建構子的 `resolve`（動畫完成訊號）撞名，容易搞混。這一步先把它改名為 `resolvePlace`，全檔案統一使用。

於 `src/map.js` 檔案頂端加入 import：

```js
import { ICON } from './icons.js';
import { smoothPath } from './curve.js';
import { computeHeading } from './heading.js';
import { makeRoadFetcher } from './roads.js';
```

把函式簽名與既有的 `legCoords` 改為使用 `resolvePlace`：

```js
export function createMap(el, { days, resolve: resolvePlace }) {
```

```js
  function legCoords(day, leg) {
    const a = resolvePlace(day.spots[leg.fromIndex].name);
    const b = resolvePlace(day.spots[leg.toIndex].name);
    return a && b ? [latLng(a), latLng(b)] : null;
  }
```

`showAll`、`showDay` 內原本呼叫 `resolve(...)` 查座標的地方，一併改成 `resolvePlace(...)`。

把 `layers` 物件擴充為包含動畫用的圖層：

```js
  const layers = {
    route: L.layerGroup().addTo(map),
    pins: L.layerGroup().addTo(map),
    veh: L.layerGroup().addTo(map),
    card: L.layerGroup().addTo(map),
  };
```

`clear()` 函式一併清掉新圖層：

```js
  function clear() {
    layers.route.clearLayers();
    layers.pins.clearLayers();
    layers.veh.clearLayers();
    layers.card.clearLayers();
  }
```

在 `layers` 定義之後加入播放狀態與中止函式：

```js
  const roadFetcher = makeRoadFetcher();
  let playToken = 0;

  function stopPlayback() {
    playToken += 1;
  }
```

在 `showAll` 與 `showDay` 函式的第一行都加入 `stopPlayback();`（先於 `clear()` 執行）：

```js
  function showAll() {
    stopPlayback();
    clear();
    // ...（其餘不變）
```

```js
  function showDay(index) {
    stopPlayback();
    clear();
    // ...（其餘不變）
```

在 `showDay` 函式之後、`return { showAll, showDay };` 之前，加入完整的 `playDay`：

```js
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
      const vehMarker = L.marker(latLng(legsWithCoords[0].from), {
        icon: vehIcon(legsWithCoords[0].leg.mode), interactive: false, zIndexOffset: -100,
      }).addTo(layers.veh);

      function applyHeadingToMarker(dx, dy) {
        const el = vehMarker.getElement()?.querySelector('.core');
        if (!el) return;
        const { angle, flip } = computeHeading(dx, dy, headFlip);
        headFlip = flip;
        el.style.transform = `rotate(${angle.toFixed(1)}deg) scaleX(${flip})`;
      }

      function showArrivalCard(spotIndex) {
        layers.card.clearLayers();
        const spot = day.spots[spotIndex];
        const place = resolvePlace(spot.name);
        const ll = latLng(place);
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

        const fromLL = latLng(from), toLL = latLng(to);
        const fromPt = map.latLngToContainerPoint(fromLL), toPt = map.latLngToContainerPoint(toLL);
        applyHeadingToMarker(toPt.x - fromPt.x, toPt.y - fromPt.y);

        const legDistM = fromLL.distanceTo(toLL);
        if (legDistM < 30) { await step(k + 1); return; }

        const roadLine = await roadFetcher.fetchRoad(leg.mode, from, to);
        if (myToken !== playToken) return;
        const points = (roadLine || smoothPath([from, to])).map(p => L.latLng(p.lat, p.lng));

        if (legDistM < 2600) {
          const mid = L.latLng((fromLL.lat + toLL.lat) / 2, (fromLL.lng + toLL.lng) / 2);
          map.flyTo(mid, legDistM < 900 ? 16 : 15, { duration: 0.9 });
        } else if (legDistM < 16000) {
          map.flyToBounds(L.latLngBounds([fromLL, toLL]), { padding: [90, 90], maxZoom: 13.5, duration: 1 });
        } else if (map.getZoom() > 12.2) {
          map.flyToBounds(L.latLngBounds(day.spots.map(s => {
            const p = resolvePlace(s.name); return p ? latLng(p) : null;
          }).filter(Boolean)), { padding: [70, 70], maxZoom: 12, duration: 1.1 });
        }

        await new Promise(r => setTimeout(r, 900));
        if (myToken !== playToken) return;

        const durationMs = Math.max(3200, Math.min(9000, legDistM / 16));
        const startedAt = performance.now();
        let lastPanAt = startedAt;

        await new Promise(r => {
          function tick(now) {
            if (myToken !== playToken) { r(); return; }
            const t = Math.min(1, (now - startedAt) / durationMs);
            const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const idx = Math.min(points.length - 1, Math.round(eased * (points.length - 1)));
            const here = points[idx];
            vehMarker.setLatLng(here);

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

        const arrivedSpotIndex = leg.toIndex;
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
```

最後把回傳值改為：

```js
  return { showAll, showDay, playDay, stopPlayback };
}
```

- [ ] **Step 5: main.js 串接 playDay 與卡片高亮**

加入 import：

```js
import { highlightCard } from './cards.js';
```

把 `timeline` 的 `onSelect` 改為：

```js
  const timeline = renderTimeline(document.getElementById('daylist'), {
    days, tripEnd: TRIP_END,
    onSelect: index => {
      if (index === null) {
        mapApi.showAll();
        cardsEl.innerHTML = '';
        return Promise.resolve();
      }
      mapApi.showDay(index);
      renderCards(cardsEl, { day: days[index], resolve });
      return mapApi.playDay(index, {
        onArrive: spotIndex => highlightCard(cardsEl, spotIndex),
      });
    },
  });
```

`autoplay = startAutoplay({ days, timeline });` 這行的參數簽名不變（`startAutoplay` 內部已改為呼叫 `timeline.select()` 並 `await` 其回傳值，main.js 不需要額外傳入 `mapApi`）。

- [ ] **Step 6: 執行完整測試套件**

Run: `npm test`
Expected: PASS，全部測試綠燈（本 Task 未新增測試檔——`playDay`／`stopPlayback` 是 Leaflet／DOM 密集的整合邏輯，如同既有的 `map.js` 其餘函式，以下一個 Task 的瀏覽器實測驗證）

- [ ] **Step 7: 以瀏覽器驗證單日動畫**

```bash
node tools/serve.js . 8777
```

另開終端：

```bash
agent-browser open "http://localhost:8777/"
agent-browser eval "[...document.querySelectorAll('.day')].find(d => d.textContent.includes('12/25')).click(); 'clicked'"
```

等待約 2 秒後檢查載具是否出現並移動：

```bash
agent-browser eval "document.querySelector('.veh') !== null"
```
Expected: `true`

- [ ] **Step 8: Commit**

```bash
git add src/map.js src/cards.js src/timeline.js src/main.js index.html
git commit -m "feat: play single-day vehicle animation with arrival cards"
```

---

### Task 19: 整合驗證與完整走查

**Files:**
- 無新檔案；本 Task 只做驗證，發現問題就地修正對應的既有檔案

**Interfaces:**
- Consumes: 全部

- [ ] **Step 1: 執行完整測試套件**

```bash
npm test
```
Expected: PASS，全部測試綠燈（累計應有 Task 1–17 新增的測試：dates +7、cities 8、overview 8、dining 8、lodging 9、budget 10、prep 5、countdown 3、icons 4、curve 7、heading 5、roads 9，共新增約 83 個測試，加上階段一的 69 個）

- [ ] **Step 2: 啟動開發伺服器，開頁驗證八個內容區塊都渲染**

```bash
node tools/serve.js . 8777
```

另開終端：

```bash
agent-browser open "http://localhost:8777/"
agent-browser eval "JSON.stringify({
  nav: document.querySelectorAll('nav a').length,
  cd: document.getElementById('cd').textContent,
  stats: document.querySelectorAll('.stat').length,
  cities: document.querySelectorAll('.city').length,
  eats: document.querySelectorAll('.eat').length,
  stays: document.querySelectorAll('.stay').length,
  citems: document.querySelectorAll('.citem').length,
  tasks: document.querySelectorAll('.task').length,
  maps: document.querySelectorAll('.leaflet-container').length
})"
```
Expected: `nav:7`、`cd` 為 `D-<正整數>`、`stats:4`、`cities:5`、`eats` 大於 0、`stays:5`、`citems` 等於費用列數、`tasks` 等於待辦列數、`maps:1`（全站仍只有一個地圖實體，動畫沒有另外開地圖）

- [ ] **Step 3: 驗證導覽列 scroll-spy**

```bash
agent-browser eval "document.getElementById('cost').scrollIntoView(); 'ok'"
agent-browser eval "new Promise(r => setTimeout(() => r(document.querySelector('nav a.on')?.getAttribute('href')), 500))"
```
Expected: `#cost`

- [ ] **Step 4: 驗證單日動畫完整跑一輪且卡片同步高亮**

```bash
agent-browser eval "[...document.querySelectorAll('.day')].find(d => d.textContent.includes('12/27')).click(); 'clicked'"
```

等待該日動畫抵達第一個有座標的景點（依路程遠近，通常數秒內）：

```bash
agent-browser eval "new Promise(r => setTimeout(() => r(document.querySelectorAll('.card.active').length), 6000))"
```
Expected: `1`（有且只有一張卡片被標記 active）

- [ ] **Step 5: 驗證切換日期會中止前一天的動畫（不留殘影）**

```bash
agent-browser eval "[...document.querySelectorAll('.day')].find(d => d.textContent.includes('12/28')).click(); 'ok'"
agent-browser eval "new Promise(r => setTimeout(() => r(document.querySelectorAll('.veh').length), 300))"
```
Expected: `1`（切換後場上只有一個載具圖示，不是兩個疊在一起）

- [ ] **Step 6: 驗證自動連播等動畫播完才切換日期**

```bash
agent-browser eval "window.location.reload(); 'reloading'"
```

重整後不點任何日期，等待超過原本階段一的 2.6 秒固定間隔（例如 4 秒），確認動畫還在播（因為單日動畫遠比 2.6 秒長，此刻應仍停留在 Day 1，尚未切到 Day 2）：

```bash
agent-browser eval "new Promise(r => setTimeout(() => r(document.querySelector('.day.on .dd')?.textContent), 4000))"
```
Expected: 含 `12/25` 的文字（Day 1 動畫通常需要數十秒，4 秒內不會自動跳到 Day 2）

- [ ] **Step 7: 驗證訂位代號等敏感欄位仍未外洩**

```bash
agent-browser eval "document.documentElement.outerHTML.includes('TCCR4K')"
```
Expected: `false`

- [ ] **Step 8: 響應式驗證**

```bash
agent-browser eval "window.resizeTo ? '' : ''; document.documentElement.style.width='375px'; 'ok'"
```

（若 `agent-browser` 支援視窗尺寸設定，改用其原生方式；核心檢查是手機寬度下 `#cards`、`.tasks`、`.trio` 是否變成單欄，且頁面沒有水平捲動：）

```bash
agent-browser eval "document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"
```
Expected: `true`

- [ ] **Step 9: 若發現任何驗證失敗，修正後回到 Step 1 重跑，直到全部通過**

- [ ] **Step 10: 提交收尾**

若前面步驟有就地修正，一併提交：

```bash
git add -A
git status --short
```

若有異動：

```bash
git commit -m "fix: address issues found in phase-two end-to-end verification"
```

若沒有異動（表示前面每個 Task 已各自提交乾淨），此步驟略過。

---

## 自我檢查結果

**規格覆蓋**——比對 `openspec/changes/build-hokkaido-trip-site/specs/`：

| 規格 | 涵蓋於 |
|---|---|
| `trip-overview` 封面與出發倒數 | Task 8 |
| `trip-overview` 全行程數字帶 | Task 9 |
| `trip-overview` 每日色彩圖例 | Task 9 |
| `trip-overview` 五座城市區塊 | Task 10 |
| `trip-overview` 城市分區對照 | Task 2 |
| `trip-overview` 停留天數排除轉車 | Task 2 |
| `dining-guide` 餐飲區塊 | Task 11 |
| `dining-guide` 訂位狀態 | Task 4、Task 11 |
| `dining-guide` 拉麵三大天王 | Task 4、Task 11 |
| `dining-guide` 照片缺漏不破版 | Task 11（沿用 Task 12(階段一) 已建立的佔位規則） |
| `lodging-guide` 住宿卡片 | Task 12 |
| `lodging-guide` 晚數計算 | Task 5 |
| `lodging-guide` 跨頁籤補齊 | Task 5 |
| `lodging-guide` 費用未填顯示待補 | Task 5、Task 12 |
| `budget-summary` 雙幣別換算 | Task 6 |
| `budget-summary` 誠實呈現未完成資料 | Task 6、Task 13 |
| `budget-summary` 分類佔比 | Task 6、Task 13 |
| `prep-checklist` 完成度與逐項狀態 | Task 7、Task 14 |
| `prep-checklist` 唯讀、無勾選互動 | Task 14 |
| `site-shell` 導覽列 | Task 8 |
| `site-shell` 響應式 | Task 19 Step 8（各區塊 CSS 已含斷點） |
| `itinerary-map` 單日動畫播放 | Task 15、16、17、18 |
| `itinerary-map` 道路路徑與退路 | Task 17、Task 18 |

**本階段之後仍不涵蓋**：Task 13（階段一）的 GitHub Pages 自訂子網域最終驗證——那項工作卡在使用者尚未完成的 DNS 設定，與本階段內容無關，維持獨立追蹤。

**刻意的簡化，已在文件中說明理由**：不搬移原型的 `VIA` 硬編碼車站折點表（JR 改用平滑曲線插值）；不做 Wikipedia 圖片後援（不在 openspec 驗收範圍）；不搬移原型的 `image-slot` 拖放元件（設計稿專用，正式站已用一般 `<img>`）。

**型別一致性檢查**：`Day`／`Spot`／`Leg` 的形狀在 Task 2–7、9–14、18 各處引用皆與階段一 `src/itinerary.js` 定義的一致；`resolve`（地點解析函式）在 `main.js` 組裝處統一命名，只有 `map.js` 內部因與 Promise 的 `resolve` 撞名而改叫 `resolvePlace`，已在 Task 18 Step 4 明確說明並全檔案統一改名，不會有一半叫 `resolve`、一半叫 `resolvePlace` 的不一致。

---

## 執行方式

**Plan complete and saved to `docs/superpowers/plans/2026-08-14-hokkaido-site-phase2-content-and-animation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
