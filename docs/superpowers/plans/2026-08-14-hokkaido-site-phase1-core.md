# 北海道小旅行網站 — 階段一：核心可用 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個部署於 GitHub Pages 的靜態網站，即時讀取 Google 試算表六個頁籤，並以單一地圖呈現逐日行程。

**Architecture:** 原生 ES modules，無打包器、無建置流程。純邏輯（CSV 解析、日期、交通分類、行程建模、地名解析）拆成可單獨測試的模組，由 vitest 以 Node 環境測試；地圖與 DOM 渲染以瀏覽器實測驗證。資料層並行抓取六個頁籤，任一失敗只降級對應區塊。

**Tech Stack:** 原生 JavaScript ES modules、Leaflet 1.9.4、OpenStreetMap 圖磚、OSRM demo、Nominatim、vitest（僅測試用）

**Spec:** `openspec/changes/build-hokkaido-trip-site/`（proposal.md、design.md、specs/、tasks.md）

## Global Constraints

- 試算表 ID：`1t0cg0bkqQLtyYYvFaGH7MlWoi4tHZGYhgTHnEWV90aU`
- 頁籤 GID：行程規劃 `0`、餐飲 `126273833`、住宿 `1315714937`、交通 `1509364219`、費用規劃 `1572357344`、待辦清單 `199634433`
- 匯率初值：`0.21`（¥1 = NT$0.21）
- 行程區間：`2026-12-25` 至 `2027-01-03`
- 設計 token：`--ink #2b2721`、`--ink-2 #6a6055`、`--ink-3 #a89c8c`、`--paper #fffefb`、`--bg #fff4e2`、`--line rgba(43,39,33,.12)`、JR `#0e7ad4`、自駕 `#f4622e`、巴士 `#12a97a`、步行／市電 `#f0ad2a`、住宿 `#7a5cc4`
- 字體：`Zen Maru Gothic`（標題）、`Noto Sans TC`（正文）
- 圓角：面板 22、卡片 20、圖卡 14、膠囊 99
- RWD 斷點：1080、820、560
- **禁止建置流程**：網站以原生 ES modules 直接部署，vitest 僅存在於 `devDependencies`
- **禁止讀取「交通」頁籤的 `訂位 / 備註` 欄**——欄位以白名單列舉，未列舉者不得進入任何資料結構
- 必須保留 `© OpenStreetMap contributors` attribution
- 排序與日期比較一律使用完整日期（行程跨年，月-日排序會把 `01-01` 排在 `12-25` 之前）
- 任何外部服務失敗都必須降級而非中斷渲染

## File Structure

| 檔案 | 責任 |
|---|---|
| `index.html` | 版面骨架與全部 CSS |
| `config.js` | 試算表 ID、頁籤 GID、匯率、行程區間 |
| `src/csv.js` | CSV 文字 → 物件陣列（處理引號內的逗號與換行） |
| `src/dates.js` | 日期解析、跨年比較、月-日退路、異常偵測 |
| `src/transport.js` | 交通工具字串 → mode 與顏色 |
| `src/sheets.js` | 並行抓取六頁籤、欄位白名單、失敗隔離 |
| `src/itinerary.js` | 行程建模：日分組、景點、leg 推導 |
| `src/places.js` | 地名簿載入、別名解析、Nominatim 地理編碼與快取 |
| `src/map.js` | Leaflet：全程模式、單日渲染、動畫 |
| `src/timeline.js` | 日期時間軸 UI |
| `src/cards.js` | 當日景點卡片列表 |
| `src/main.js` | 組裝與啟動 |
| `places.json` | 地名簿資料 |
| `photos/` | 18 張景點照片 |
| `tools/serve.js` | 本機開發伺服器 |
| `tests/*.test.js` | vitest 單元測試 |

`file://` 無法載入 ES modules 與 `fetch` JSON，本機開發一律透過 `tools/serve.js`。

---

### Task 1: 測試環境、設定檔與開發伺服器

**Files:**
- Create: `package.json`
- Create: `config.js`
- Create: `tools/serve.js`
- Create: `.gitignore`
- Test: `tests/config.test.js`

**Interfaces:**
- Consumes: 無
- Produces: `config.js` 匯出 `SHEET_ID: string`、`TABS: Record<string, number>`、`RATE: number`、`TRIP_START: string`、`TRIP_END: string`、`csvUrl(gid: number): string`

- [ ] **Step 1: 建立 package.json**

```json
{
  "name": "hokkaido-trip-site",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "dev": "node tools/serve.js . 8777"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: 安裝相依套件**

Run: `npm install`
Expected: 建立 `node_modules/` 與 `package-lock.json`，無錯誤

- [ ] **Step 3: 建立 .gitignore**

```
node_modules/
```

- [ ] **Step 4: 寫失敗的測試**

`tests/config.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { SHEET_ID, TABS, RATE, TRIP_START, TRIP_END, csvUrl } from '../config.js';

describe('config', () => {
  it('定義六個頁籤的 GID', () => {
    expect(Object.keys(TABS).sort()).toEqual(
      ['itinerary', 'dining', 'lodging', 'transport', 'budget', 'todo'].sort()
    );
    expect(TABS.itinerary).toBe(0);
    expect(TABS.budget).toBe(1572357344);
  });

  it('行程區間跨年', () => {
    expect(TRIP_START).toBe('2026-12-25');
    expect(TRIP_END).toBe('2027-01-03');
  });

  it('匯率為可設定的數字', () => {
    expect(typeof RATE).toBe('number');
    expect(RATE).toBeGreaterThan(0);
  });

  it('csvUrl 組出正確的匯出網址', () => {
    expect(csvUrl(0)).toBe(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`
    );
  });
});
```

- [ ] **Step 5: 執行測試確認失敗**

Run: `npm test -- tests/config.test.js`
Expected: FAIL，訊息為找不到 `../config.js`

- [ ] **Step 6: 寫 config.js**

```js
export const SHEET_ID = '1t0cg0bkqQLtyYYvFaGH7MlWoi4tHZGYhgTHnEWV90aU';

export const TABS = {
  itinerary: 0,
  dining: 126273833,
  lodging: 1315714937,
  transport: 1509364219,
  budget: 1572357344,
  todo: 199634433,
};

/** ¥1 = NT$RATE。出發前請確認並自行調整。 */
export const RATE = 0.21;

export const TRIP_START = '2026-12-25';
export const TRIP_END = '2027-01-03';

export function csvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
}
```

- [ ] **Step 7: 執行測試確認通過**

Run: `npm test -- tests/config.test.js`
Expected: PASS，4 個測試全綠

- [ ] **Step 8: 建立開發伺服器**

`tools/serve.js`：

```js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 8777);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(root, '.' + rel);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    return res.end('403');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 ' + rel);
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
```

注意 `path.resolve(root, '.' + rel)`：Windows 上 `path.join` 產生反斜線，與正斜線的 root 比對會失敗導致誤判 403。

- [ ] **Step 9: 驗證開發伺服器**

Run: `npm run dev`（另開終端）然後 `curl -s -o /dev/null -w "%{http_code}" http://localhost:8777/config.js`
Expected: `200`

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json .gitignore config.js tools/serve.js tests/config.test.js
git commit -m "feat: add test harness, config and dev server"
```

---

### Task 2: CSV 解析器

「費用規劃」頁籤的備註欄含引號包起來的多行文字，簡易的 `split(',')` 會解析錯誤。

**Files:**
- Create: `src/csv.js`
- Test: `tests/csv.test.js`

**Interfaces:**
- Consumes: 無
- Produces: `parseCsv(text: string): string[][]`、`toObjects(rows: string[][]): Record<string,string>[]`

- [ ] **Step 1: 寫失敗的測試**

`tests/csv.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { parseCsv, toObjects } from '../src/csv.js';

describe('parseCsv', () => {
  it('解析基本列', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('保留引號內的逗號', () => {
    expect(parseCsv('a,b\n"1,5",2')).toEqual([['a', 'b'], ['1,5', '2']]);
  });

  it('保留引號內的換行', () => {
    const text = 'a,b\n"line1\nline2",2';
    expect(parseCsv(text)).toEqual([['a', 'b'], ['line1\nline2', '2']]);
  });

  it('處理逸出的雙引號', () => {
    expect(parseCsv('a\n"say ""hi"""')).toEqual([['a'], ['say "hi"']]);
  });

  it('忽略 CRLF 的 CR', () => {
    expect(parseCsv('a,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('不因結尾換行產生空列', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('toObjects', () => {
  it('以首列為鍵並去除前後空白', () => {
    const rows = [[' 日期 ', '地點'], ['2026-12-25', ' 新千歲空港 ']];
    expect(toObjects(rows)).toEqual([{ 日期: '2026-12-25', 地點: '新千歲空港' }]);
  });

  it('缺少的欄位補空字串', () => {
    expect(toObjects([['a', 'b'], ['1']])).toEqual([{ a: '1', b: '' }]);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/csv.test.js`
Expected: FAIL，找不到 `../src/csv.js`

- [ ] **Step 3: 實作 src/csv.js**

```js
/** 解析 CSV 文字為二維陣列，正確處理引號內的逗號、換行與逸出雙引號。 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** 以首列為鍵轉為物件陣列。鍵與值皆去除前後空白。 */
export function toObjects(rows) {
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).map(r =>
    Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()]))
  );
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/csv.test.js`
Expected: PASS，8 個測試全綠

- [ ] **Step 5: Commit**

```bash
git add src/csv.js tests/csv.test.js
git commit -m "feat: add CSV parser handling quoted commas and newlines"
```

---

### Task 3: 日期工具與跨年處理

行程跨越年界（2026-12-25 → 2027-01-03）。只比對月-日會把 `01-01` 排在 `12-25` 之前。

**Files:**
- Create: `src/dates.js`
- Test: `tests/dates.test.js`

**Interfaces:**
- Consumes: 無
- Produces:
  - `parseDate(s: string): {y:number, m:number, d:number, iso:string} | null`
  - `compareDates(a, b): number`
  - `monthDay(date): string`（格式 `MM-DD`）
  - `matchByDate(rows, field, target): {row: object|null, usedFallback: boolean}` — 階段一不使用，階段二的跨頁籤關聯（餐飲、住宿、交通對應到日期）依賴它；在此一併實作與測試，避免階段二重寫日期邏輯
  - `findDateAnomalies(dates, tripStart): {iso:string, reason:string}[]`

- [ ] **Step 1: 寫失敗的測試**

`tests/dates.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { parseDate, compareDates, monthDay, matchByDate, findDateAnomalies } from '../src/dates.js';

describe('parseDate', () => {
  it('解析 ISO 日期', () => {
    expect(parseDate('2026-12-25')).toEqual({ y: 2026, m: 12, d: 25, iso: '2026-12-25' });
  });

  it('非日期回傳 null', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('12/25')).toBeNull();
  });
});

describe('compareDates', () => {
  it('跨年時 2027-01-01 排在 2026-12-31 之後', () => {
    const a = parseDate('2026-12-31');
    const b = parseDate('2027-01-01');
    expect(compareDates(a, b)).toBeLessThan(0);
  });

  it('可用於排序整個行程', () => {
    const isos = ['2027-01-01', '2026-12-25', '2026-12-31'];
    const sorted = isos.map(parseDate).sort(compareDates).map(d => d.iso);
    expect(sorted).toEqual(['2026-12-25', '2026-12-31', '2027-01-01']);
  });
});

describe('monthDay', () => {
  it('補零為 MM-DD', () => {
    expect(monthDay(parseDate('2027-01-03'))).toBe('01-03');
  });
});

describe('matchByDate', () => {
  const rows = [{ 日期: '2026-12-29', v: 'a' }, { 日期: '2026-12-30', v: 'b' }];

  it('完整日期相符時不使用退路', () => {
    const r = matchByDate(rows, '日期', parseDate('2026-12-29'));
    expect(r.row.v).toBe('a');
    expect(r.usedFallback).toBe(false);
  });

  it('年份不符時退回月-日比對', () => {
    const stale = [{ 日期: '2025-12-29', v: 'a' }];
    const r = matchByDate(stale, '日期', parseDate('2026-12-29'));
    expect(r.row.v).toBe('a');
    expect(r.usedFallback).toBe(true);
  });

  it('完全找不到時回傳 null', () => {
    const r = matchByDate(rows, '日期', parseDate('2026-11-01'));
    expect(r.row).toBeNull();
    expect(r.usedFallback).toBe(false);
  });
});

describe('findDateAnomalies', () => {
  it('標出早於行程起始日的日期', () => {
    const dates = ['2026-12-25', '2026-01-01'].map(parseDate);
    const out = findDateAnomalies(dates, '2026-12-25');
    expect(out).toHaveLength(1);
    expect(out[0].iso).toBe('2026-01-01');
  });

  it('行程內的日期不算異常', () => {
    const dates = ['2026-12-25', '2027-01-01'].map(parseDate);
    expect(findDateAnomalies(dates, '2026-12-25')).toEqual([]);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/dates.test.js`
Expected: FAIL，找不到 `../src/dates.js`

- [ ] **Step 3: 實作 src/dates.js**

```js
export function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? '').trim());
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3], iso: m[0] };
}

/** 以完整日期比較。行程跨年，不可只比月-日。 */
export function compareDates(a, b) {
  return (a.y - b.y) || (a.m - b.m) || (a.d - b.d);
}

export function monthDay(date) {
  return String(date.m).padStart(2, '0') + '-' + String(date.d).padStart(2, '0');
}

/**
 * 以完整日期關聯；找不到才退回月-日。
 * 退路命中時回傳 usedFallback=true，供畫面顯示年份不一致提示。
 */
export function matchByDate(rows, field, target) {
  const exact = rows.find(r => {
    const d = parseDate(r[field]);
    return d && compareDates(d, target) === 0;
  });
  if (exact) return { row: exact, usedFallback: false };

  const md = monthDay(target);
  const loose = rows.find(r => {
    const d = parseDate(r[field]);
    return d && monthDay(d) === md;
  });
  return loose ? { row: loose, usedFallback: true } : { row: null, usedFallback: false };
}

/** 找出早於行程起始日的日期——多半是跨年那幾天的年份填錯。 */
export function findDateAnomalies(dates, tripStartIso) {
  const start = parseDate(tripStartIso);
  return dates
    .filter(d => d && compareDates(d, start) < 0)
    .map(d => ({ iso: d.iso, reason: `早於行程起始日 ${tripStartIso}` }));
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/dates.test.js`
Expected: PASS，9 個測試全綠

- [ ] **Step 5: Commit**

```bash
git add src/dates.js tests/dates.test.js
git commit -m "feat: add date utilities with year-boundary-safe ordering"
```

---

### Task 4: 交通方式分類

**Files:**
- Create: `src/transport.js`
- Test: `tests/transport.test.js`

**Interfaces:**
- Consumes: 無
- Produces: `classifyMode(label: string): 'jr'|'drive'|'bus'|'tram'|'walk'|'flight'`、`MODE_COLORS: Record<string, string|null>`

- [ ] **Step 1: 寫失敗的測試**

`tests/transport.test.js`。測試資料取自試算表實際出現的 15 種交通工具字串：

```js
import { describe, it, expect } from 'vitest';
import { classifyMode, MODE_COLORS } from '../src/transport.js';

describe('classifyMode', () => {
  it('辨識 JR 相關', () => {
    expect(classifyMode('JR 特急 (Kamui / Lilac)')).toBe('jr');
    expect(classifyMode('Rapid Airport')).toBe('jr');
    expect(classifyMode('JR 特急 Hokuto')).toBe('jr');
    expect(classifyMode('JR 特級北斗 (Limited)')).toBe('jr');
  });

  it('多個交通工具時取先命中者', () => {
    expect(classifyMode('Rapid Airport、JR 函館本線 (普通 / 快速)')).toBe('jr');
  });

  it('辨識自駕', () => {
    expect(classifyMode('開車')).toBe('drive');
  });

  it('辨識巴士與接駁車', () => {
    expect(classifyMode('41號巴士')).toBe('bus');
    expect(classifyMode('飯店接駁車')).toBe('bus');
  });

  it('辨識市電與地下鐵', () => {
    expect(classifyMode('市電 十字街站')).toBe('tram');
    expect(classifyMode('從市營地下鐵東豐線 到 豐水薄野站')).toBe('tram');
  });

  it('辨識步行', () => {
    expect(classifyMode('步行')).toBe('walk');
  });

  it('辨識航班', () => {
    expect(classifyMode('台灣虎航 IT234')).toBe('flight');
  });

  it('空值與無法判斷者預設為步行', () => {
    expect(classifyMode('')).toBe('walk');
    expect(classifyMode(undefined)).toBe('walk');
    expect(classifyMode('搭乘魔毯')).toBe('walk');
  });
});

describe('MODE_COLORS', () => {
  it('各 mode 的顏色符合設計 token', () => {
    expect(MODE_COLORS.jr).toBe('#0e7ad4');
    expect(MODE_COLORS.drive).toBe('#f4622e');
    expect(MODE_COLORS.bus).toBe('#12a97a');
    expect(MODE_COLORS.tram).toBe('#f0ad2a');
    expect(MODE_COLORS.walk).toBe('#f0ad2a');
  });

  it('航班不畫線', () => {
    expect(MODE_COLORS.flight).toBeNull();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/transport.test.js`
Expected: FAIL，找不到 `../src/transport.js`

- [ ] **Step 3: 實作 src/transport.js**

```js
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
  flight: null,
};

export function classifyMode(label) {
  const s = String(label ?? '').trim();
  if (!s) return 'walk';
  for (const r of RULES) if (r.re.test(s)) return r.mode;
  return 'walk';
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/transport.test.js`
Expected: PASS，10 個測試全綠

- [ ] **Step 5: Commit**

```bash
git add src/transport.js tests/transport.test.js
git commit -m "feat: classify transport mode from spreadsheet label"
```

---

### Task 5: 試算表抓取層與欄位白名單

**Files:**
- Create: `src/sheets.js`
- Test: `tests/sheets.test.js`

**Interfaces:**
- Consumes: `config.js` 的 `TABS`、`csvUrl`；`src/csv.js` 的 `parseCsv`、`toObjects`
- Produces:
  - `COLUMNS: Record<string, string[]>` — 每個頁籤的欄位白名單
  - `pickColumns(rows, allowed): Record<string,string>[]`
  - `fetchTab(key, {fetchFn}): Promise<{ok:boolean, rows?:object[], error?:string}>`
  - `fetchAllTabs({fetchFn}): Promise<Record<string, {ok, rows?, error?}>>`

- [ ] **Step 1: 寫失敗的測試**

`tests/sheets.test.js`：

```js
import { describe, it, expect, vi } from 'vitest';
import { COLUMNS, pickColumns, fetchTab, fetchAllTabs } from '../src/sheets.js';

describe('COLUMNS', () => {
  it('交通頁籤的白名單不含訂位欄', () => {
    expect(COLUMNS.transport).not.toContain('訂位 / 備註');
    expect(COLUMNS.transport.some(c => c.includes('訂位'))).toBe(false);
  });

  it('六個頁籤都有白名單', () => {
    for (const k of ['itinerary', 'dining', 'lodging', 'transport', 'budget', 'todo']) {
      expect(Array.isArray(COLUMNS[k])).toBe(true);
      expect(COLUMNS[k].length).toBeGreaterThan(0);
    }
  });
});

describe('pickColumns', () => {
  it('只保留白名單內的欄位', () => {
    const rows = [{ 日期: '2026-12-25', '訂位 / 備註': 'ABC123', 交通工具: '步行' }];
    const out = pickColumns(rows, ['日期', '交通工具']);
    expect(out).toEqual([{ 日期: '2026-12-25', 交通工具: '步行' }]);
    expect('訂位 / 備註' in out[0]).toBe(false);
  });

  it('白名單有但資料沒有的欄位補空字串', () => {
    const out = pickColumns([{ a: '1' }], ['a', 'b']);
    expect(out).toEqual([{ a: '1', b: '' }]);
  });

  it('訂位代號不會出現在序列化結果中', () => {
    const rows = [{ 日期: '2026-12-25', '訂位 / 備註': '訂位代號：ABC123' }];
    const out = pickColumns(rows, COLUMNS.transport);
    expect(JSON.stringify(out)).not.toContain('ABC123');
  });
});

describe('fetchTab', () => {
  it('成功時回傳解析後的列', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '日期,城市,地點,活動內容,抵達時間,交通工具,交通時間\n2026-12-25,千歲市,新千歲空港,抵達,11:30,台灣虎航 IT234,300 mins',
    });
    const r = await fetchTab('itinerary', { fetchFn });
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].地點).toBe('新千歲空港');
  });

  it('HTTP 錯誤時回傳 ok:false 而不拋例外', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '' });
    const r = await fetchTab('itinerary', { fetchFn });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('404');
  });

  it('網路例外時回傳 ok:false 而不拋例外', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'));
    const r = await fetchTab('itinerary', { fetchFn });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('offline');
  });
});

describe('fetchAllTabs', () => {
  it('單一頁籤失敗不影響其他頁籤', async () => {
    const fetchFn = vi.fn().mockImplementation(url => {
      if (url.includes('gid=1572357344')) return Promise.reject(new Error('boom'));
      return Promise.resolve({ ok: true, text: async () => 'a\n1' });
    });
    const all = await fetchAllTabs({ fetchFn });
    expect(all.budget.ok).toBe(false);
    expect(all.itinerary.ok).toBe(true);
    expect(all.lodging.ok).toBe(true);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/sheets.test.js`
Expected: FAIL，找不到 `../src/sheets.js`

- [ ] **Step 3: 實作 src/sheets.js**

```js
import { TABS, csvUrl } from '../config.js';
import { parseCsv, toObjects } from './csv.js';

/**
 * 欄位白名單。未列於此的欄位不會進入任何資料結構。
 * 這是白名單而非黑名單：試算表日後新增的欄位預設不顯示。
 * 「交通」頁籤的「訂位 / 備註」欄含訂位代號，刻意不列入。
 */
export const COLUMNS = {
  itinerary: ['日期', '抵達時間', '城市', '地點', '活動內容', '交通工具', '交通時間'],
  dining:    ['日期', '城市', '餐廳/地點', '餐別', '預約狀態', '備註'],
  lodging:   ['入住日', '退房日', '城市', '飯店名稱', '費用 (NTD)', '訂房狀態', '備註'],
  transport: ['日期', '時間', '出發地', '目的地', '交通工具', '車程', '票價 (NTD)', '購票/預約'],
  budget:    ['分類1', '分類2', '項目', 'NTD', 'JPY', '備註'],
  todo:      ['分類1', '項目名稱', '已完成'],
};

export function pickColumns(rows, allowed) {
  return rows.map(r =>
    Object.fromEntries(allowed.map(c => [c, r[c] ?? '']))
  );
}

export async function fetchTab(key, { fetchFn = fetch } = {}) {
  try {
    const res = await fetchFn(csvUrl(TABS[key]));
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const rows = pickColumns(toObjects(parseCsv(await res.text())), COLUMNS[key]);
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function fetchAllTabs({ fetchFn = fetch } = {}) {
  const keys = Object.keys(TABS);
  const results = await Promise.all(keys.map(k => fetchTab(k, { fetchFn })));
  return Object.fromEntries(keys.map((k, i) => [k, results[i]]));
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/sheets.test.js`
Expected: PASS，9 個測試全綠

- [ ] **Step 5: Commit**

```bash
git add src/sheets.js tests/sheets.test.js
git commit -m "feat: fetch sheet tabs behind a column whitelist"
```

---

### Task 6: 行程建模

**Files:**
- Create: `src/itinerary.js`
- Test: `tests/itinerary.test.js`

**Interfaces:**
- Consumes: `src/dates.js` 的 `parseDate`、`compareDates`；`src/transport.js` 的 `classifyMode`
- Produces: `buildItinerary(rows): Day[]`，其中
  - `Day = { index:number, date:{y,m,d,iso}, city:string, spots:Spot[], legs:Leg[] }`
  - `Spot = { name:string, time:string, city:string, activity:string, stay:boolean, transfer:boolean, pending:boolean }`
  - `Leg = { fromIndex:number, toIndex:number, mode:string, label:string, mins:number|null }`

- [ ] **Step 1: 寫失敗的測試**

`tests/itinerary.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { buildItinerary } from '../src/itinerary.js';

const row = (o = {}) => ({
  日期: '2026-12-25', 抵達時間: '', 城市: '', 地點: '',
  活動內容: '', 交通工具: '', 交通時間: '', ...o,
});

describe('buildItinerary', () => {
  it('N 列產生 N 個景點與 N-1 段路線', () => {
    const days = buildItinerary([
      row({ 地點: 'A' }), row({ 地點: 'B' }), row({ 地點: 'C' }),
    ]);
    expect(days).toHaveLength(1);
    expect(days[0].spots).toHaveLength(3);
    expect(days[0].legs).toHaveLength(2);
  });

  it('路線的交通方式取自後一列', () => {
    const days = buildItinerary([
      row({ 地點: 'A', 交通工具: '台灣虎航 IT234' }),
      row({ 地點: 'B', 交通工具: '開車' }),
    ]);
    expect(days[0].legs[0].mode).toBe('drive');
    expect(days[0].legs[0].fromIndex).toBe(0);
    expect(days[0].legs[0].toIndex).toBe(1);
  });

  it('跨日不產生路線', () => {
    const days = buildItinerary([
      row({ 日期: '2026-12-25', 地點: 'A' }),
      row({ 日期: '2026-12-26', 地點: 'B' }),
    ]);
    expect(days).toHaveLength(2);
    expect(days[0].legs).toHaveLength(0);
    expect(days[1].legs).toHaveLength(0);
  });

  it('依完整日期排序，跨年正確', () => {
    const days = buildItinerary([
      row({ 日期: '2027-01-01', 地點: 'C' }),
      row({ 日期: '2026-12-25', 地點: 'A' }),
      row({ 日期: '2026-12-31', 地點: 'B' }),
    ]);
    expect(days.map(d => d.date.iso)).toEqual(['2026-12-25', '2026-12-31', '2027-01-01']);
    expect(days.map(d => d.index)).toEqual([0, 1, 2]);
  });

  it('Check-in 標記為住宿', () => {
    const days = buildItinerary([row({ 地點: '旭川 JR 酒店', 活動內容: '飯店 Check-in、寄放行李' })]);
    expect(days[0].spots[0].stay).toBe(true);
  });

  it('活動內容為轉車時標記 transfer', () => {
    const days = buildItinerary([row({ 地點: 'JR 札幌站', 活動內容: '轉車' })]);
    expect(days[0].spots[0].transfer).toBe(true);
  });

  it('地點為空時標記 pending', () => {
    const days = buildItinerary([row({ 地點: '', 活動內容: '晚餐' })]);
    expect(days[0].spots[0].pending).toBe(true);
    expect(days[0].spots[0].activity).toBe('晚餐');
  });

  it('解析交通時間為分鐘數', () => {
    const days = buildItinerary([row({ 地點: 'A' }), row({ 地點: 'B', 交通時間: '150 mins' })]);
    expect(days[0].legs[0].mins).toBe(150);
  });

  it('交通時間為空時 mins 為 null', () => {
    const days = buildItinerary([row({ 地點: 'A' }), row({ 地點: 'B', 交通時間: '' })]);
    expect(days[0].legs[0].mins).toBeNull();
  });

  it('略過無法解析日期的列', () => {
    const days = buildItinerary([row({ 日期: '', 地點: 'A' }), row({ 地點: 'B' })]);
    expect(days).toHaveLength(1);
    expect(days[0].spots).toHaveLength(1);
  });

  it('城市取當日第一個非空值', () => {
    const days = buildItinerary([
      row({ 地點: 'A', 城市: '' }), row({ 地點: 'B', 城市: '旭川市' }),
    ]);
    expect(days[0].city).toBe('旭川市');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/itinerary.test.js`
Expected: FAIL，找不到 `../src/itinerary.js`

- [ ] **Step 3: 實作 src/itinerary.js**

```js
import { parseDate, compareDates } from './dates.js';
import { classifyMode } from './transport.js';

/**
 * 每一列 = 一個景點 + 抵達該景點的那一段交通。
 * 因此同日相鄰兩列即構成一段 leg；當日第一列只產生景點。
 */
export function buildItinerary(rows) {
  const byDate = new Map();

  for (const r of rows) {
    const date = parseDate(r['日期']);
    if (!date) continue;
    if (!byDate.has(date.iso)) byDate.set(date.iso, { date, rows: [] });
    byDate.get(date.iso).rows.push(r);
  }

  return [...byDate.values()]
    .sort((a, b) => compareDates(a.date, b.date))
    .map((group, index) => {
      const spots = group.rows.map(r => {
        const activity = r['活動內容'] || '';
        return {
          name: r['地點'] || '',
          time: r['抵達時間'] || '',
          city: r['城市'] || '',
          activity,
          stay: /check-in/i.test(activity),
          transfer: activity.trim() === '轉車',
          pending: !r['地點'],
        };
      });

      const legs = [];
      for (let i = 1; i < group.rows.length; i++) {
        const r = group.rows[i];
        const mins = parseInt(r['交通時間'], 10);
        legs.push({
          fromIndex: i - 1,
          toIndex: i,
          mode: classifyMode(r['交通工具']),
          label: r['交通工具'] || '',
          mins: Number.isNaN(mins) ? null : mins,
        });
      }

      return {
        index,
        date: group.date,
        city: spots.find(s => s.city)?.city || '',
        spots,
        legs,
      };
    });
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/itinerary.test.js`
Expected: PASS，11 個測試全綠

- [ ] **Step 5: 以真實資料做一次冒煙驗證**

建立臨時腳本 `tools/smoke-itinerary.js`：

```js
import { fetchAllTabs } from '../src/sheets.js';
import { buildItinerary } from '../src/itinerary.js';

const all = await fetchAllTabs();
const days = buildItinerary(all.itinerary.rows);
console.log('days:', days.length);
for (const d of days) {
  console.log(d.date.iso, `spots=${d.spots.length}`, `legs=${d.legs.length}`, d.city);
}
console.log('modes:', [...new Set(days.flatMap(d => d.legs.map(l => l.mode)))].join(', '));
```

Run: `node tools/smoke-itinerary.js`
Expected: `days: 7`，各日 spots 為 6/8/5/7/5/3/8，legs 各少 1，modes 含 `jr, walk, bus, drive, tram`

- [ ] **Step 6: 刪除冒煙腳本並提交**

```bash
rm tools/smoke-itinerary.js
git add src/itinerary.js tests/itinerary.test.js
git commit -m "feat: derive days, spots and legs from itinerary rows"
```

---

### Task 7: 地名簿與別名解析

**Files:**
- Create: `src/places.js`
- Create: `places.json`
- Create: `photos/`（搬入 18 張照片）
- Test: `tests/places.test.js`

**Interfaces:**
- Consumes: 無
- Produces:
  - `makeResolver(places: object): (name:string) => Place|null`
  - `Place = { lng:number, lat:number, desc?:string, photo?:string, ramen?:string, aliases?:string[] }`
  - `latLng(place): [number, number]` — Leaflet 需要 `[lat, lng]`，而地名簿存 `lng`/`lat` 兩個具名欄位

- [ ] **Step 1: 寫失敗的測試**

`tests/places.test.js`：

```js
import { describe, it, expect } from 'vitest';
import { makeResolver, latLng } from '../src/places.js';
import places from '../places.json' with { type: 'json' };

describe('makeResolver', () => {
  const data = {
    '蜂屋 五条創業店': { lng: 142.364, lat: 43.77, desc: '醬油拉麵老店', ramen: '醬油' },
    '成吉思汗大黑屋 五稜郭店': {
      lng: 140.7598, lat: 41.796, aliases: ['成吉思汗大黑屋 函館五稜郭店'],
    },
  };

  it('以主鍵解析', () => {
    expect(makeResolver(data)('蜂屋 五条創業店').ramen).toBe('醬油');
  });

  it('以別名解析', () => {
    const r = makeResolver(data)('成吉思汗大黑屋 函館五稜郭店');
    expect(r).not.toBeNull();
    expect(r.lat).toBe(41.796);
  });

  it('忽略空白差異', () => {
    expect(makeResolver(data)('蜂屋五条創業店')).not.toBeNull();
  });

  it('找不到時回傳 null', () => {
    expect(makeResolver(data)('不存在的店')).toBeNull();
  });
});

describe('latLng', () => {
  it('轉為 Leaflet 的 [lat, lng] 順序', () => {
    expect(latLng({ lng: 142.364, lat: 43.77 })).toEqual([43.77, 142.364]);
  });
});

describe('places.json', () => {
  const resolve = makeResolver(places);

  it('涵蓋試算表中的 36 個地點', () => {
    const names = [
      '新千歲空港', 'JR 札幌站', 'JR 旭川站', '旭川 JR 酒店', '平和通商店街',
      '蜂屋 五条創業店', '旭川巴士總站 6 號月台', '旭山動物園', '旭山動物園 巴士站',
      'JR 小樽站', 'Nord 小樽飯店', '若鶏時代 なると 本店', '三角市場', 'JR 洞爺站',
      '洞爺觀光酒店', 'JR Rent-A-Car Toya', '昭和新山熊牧場', '湯之川 熱帶動植物園',
      '湯倉神社', 'JR車站租車 函館營業所', 'Condominium View Mt Hakodate',
      '金森紅磚倉庫', '客美多咖啡 函館港濱店', '八幡坂', '山崎洋服店', '函館山纜車',
      '五島軒 雪河亭', '五稜郭公園', '成吉思汗大黑屋 函館五稜郭店', '函館朝市',
      'JR 函館站', 'Downtown area Spacious cozy room Susukino IK901',
      '大通公園、札幌電視塔', '札幌時計台', '北海道廳舊本廳舍', '札幌一粒庵',
    ];
    const missing = names.filter(n => !resolve(n));
    expect(missing).toEqual([]);
  });

  it('每個項目都有有效的北海道座標', () => {
    for (const [name, p] of Object.entries(places)) {
      expect(typeof p.lat, name).toBe('number');
      expect(typeof p.lng, name).toBe('number');
      expect(p.lat, name).toBeGreaterThan(41);
      expect(p.lat, name).toBeLessThan(46);
      expect(p.lng, name).toBeGreaterThan(139);
      expect(p.lng, name).toBeLessThan(146);
    }
  });

  it('三家拉麵店標記了流派', () => {
    expect(resolve('蜂屋 五条創業店').ramen).toBe('醬油');
    expect(resolve('山崎洋服店').ramen).toBe('鹽味');
    expect(resolve('札幌一粒庵').ramen).toBe('味噌');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/places.test.js`
Expected: FAIL，找不到 `../src/places.js` 與 `../places.json`

- [ ] **Step 3: 實作 src/places.js**

```js
const norm = s => String(s ?? '').replace(/\s+/g, '').toLowerCase();

/** 建立地名解析器。主鍵與別名皆可解析，並忽略空白差異。 */
export function makeResolver(places) {
  const index = new Map();
  for (const [key, value] of Object.entries(places)) {
    index.set(norm(key), value);
    for (const alias of value.aliases || []) index.set(norm(alias), value);
  }
  return name => index.get(norm(name)) || null;
}

/** Leaflet 使用 [lat, lng]，地名簿存具名的 lng / lat 欄位。 */
export function latLng(place) {
  return [place.lat, place.lng];
}
```

- [ ] **Step 4: 建立 places.json**

由 `design_handoff_hokkaido_trip/hokkaido-trip.html:232-246` 的 `P` 物件取得 28 筆座標（該處為 `[lng, lat]` 順序），由 `:248-378` 的 `DAYS[].spots[].d` 取得介紹文字，由 `:779-798` 的 `OWN` 取得照片對應。

以試算表的「地點」欄字串為主鍵。原型 `P` 未涵蓋而需新增座標的地點：

| 地點 | lng | lat |
|---|---|---|
| 若鶏時代 なると 本店 | 140.99450 | 43.19870 |
| 旭山動物園 巴士站 | 142.48060 | 43.76750 |
| JR Rent-A-Car Toya | 140.77680 | 42.56650 |
| 湯倉神社 | 140.79100 | 41.78211 |
| JR車站租車 函館營業所 | 140.72700 | 41.77400 |
| 八幡坂 | 140.71100 | 41.76200 |
| 函館朝市 | 140.72538 | 41.77256 |
| Downtown area Spacious cozy room Susukino IK901 | 141.35400 | 43.05400 |

檔案格式（節錄，其餘依同一結構補齊全部 36 筆）：

```json
{
  "新千歲空港": {
    "lng": 141.6920, "lat": 42.7750,
    "desc": "台灣虎航 IT234 抵達，出關後搭 Rapid Airport 進札幌，於 JR 札幌站轉特急北上旭川。",
    "photo": "photos/shin-chitose-airport.png"
  },
  "蜂屋 五条創業店": {
    "lng": 142.36400, "lat": 43.77000,
    "desc": "旭川拉麵的創業老店，焦香豬油的醬油湯頭配捲麵，離商店街步行 5 分鐘。",
    "photo": "photos/hachiya.png",
    "ramen": "醬油"
  },
  "山崎洋服店": {
    "lng": 140.7150, "lat": 41.7640,
    "desc": "函館鹽味拉麵的代表店，清澈湯頭配細麵。",
    "photo": "photos/yamazaki.png",
    "ramen": "鹽味"
  },
  "札幌一粒庵": {
    "lng": 141.35600, "lat": 43.06800,
    "desc": "札幌味噌拉麵，行程最後一晚的收尾。",
    "photo": "photos/ichiryuan.png",
    "ramen": "味噌"
  },
  "成吉思汗大黑屋 函館五稜郭店": {
    "lng": 140.75980, "lat": 41.79600,
    "desc": "五稜郭附近的成吉思汗烤羊肉。",
    "photo": "photos/daikokuya.png",
    "aliases": ["成吉思汗大黑屋 五稜郭店", "成吉思汗大黑屋旭川分店"]
  },
  "Downtown area Spacious cozy room Susukino IK901": {
    "lng": 141.35400, "lat": 43.05400,
    "desc": "薄野的民宿，跨年夜的落腳處。",
    "photo": "photos/susukino-ik901.png",
    "aliases": ["薄野 民宿 IK1003", "薄野 民宿"]
  }
}
```

`aliases` 解決兩筆命名不符：照片對照表寫 `成吉思汗大黑屋 五稜郭店`、費用頁籤寫 `成吉思汗大黑屋旭川分店`，而行程與餐飲頁籤寫 `成吉思汗大黑屋 函館五稜郭店`；民宿同理。

- [ ] **Step 5: 搬移照片**

```bash
mkdir -p photos
git mv design_handoff_hokkaido_trip/uploads/pasted-1786602603104-0.png photos/nord-otaru.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786602674046-0.png photos/asahiyama-zoo.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786602844318-0.png photos/hachiya.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786602892173-0.png photos/shin-chitose-airport.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786602996832-0.png photos/heiwa-dori.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786603092518-0.png photos/sankaku-market.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786603324026-0.png photos/toya-hotel.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786603401325-0.png photos/yunokawa-zoo.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786603495583-0.png photos/kanemori.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786603639537-0.png photos/hakodate-ropeway.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786603742821-0.png photos/gotoken.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786603837584-0.png photos/komeda.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786603903460-0.png photos/yamazaki.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786603953928-0.png photos/daikokuya.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786604027649-0.png photos/ichiryuan.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786607686879-0.png photos/asahikawa-jr-hotel.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786608263591-0.png photos/hakodate-condo.png
git mv design_handoff_hokkaido_trip/uploads/pasted-1786609863503-0.png photos/susukino-ik901.png
```

- [ ] **Step 6: 執行測試確認通過**

Run: `npm test -- tests/places.test.js`
Expected: PASS，8 個測試全綠。若「涵蓋 36 個地點」失敗，錯誤訊息會列出缺少的地點名，據此補齊 `places.json`

- [ ] **Step 7: Commit**

```bash
git add src/places.js places.json photos/ tests/places.test.js design_handoff_hokkaido_trip/
git commit -m "feat: add gazetteer with alias resolution and named photos"
```

---

### Task 8: 未知地點地理編碼

**Files:**
- Create: `src/geocode.js`
- Test: `tests/geocode.test.js`

**Interfaces:**
- Consumes: 無
- Produces: `makeGeocoder({fetchFn, storage, minIntervalMs, sleep}): { lookup(name): Promise<{lat,lng}|null> }`
- 快取鍵：`localStorage` 的 `hokkaido:geocode`，值為 `{ [name]: {lat, lng} | null }`

- [ ] **Step 1: 寫失敗的測試**

`tests/geocode.test.js`：

```js
import { describe, it, expect, vi } from 'vitest';
import { makeGeocoder, CACHE_KEY } from '../src/geocode.js';

function memStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
  };
}

const okResponse = (lat, lon) => ({ ok: true, json: async () => [{ lat: String(lat), lon: String(lon) }] });

describe('makeGeocoder', () => {
  it('查詢成功時回傳座標', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse(43.06, 141.35));
    const g = makeGeocoder({ fetchFn, storage: memStorage(), sleep: async () => {} });
    expect(await g.lookup('某新地點')).toEqual({ lat: 43.06, lng: 141.35 });
  });

  it('結果寫入快取', async () => {
    const storage = memStorage();
    const fetchFn = vi.fn().mockResolvedValue(okResponse(43.06, 141.35));
    const g = makeGeocoder({ fetchFn, storage, sleep: async () => {} });
    await g.lookup('某新地點');
    expect(JSON.parse(storage.getItem(CACHE_KEY))['某新地點']).toEqual({ lat: 43.06, lng: 141.35 });
  });

  it('快取命中時不再發出請求', async () => {
    const storage = memStorage({ [CACHE_KEY]: JSON.stringify({ 快取地點: { lat: 1, lng: 2 } }) });
    const fetchFn = vi.fn();
    const g = makeGeocoder({ fetchFn, storage, sleep: async () => {} });
    expect(await g.lookup('快取地點')).toEqual({ lat: 1, lng: 2 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('查無結果時回傳 null 並快取該結果', async () => {
    const storage = memStorage();
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    const g = makeGeocoder({ fetchFn, storage, sleep: async () => {} });
    expect(await g.lookup('查不到的地方')).toBeNull();
    expect(JSON.parse(storage.getItem(CACHE_KEY))['查不到的地方']).toBeNull();

    await g.lookup('查不到的地方');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('網路錯誤時回傳 null 且不寫入快取', async () => {
    const storage = memStorage();
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'));
    const g = makeGeocoder({ fetchFn, storage, sleep: async () => {} });
    expect(await g.lookup('某地')).toBeNull();
    expect(storage.getItem(CACHE_KEY)).toBeNull();
  });

  it('連續查詢之間至少間隔 minIntervalMs', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchFn = vi.fn().mockResolvedValue(okResponse(43, 141));
    const g = makeGeocoder({ fetchFn, storage: memStorage(), minIntervalMs: 1000, sleep });
    await g.lookup('A');
    await g.lookup('B');
    expect(sleep).toHaveBeenCalled();
    expect(sleep.mock.calls.some(c => c[0] > 0)).toBe(true);
  });

  it('請求為序列化執行，不並行', async () => {
    let inFlight = 0, maxInFlight = 0;
    const fetchFn = vi.fn().mockImplementation(async () => {
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      await Promise.resolve();
      inFlight--;
      return okResponse(43, 141);
    });
    const g = makeGeocoder({ fetchFn, storage: memStorage(), sleep: async () => {} });
    await Promise.all([g.lookup('A'), g.lookup('B'), g.lookup('C')]);
    expect(maxInFlight).toBe(1);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test -- tests/geocode.test.js`
Expected: FAIL，找不到 `../src/geocode.js`

- [ ] **Step 3: 實作 src/geocode.js**

```js
export const CACHE_KEY = 'hokkaido:geocode';

const defaultSleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Nominatim 地理編碼。僅用於 places.json 未涵蓋的地點。
 * 遵守使用政策：請求序列化執行，且相鄰兩次至少間隔 minIntervalMs。
 * 結果（含查無結果的 null）快取於 storage，避免重複查詢。
 */
export function makeGeocoder({
  fetchFn = fetch,
  storage = localStorage,
  minIntervalMs = 1000,
  sleep = defaultSleep,
} = {}) {
  let cache = null;
  let queue = Promise.resolve();
  let lastAt = 0;

  function readCache() {
    if (cache) return cache;
    try {
      cache = JSON.parse(storage.getItem(CACHE_KEY) || '{}');
    } catch {
      cache = {};
    }
    return cache;
  }

  function writeCache(name, value) {
    const c = readCache();
    c[name] = value;
    try {
      storage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch {
      /* 儲存空間滿或被停用時，僅失去快取，不影響功能 */
    }
  }

  async function request(name) {
    const wait = minIntervalMs - (Date.now() - lastAt);
    await sleep(wait > 0 ? wait : 0);
    lastAt = Date.now();

    const url = 'https://nominatim.openstreetmap.org/search'
      + `?format=json&limit=1&q=${encodeURIComponent(name + ' 北海道')}`;
    const res = await fetchFn(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const hits = await res.json();
    if (!hits.length) {
      writeCache(name, null);
      return null;
    }
    const coords = { lat: Number(hits[0].lat), lng: Number(hits[0].lon) };
    writeCache(name, coords);
    return coords;
  }

  return {
    async lookup(name) {
      const c = readCache();
      if (name in c) return c[name];

      const run = queue.then(() => request(name).catch(() => null));
      queue = run.then(() => undefined, () => undefined);
      return run;
    },
  };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test -- tests/geocode.test.js`
Expected: PASS，7 個測試全綠

- [ ] **Step 5: Commit**

```bash
git add src/geocode.js tests/geocode.test.js
git commit -m "feat: geocode unknown places with rate limit and cache"
```

---

### Task 9: 頁面骨架與設計 token

**Files:**
- Create: `index.html`
- Create: `src/main.js`

**Interfaces:**
- Consumes: `config.js`、`src/sheets.js`、`src/itinerary.js`、`src/places.js`
- Produces: DOM 節點 `#daylist`（時間軸）、`#map`（地圖）、`#cards`（景點卡片）、`#notice`（提示列）

- [ ] **Step 1: 建立 index.html**

CSS 由 `design_handoff_hokkaido_trip/hokkaido-trip.html:1-230` 搬入，並改用本計畫的 id。骨架：

```html
<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>北海道小旅行</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700&family=Noto+Sans+TC:wght@300;400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
:root{
  --ink:#2b2721; --ink-2:#6a6055; --ink-3:#a89c8c;
  --paper:#fffefb; --bg:#fff4e2; --line:rgba(43,39,33,.12);
  --jr:#0e7ad4; --drive:#f4622e; --bus:#12a97a; --walk:#f0ad2a; --stay:#7a5cc4;
}
*{box-sizing:border-box}
body{margin:0;color:var(--ink);background:var(--bg);
  background-image:linear-gradient(180deg,#fff8ec,#fff2dc 55%,#ffeed3);
  background-attachment:fixed;
  font-family:"Noto Sans TC",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3,.maru{font-family:"Zen Maru Gothic","Noto Sans TC",sans-serif}
.wrap{max-width:1560px;margin:0 auto;padding:0 40px}
.top{display:grid;grid-template-columns:300px 1fr;gap:20px;height:min(660px,72vh)}
#map{border-radius:22px;overflow:hidden;background:#e7e3d6;height:100%;
  box-shadow:0 1px 1px rgba(43,39,33,.05),0 30px 60px -38px rgba(11,19,26,.55)}
.leaflet-tile-pane{filter:grayscale(.62) sepia(.16) brightness(1.08) contrast(.9) saturate(.95)}
.leaflet-container{background:#dfe4dc;font-family:"Noto Sans TC",sans-serif}
#notice{margin:16px 0;padding:12px 18px;border-radius:14px;background:#fffbe9;
  border:1px dashed rgba(244,98,46,.5);font-size:12.5px;line-height:1.9;color:var(--ink-2);display:none}
#notice.on{display:block}
@media(max-width:1080px){.wrap{padding:0 24px}.top{grid-template-columns:250px 1fr}}
@media(max-width:820px){.top{grid-template-columns:1fr;height:auto}#map{height:52vh}}
@media(max-width:560px){#map{height:46vh}}
</style>
</head>
<body>
<header class="wrap"><h1>北海道小旅行</h1></header>
<main class="wrap">
  <div id="notice"></div>
  <div class="top">
    <div id="daylist"></div>
    <div id="map"></div>
  </div>
  <div id="cards"></div>
</main>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script type="module" src="src/main.js"></script>
</body>
</html>
```

Leaflet 以傳統 `<script>` 載入並使用全域 `L`，與模組化的自有程式並存。

- [ ] **Step 2: 建立 src/main.js 的載入骨架**

```js
import { fetchAllTabs } from './sheets.js';
import { buildItinerary } from './itinerary.js';
import { makeResolver } from './places.js';
import { findDateAnomalies } from './dates.js';
import { TRIP_START } from '../config.js';

const notice = document.getElementById('notice');

function showNotice(lines) {
  if (!lines.length) return;
  notice.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
  notice.classList.add('on');
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
  const resolve = makeResolver(placesRes);

  const anomalies = findDateAnomalies(days.map(d => d.date), TRIP_START);
  for (const a of anomalies) messages.push(`日期異常：${a.iso} ${a.reason}`);

  const unknown = [...new Set(
    days.flatMap(d => d.spots).filter(s => s.name && !resolve(s.name)).map(s => s.name)
  )];
  if (unknown.length) messages.push(`以下地點尚無座標，未顯示於地圖：${unknown.join('、')}`);

  showNotice(messages);

  window.__trip = { days, resolve, tabs };  // 供 Task 10-12 接手
}

start();
```

- [ ] **Step 3: 以瀏覽器驗證資料載入**

Run: `npm run dev`，另開終端執行
```bash
agent-browser open "http://localhost:8777/"
agent-browser eval "JSON.stringify({days: window.__trip.days.length, spots: window.__trip.days.flatMap(d=>d.spots).length, notice: document.getElementById('notice').classList.contains('on')})"
```
Expected: `{"days":7,"spots":42,"notice":false}`——若 `notice` 為 `true`，讀取畫面提示並依訊息補齊 `places.json`

- [ ] **Step 4: 驗證訂位代號未外洩**

Run:
```bash
agent-browser eval "document.documentElement.outerHTML.includes('ABC123') || JSON.stringify(window.__trip).includes('ABC123')"
```
Expected: `false`

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.js
git commit -m "feat: add page shell and data bootstrap"
```

---

### Task 10: 地圖與全程模式

**Files:**
- Create: `src/map.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/places.js` 的 `latLng`；`src/transport.js` 的 `MODE_COLORS`；全域 `L`
- Produces: `createMap(el, {days, resolve}): { showAll(): void, showDay(index: number): void }`、`DAY_COLORS: string[]`

由 `design_handoff_hokkaido_trip/hokkaido-trip.html` 移植：`smooth()` `:507-525`、`curvePts()` `:526`、`roadPath()` `:534-553`、`buildBase()` `:870-877`。

**與原型的差異**：`buildBase()` 原本把全部路線畫成灰色常駐底圖；本專案改為「全程」模式時各日上色，故 `buildBase` 改名為 `drawAllDays(colored)`，由 `showAll()` 以 `colored=true` 呼叫。

- [ ] **Step 1: 實作 src/map.js**

```js
import { latLng } from './places.js';
import { MODE_COLORS } from './transport.js';

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

export function createMap(el, { days, resolve }) {
  const map = L.map(el, { zoomControl: false, scrollWheelZoom: true, zoomSnap: 0.25 });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const layers = {
    route: L.layerGroup().addTo(map),
    pins: L.layerGroup().addTo(map),
  };
  /** 取得某段 leg 的兩端座標；任一端無座標則回傳 null。 */
  function legCoords(day, leg) {
    const a = resolve(day.spots[leg.fromIndex].name);
    const b = resolve(day.spots[leg.toIndex].name);
    return a && b ? [latLng(a), latLng(b)] : null;
  }

  function clear() {
    layers.route.clearLayers();
    layers.pins.clearLayers();
  }

  function showAll() {
    clear();
    const bounds = [];
    for (const [i, day] of days.entries()) {
      const color = DAY_COLORS[i % DAY_COLORS.length];
      for (const leg of day.legs) {
        const pts = legCoords(day, leg);
        if (!pts) continue;
        const c = MODE_COLORS[leg.mode];
        if (!c) continue;
        L.polyline(pts, {
          color, weight: 3.2, opacity: 0.85, lineCap: 'round',
          dashArray: leg.mode === 'drive' ? '8 8' : null,
        }).addTo(layers.route);
        bounds.push(...pts);
      }
    }
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [46, 46] });
  }

  function showDay(index) {
    clear();
    const day = days[index];
    const bounds = [];
    for (const leg of day.legs) {
      const pts = legCoords(day, leg);
      if (!pts) continue;
      const c = MODE_COLORS[leg.mode];
      if (!c) continue;
      L.polyline(pts, {
        color: c, weight: 3, opacity: 0.95, lineCap: 'round',
        dashArray: leg.mode === 'drive' ? '7 7' : null,
      }).addTo(layers.route);
      bounds.push(...pts);
    }
    for (const spot of day.spots) {
      const p = resolve(spot.name);
      if (!p) continue;
      L.circleMarker(latLng(p), {
        radius: 6, color: '#fff', weight: 2,
        fillColor: spot.stay ? '#7a5cc4' : '#0e7ad4', fillOpacity: 1,
      }).addTo(layers.pins);
      bounds.push(latLng(p));
    }
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 12 });
  }

  return { showAll, showDay };
}
```

- [ ] **Step 2: 在 main.js 接上地圖**

於 `src/main.js` 的 `start()` 末端，把 `window.__trip = ...` 那行換成：

```js
  const mapApi = createMap(document.getElementById('map'), { days, resolve });
  mapApi.showAll();

  window.__trip = { days, resolve, tabs, mapApi };
```

並於檔案頂端加入 `import { createMap } from './map.js';`

- [ ] **Step 3: 驗證只有一個地圖實體且全程可見**

Run:
```bash
agent-browser open "http://localhost:8777/"
agent-browser eval "JSON.stringify({maps: document.querySelectorAll('.leaflet-container').length, lines: document.querySelectorAll('.leaflet-overlay-pane path').length, attrib: document.querySelector('.leaflet-control-attribution').textContent.includes('OpenStreetMap')})"
```
Expected: `{"maps":1,"lines":35,"attrib":true}`——`lines` 為七天可畫線的 leg 總數，若略有出入請確認是否有 leg 因缺座標而略過

- [ ] **Step 4: 驗證單日切換**

Run: `agent-browser eval "window.__trip.mapApi.showDay(3); document.querySelectorAll('.leaflet-overlay-pane path').length"`
Expected: 小於全程的線數（Day 4 為自駕日，僅 6 段）

- [ ] **Step 5: Commit**

```bash
git add src/map.js src/main.js
git commit -m "feat: render the map with all-days and single-day modes"
```

---

### Task 11: 日期時間軸

**Files:**
- Create: `src/timeline.js`
- Modify: `src/main.js`
- Modify: `index.html`（加入時間軸 CSS）

**Interfaces:**
- Consumes: `src/transport.js` 的 `MODE_COLORS`
- Produces: `renderTimeline(el, {days, tripEnd, onSelect}): { select(index|null): void }`
  - `onSelect(index: number|null)`，`null` 代表「全程」

- [ ] **Step 1: 加入時間軸 CSS**

於 `index.html` 的 `<style>` 內加入（由原型 `:34-42` 移植並調整）：

```css
#daylist{background:var(--paper);border:1px solid var(--line);border-radius:22px;
  overflow-y:auto;padding:14px 12px;
  box-shadow:0 1px 1px rgba(43,39,33,.03),0 26px 46px -34px rgba(43,39,33,.5)}
.day{position:relative;display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;
  padding:12px 14px 12px 26px;border-radius:12px;cursor:pointer;transition:background .2s}
.day::before{content:"";position:absolute;left:12px;top:0;bottom:0;width:1px;background:var(--line)}
.day:first-child::before{top:50%}
.day:last-child::before{bottom:50%}
.day::after{content:"";position:absolute;left:9.5px;top:50%;width:6px;height:6px;margin-top:-3px;
  border-radius:50%;background:#d8d0c1}
.day:hover{background:#f7f1e4}
.day.on{background:#dcefff}
.day.on::after{background:var(--jr);box-shadow:0 0 0 3px rgba(14,122,212,.22)}
.day.all.on{background:#f2ecff}
.day.all.on::after{background:var(--stay);box-shadow:0 0 0 3px rgba(122,92,196,.24)}
.day .lb{font-size:9.5px;letter-spacing:.24em;color:var(--ink-3)}
.day .dd{font-family:"Zen Maru Gothic";font-weight:700;font-size:18px}
.day .dd em{font-style:normal;font-size:11px;font-weight:500;color:var(--ink-3);margin-left:6px}
.day .ci{font-size:11.5px;color:var(--ink-2);margin-top:2px}
.day.pend{opacity:.5;cursor:default}
@media(max-width:820px){#daylist{display:flex;overflow-x:auto;overflow-y:hidden}
  .day{flex:0 0 auto;padding-left:14px}.day::before,.day::after{display:none}}
```

- [ ] **Step 2: 實作 src/timeline.js**

```js
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function weekday(date) {
  return WEEK[new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay()];
}

function mmdd(date) {
  return String(date.m).padStart(2, '0') + '/' + String(date.d).padStart(2, '0');
}

/**
 * 時間軸首列為「全程」，末列為尚未規劃的區間（若有）。
 * 未規劃區間刻意保留，讓行程的空缺在畫面上看得見。
 */
export function renderTimeline(el, { days, tripEnd, onSelect }) {
  const rows = [];

  const all = document.createElement('div');
  all.className = 'day all';
  all.innerHTML = `<div><div class="lb">OVERVIEW</div>`
    + `<div class="dd">全程<em>${days.length} 天</em></div>`
    + `<div class="ci">${[...new Set(days.map(d => d.city))].filter(Boolean).join(' · ')}</div></div>`;
  all.addEventListener('click', () => select(null));
  rows.push({ el: all, index: null });
  el.appendChild(all);

  days.forEach((d, i) => {
    const row = document.createElement('div');
    row.className = 'day';
    row.innerHTML = `<div><div class="lb">DAY ${i + 1}</div>`
      + `<div class="dd">${mmdd(d.date)}<em>（${weekday(d.date)}）</em></div>`
      + `<div class="ci">${d.city}</div></div>`;
    row.addEventListener('click', () => select(i));
    rows.push({ el: row, index: i });
    el.appendChild(row);
  });

  const last = days[days.length - 1];
  if (last && last.date.iso < tripEnd) {
    const pend = document.createElement('div');
    pend.className = 'day pend';
    pend.innerHTML = `<div><div class="lb">未規劃</div>`
      + `<div class="dd">至 ${tripEnd.slice(5).replace('-', '/')}</div>`
      + `<div class="ci">待規劃</div></div>`;
    el.appendChild(pend);
  }

  function select(index) {
    rows.forEach(r => r.el.classList.toggle('on', r.index === index));
    onSelect(index);
  }

  return { select };
}
```

- [ ] **Step 3: 在 main.js 接上時間軸**

於 `src/main.js` 加入 `import { renderTimeline } from './timeline.js';` 與 `import { TRIP_END } from '../config.js';`（與既有的 `TRIP_START` 併為同一行 import），並把地圖那段改為：

```js
  const mapApi = createMap(document.getElementById('map'), { days, resolve });

  const timeline = renderTimeline(document.getElementById('daylist'), {
    days, tripEnd: TRIP_END,
    onSelect: index => (index === null ? mapApi.showAll() : mapApi.showDay(index)),
  });
  timeline.select(null);

  window.__trip = { days, resolve, tabs, mapApi, timeline };
```

- [ ] **Step 4: 驗證時間軸**

Run:
```bash
agent-browser open "http://localhost:8777/"
agent-browser eval "JSON.stringify({rows: document.querySelectorAll('.day').length, on: document.querySelector('.day.on .dd').textContent, pend: !!document.querySelector('.day.pend')})"
```
Expected: `{"rows":9,"on":"全程7 天","pend":true}`——9 列為 全程 + 7 天 + 未規劃

- [ ] **Step 5: 驗證點選切換**

Run:
```bash
agent-browser find text "12/28" click
agent-browser eval "document.querySelector('.day.on .dd').textContent"
```
Expected: 含 `12/28`

- [ ] **Step 6: Commit**

```bash
git add src/timeline.js src/main.js index.html
git commit -m "feat: add day timeline with all-days row and unplanned range"
```

---

### Task 12: 景點卡片與自動連播

**Files:**
- Create: `src/cards.js`
- Modify: `src/main.js`
- Modify: `index.html`（加入卡片 CSS）

**Interfaces:**
- Consumes: `src/places.js` 的 resolver
- Produces: `renderCards(el, {day, resolve}): void`、`startAutoplay({days, timeline, delayMs}): { stop(): void }`

- [ ] **Step 1: 加入卡片 CSS**

於 `index.html` 的 `<style>` 內加入（由原型 `:64-73` 移植）：

```css
#cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:22px;
  padding:34px 0 60px}
.card{background:var(--paper);border:1px solid var(--line);border-radius:20px;overflow:hidden;
  box-shadow:0 1px 1px rgba(43,39,33,.03),0 20px 34px -32px rgba(43,39,33,.6);
  transition:transform .25s}
.card:hover{transform:translateY(-3px)}
.card .img{aspect-ratio:4/3;background:#f4ece0;border-bottom:1px dashed rgba(43,39,33,.16)}
.card .img img{width:100%;height:100%;object-fit:cover;display:block}
.card .body{padding:16px 18px 20px;display:flex;flex-direction:column;gap:7px}
.card .tag{align-self:flex-start;background:var(--jr);color:#fff;border-radius:99px;
  padding:3px 11px;font-size:11px;letter-spacing:.08em}
.card .tag.stay{background:var(--stay)}
.card h3{font-family:"Zen Maru Gothic";font-weight:700;font-size:16.5px;margin:0}
.card .kana{font-size:10.5px;letter-spacing:.1em;color:var(--ink-3)}
.card p{font-size:12.5px;line-height:1.85;color:var(--ink-2);margin:0;text-wrap:pretty}
.card.pending{opacity:.6}
@media(max-width:560px){#cards{grid-template-columns:1fr}}
```

- [ ] **Step 2: 實作 src/cards.js**

```js
/** 渲染當日景點卡片。地點為空者以「待定」呈現，不隱藏。 */
export function renderCards(el, { day, resolve }) {
  el.innerHTML = day.spots.map((s, i) => {
    const p = s.name ? resolve(s.name) : null;
    const img = p?.photo
      ? `<img src="${p.photo}" alt="${s.name}" loading="lazy">`
      : '';
    const desc = p?.desc || s.activity || '';
    return `<article class="card${s.pending ? ' pending' : ''}">
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

/**
 * 自動連播：全程停留 delayMs 後進 Day 1，之後逐日推進，播完回到全程。
 * 使用者點選任一日期即停止（由 main.js 呼叫 stop()）。
 */
export function startAutoplay({ days, timeline, delayMs = 2600 }) {
  let timer = null;
  let i = -1;
  let stopped = false;

  function tick() {
    if (stopped) return;
    i += 1;
    if (i >= days.length) i = -1;
    timeline.select(i < 0 ? null : i);
    timer = setTimeout(tick, delayMs);
  }

  timer = setTimeout(tick, delayMs);

  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}
```

- [ ] **Step 3: 在 main.js 接上卡片與連播**

於 `src/main.js` 加入 `import { renderCards, startAutoplay } from './cards.js';`，並把時間軸那段改為：

```js
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

  window.__trip = { days, resolve, tabs, mapApi, timeline };
```

- [ ] **Step 4: 驗證卡片與連播**

Run:
```bash
agent-browser open "http://localhost:8777/"
agent-browser eval "window.__trip.timeline.select(0); document.querySelectorAll('.card').length"
```
Expected: `6`（Day 1 有 6 個景點）

Run: `agent-browser eval "window.__trip.timeline.select(5); JSON.stringify([...document.querySelectorAll('.card h3')].map(h=>h.textContent))"`
Expected: 含 `五稜郭公園`、`成吉思汗大黑屋 函館五稜郭店`、`待定`——第三張為 12/30 晚餐那列，地點欄為空

- [ ] **Step 5: 驗證使用者點選後停止連播**

Run:
```bash
agent-browser find text "12/26" click
agent-browser eval "new Promise(r=>setTimeout(()=>r(document.querySelector('.day.on .dd').textContent),6000))"
```
Expected: 仍為含 `12/26` 的文字——超過兩個連播週期而未自動前進

- [ ] **Step 6: Commit**

```bash
git add src/cards.js src/main.js index.html
git commit -m "feat: render day cards and autoplay from the all-days view"
```

---

### Task 13: 部署與線上驗證

**Files:**
- Create: `.nojekyll`
- Modify: `README.md`

**Interfaces:**
- Consumes: 全部
- Produces: 公開網址

- [ ] **Step 1: 建立 .nojekyll**

GitHub Pages 預設以 Jekyll 處理，會略過底線開頭的檔案。建立空檔案關閉：

```bash
touch .nojekyll
```

- [ ] **Step 2: 撰寫 README.md**

```markdown
# 北海道小旅行

2026/12/25 – 2027/01/03 行程網站。資料即時取自 Google 試算表，改試算表即更新網站。

## 開發

    npm install
    npm test        # 單元測試
    npm run dev     # http://localhost:8777

`file://` 無法載入 ES modules，本機開發請務必透過 `npm run dev`。

## 資料

行程資料在 Google 試算表的六個頁籤，ID 與 GID 定義於 `config.js`。
座標與景點介紹在 `places.json`；試算表新增的未知地點會即時地理編碼，
查不到時仍會出現在卡片列表，並於畫面提示待補。

匯率（`config.js` 的 `RATE`）出發前請確認。

## 隱私

`src/sheets.js` 的 `COLUMNS` 是欄位白名單。網站部署於公開網址，
「交通」頁籤的訂位欄刻意不列入。新增欄位預設不顯示。

## 授權與署名

地圖圖磚 © OpenStreetMap contributors。
```

- [ ] **Step 3: 執行完整測試**

Run: `npm test`
Expected: PASS，全部測試綠燈

- [ ] **Step 4: 推上 GitHub 並啟用 Pages**

```bash
gh repo create hokkaido-trip --private --source=. --remote=origin --push
gh api -X POST repos/:owner/hokkaido-trip/pages -f "source[branch]=main" -f "source[path]=/"
```

- [ ] **Step 5: 線上驗證**

等待部署完成後，以公開網址執行：

```bash
agent-browser open "https://<owner>.github.io/hokkaido-trip/"
agent-browser eval "JSON.stringify({days: window.__trip.days.length, maps: document.querySelectorAll('.leaflet-container').length, attrib: document.querySelector('.leaflet-control-attribution').textContent.includes('OpenStreetMap'), leak: document.documentElement.outerHTML.includes('ABC123')})"
```
Expected: `{"days":7,"maps":1,"attrib":true,"leak":false}`

跨網域抓取在 HTTPS 下必須成立——這是本階段最關鍵的線上驗證。

- [ ] **Step 6: 驗證降級路徑**

暫時將 `config.js` 的 `SHEET_ID` 改為無效值並重新載入本機頁面，確認顯示錯誤訊息與可能原因，而非空白畫面。驗證後還原。

Run: `agent-browser eval "document.getElementById('map').textContent.includes('無法載入行程資料')"`
Expected: `true`

- [ ] **Step 7: Commit**

```bash
git add .nojekyll README.md
git commit -m "docs: add readme and enable GitHub Pages"
git push
```

---

## 自我檢查結果

**規格覆蓋**——比對 `openspec/changes/build-hokkaido-trip-site/specs/`：

| 規格 | 涵蓋於 |
|---|---|
| `trip-data-sync` 即時抓取六頁籤 | Task 5 |
| `trip-data-sync` 單一頁籤失敗隔離 | Task 5、Task 13 Step 6 |
| `trip-data-sync` 欄位白名單 | Task 5、Task 9 Step 4、Task 13 Step 5 |
| `trip-data-sync` 相鄰列推導路線 | Task 6 |
| `trip-data-sync` 交通方式分類 | Task 4 |
| `trip-data-sync` 跨頁籤日期關聯與跨年排序 | Task 3、Task 6 |
| `trip-data-sync` 特殊列處理 | Task 6、Task 12 |
| `itinerary-map` 全站只有一個地圖實體 | Task 10 Step 3 |
| `itinerary-map` 全程與單日兩種模式 | Task 10 |
| `itinerary-map` 全程為載入預設 | Task 11、Task 12 |
| `itinerary-map` 未規劃日期可見 | Task 11 |
| `itinerary-map` 地名簿與別名 | Task 7 |
| `itinerary-map` 未知地點不中斷渲染 | Task 8、Task 9 |
| `site-shell` 設計 token | Task 9 |
| `site-shell` 響應式 | Task 9、Task 11、Task 12 |
| `site-shell` 純靜態部署與 attribution | Task 13 |

**本階段刻意不涵蓋**（屬階段二）：`trip-overview`、`dining-guide`、`lodging-guide`、`budget-summary`、`prep-checklist`，以及 `itinerary-map` 的單日動畫播放與 OSRM 道路路徑。

**單日動畫的處置**：Task 10 只做靜態的單日路線繪製。原型 `render()` `:560-681`、`showSpotCard()` `:704-721`、`applyHeading()` `:722-732` 的載具動畫是獨立且份量可觀的一段，移到階段二第一項，以免拖長本階段的上線時程。階段一結束時網站已完整可用：可看全程、可切換單日、可讀景點卡。

---

## 執行方式

**Plan complete and saved to `docs/superpowers/plans/2026-08-14-hokkaido-site-phase1-core.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
