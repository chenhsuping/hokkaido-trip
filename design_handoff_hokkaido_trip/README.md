# Handoff: 北海道小旅行 互動行程頁（Hokkaido Trip Map）

## Overview
單頁互動行程網頁。上半部是真實地圖（OpenStreetMap 圖磚），左側日期時間軸；選日期後，交通圖示（JR 列車／汽車／巴士／腳印）沿當日實際路線移動，含轉車節點，抵達景點時彈出小圖卡並同步高亮下方對應的景點卡片。下半部是當日景點介紹卡（照片＋時間＋活動＋說明）。沒有互動時會自動連續播放（Day 1 → Day 7 → 循環）。

行程資料為 2025/12/25–12/31 實際行程（旭川 → 小樽 → 洞爺 → 函館 → 札幌）。

## About the Design Files
本包內的檔案是**用 HTML 製作的設計參考稿**（可直接開啟操作的原型），不是要直接搬進產品的生產程式碼。請在目標專案既有的技術環境（React / Vue / Next / SwiftUI…）中，用該專案既有的元件與慣例**重建**這些設計；若專案尚未建立環境，請自行選擇最適合的框架實作。

地圖與路線的資料流（Leaflet + OSRM + Wikipedia 圖片）可視為功能規格，實作時建議改為專案標準的地圖元件與後端代理。

## Fidelity
**High-fidelity（hifi）**。顏色、字級、圓角、陰影、動畫時間皆為最終值，請像素級重建；資料與座標為真實內容。

## Screens / Views

### 1. Header（頁首）
- **Purpose**：顯示行程名稱、日期範圍、圖例。
- **Layout**：`display:flex; align-items:flex-end; justify-content:space-between; gap:28px; padding:34px 40px 22px; max-width:1560px; margin:0 auto`
- **Components**
  - Eyebrow `.cap`：`HOKKAIDO · WINTER ITINERARY`，10px / letter-spacing .26em / 500 / `#f4622e`（--drive）/ uppercase
  - H1：`北海道小旅行`，Zen Maru Gothic 700 / 34px / letter-spacing .12em / line-height 1.15 / `#2b2721`。「北海道」三字包在 `<em>`，其 `::after` 是高亮筆刷：`left:-4px; right:-4px; bottom:2px; height:11px; background:rgba(244,98,46,.28); border-radius:6px; z-index:-1`
  - Sub：`2025.12.25 — 12.31　旭川 · 小樽 · 洞爺 · 函館 · 札幌（01/01–01/03 待規劃）`，12.5px / letter-spacing .1em / `#6a6055`，日期段落 `<b>` 為 500 / `#2b2721`
  - Legend：三顆膠囊（`padding:7px 14px; border-radius:99px; background:#fffefb; border:1.5px solid rgba(43,39,33,.12); font-size:11.5px; letter-spacing:.08em; font-weight:500`）
    - JR 鐵路：22px 實線，`border-top:2.5px solid #0e7ad4`
    - 租車自駕：22px 虛線，`border-top-style:dashed; color #f4622e`
    - 當晚住宿：10×10 圓角方塊 `background:#7a5cc4; border-radius:4px`

### 2. 上半部（.top）
- **Layout**：`display:grid; grid-template-columns:300px 1fr; gap:20px; padding:0 40px; height:min(660px,72vh); max-width:1560px; margin:0 auto`

#### 2a. 日期時間軸（.panel.days，左）
- 容器：`background:#fffefb; border:1px solid rgba(43,39,33,.12); border-radius:22px; box-shadow:0 1px 1px rgba(43,39,33,.03),0 26px 46px -34px rgba(43,39,33,.5); overflow-y:auto; overflow-x:hidden; padding:14px 12px`
- 每列 `.day`：`grid-template-columns:1fr auto; align-items:center; gap:10px; padding:12px 14px 12px 26px; border-radius:12px; cursor:pointer; transition:background .2s`
  - 時間軸線 `::before`：`left:12px; top:0; bottom:0; width:1px; background:rgba(43,39,33,.12)`（首列 top:50%、末列 bottom:50%）
  - 節點 `::after`：`left:9.5px; top:50%; 6×6; border-radius:50%; background:#d8d0c1`
  - hover：`background:#f7f1e4`
  - 選取 `.on`：`background:#dcefff`（JR 日）／`.drive.on` = `#ffe4d6`；節點變主色並加 `box-shadow:0 0 0 3px rgba(14,122,212,.22)`（自駕日 `rgba(244,98,46,.26)`）
  - 內容：`DAY N`（9.5px / letter-spacing .24em / `#a89c8c`）、日期（Zen Maru Gothic 700 / 18px）＋星期（11px / `#a89c8c`）、城市（11.5px / `#6a6055`）
  - 交通圖示 `.mode`：52×36，無底色，`opacity:.55`（hover .85、選取 1），圖示 24px

#### 2b. 地圖（.mapwrap，右）
- 容器：`border-radius:22px; overflow:hidden; background:#e7e3d6; box-shadow:0 1px 1px rgba(43,39,33,.05),0 30px 60px -38px rgba(11,19,26,.55)`
- Leaflet：`zoomControl:false`（另用 `L.control.zoom({position:'bottomright'})`）、`scrollWheelZoom:true`、`zoomSnap:.25`
- 圖磚：`https://tile.openstreetmap.org/{z}/{x}/{y}.png`，attribution `© OpenStreetMap contributors`（**必留**）
- 圖磚色調：`.leaflet-tile-pane{filter:grayscale(.62) sepia(.16) brightness(1.08) contrast(.9) saturate(.95)}`；`.leaflet-container{background:#dfe4dc}`
- 浮層 `.legnow`（左上，`z-index:500; pointer-events:none`）：`background:rgba(255,253,251,.94); border:1px solid var(--line); border-radius:12px; padding:10px 16px; max-width:min(420px,52%)`；內含 `Day N · 12/25`（.cap 樣式）與當前段落文字（Zen Maru Gothic 14px，單行 ellipsis）
- 提示 `.maphint`（左下）：10px / letter-spacing .12em / `#a89c8c`，半透明底
- 景點標註 `.pin`（divIcon）
  - 圓點 `.dot`：11×11、`border:2px solid #fff`、主色底、`box-shadow:0 0 0 4px rgba(14,122,212,.2)`（自駕日橘）
  - 標籤堆 `.labels`：位於圓點右側 12px（靠右側時 `.flip` 改右對齊）；靠終點（<46px）時外推 56px
  - 每筆 `b`：`background:rgba(255,253,247,.92); border:1px solid var(--line); border-radius:99px; padding:3px 8px; font-size:12px; font-weight:500`；前綴 `i` 是時間 `hh:mm`（主色、tabular-nums）
  - 住宿標籤 `b.stay`：`background:#7a5cc4; color:#fff`，時間 `#e4dcfa`
- 交通載具 `.veh`：80×52（`margin:-26px 0 0 -40px`）無底色；`.core` 用白色描邊光暈 `drop-shadow(0 0 2px #fff)×2 + drop-shadow(0 3px 5px rgba(43,39,33,.35))`；`transition:transform .5s cubic-bezier(.4,0,.2,1)`；圖示 40px
- 轉車節點 `.xfer`：12×12 圓、`background:#fdfaf4; border:2px solid #5c5348`
- 抵達圖卡 `.spotpop`：`width:180px; left:16px; top:16px`（靠右側時 `.flip` 改 `right:16px`）；`background:#fffefb; border:1px solid var(--line); border-radius:14px; box-shadow:0 18px 34px -22px rgba(43,39,33,.9)`；照片 `.ph` 高 96px（cover）；文字區 `padding:9px 11px 11px`，標題 Zen Maru Gothic 700 12.5px、副標 10.5px `#a89c8c`
  - 進場 `pop`：`.28s cubic-bezier(.2,.9,.3,1.2)`，`opacity 0→1, translateY(8px)→0, scale(.94)→1`
  - 退場 `.out` / `popout`：`.24s ease`，`opacity→0, translateY(-4px), scale(.97)`

### 3. 下半部（.bottom）
- 容器：`padding:34px 40px 60px; max-width:1560px; margin:0 auto`
- 標題列 `.bhead`：`padding-bottom:14px; border-bottom:2px dashed rgba(43,39,33,.16)`；H2 `Day N · 12/25 城市`（Zen Maru Gothic 700 / 20px / letter-spacing .05em）＋ 備註（12px / `#a89c8c`）
- 卡片格 `.cards`：`grid-template-columns:repeat(auto-fill,minmax(268px,1fr)); gap:22px`
- 卡片 `.card`：`background:#fffefb; border:1px solid rgba(43,39,33,.12); border-radius:20px; overflow:hidden; box-shadow:0 1px 1px rgba(43,39,33,.03),0 20px 34px -32px rgba(43,39,33,.6); transition:transform .25s, box-shadow .25s`；hover `translateY(-3px)`
  - 高亮 `.active`：`border-color:#0e7ad4; box-shadow:0 0 0 2px #dcefff, 0 20px 34px -26px rgba(43,39,33,.6)`（自駕日用橘＋`#ffe4d6`）
  - 圖片區 `.img`：`aspect-ratio:4/3; background:#f4ece0; border-bottom:1px dashed rgba(43,39,33,.16)`，內含 `<image-slot>`（可拖曳替換照片）
  - 內容 `.body`：`padding:16px 18px 20px; gap:7px`
    - `.tag`：膠囊 `background:#0e7ad4; color:#fff; border-radius:99px; padding:3px 11px; font-size:11px; letter-spacing:.08em`，內容 `序號 · hh:mm`；自駕日 `#f4622e`；住宿 `.stayc` = `#7a5cc4`
    - H3：Zen Maru Gothic 700 / 16.5px / letter-spacing .03em
    - `.kana`：活動內容，10.5px / letter-spacing .1em / `#a89c8c`
    - `p`：12.5px / line-height 1.85 / `#6a6055` / `text-wrap:pretty`
    - `.credit`：10px / `#a89c8c`，維基圖片出處連結（僅在使用維基圖時顯示）

## Interactions & Behavior

### 自動播放
- 載入後自動播 Day 1；每天播完停 2.6s 後跳下一天，最後一天回到 Day 1 循環。
- 使用者點任一日期 → `autoPlay = false`，自動連播停止。

### 單日播放流程（`render(dayIndex, animate)`）
1. 清除 past/route/veh/pins/card 圖層（`base` 圖層保留：全行程淺灰虛線 `#9aa0a6, weight 2, opacity .4`）。
2. 畫先前日期的路線（`#bdae99`, weight 1.6, opacity .55, dash `2 6`）。
3. 畫當日各段路線：JR `#0e7ad4`、自駕 `#f4622e`（dash `7 7`）、巴士 `#12a97a`、步行／市電 `#f0ad2a`；weight 3、播放前 opacity .2、播放時 .95。
4. 畫轉車節點（第 2 段起的起點）。
5. 畫景點標註（含住宿），螢幕距離 <70px 者合併為同一 cluster、標籤垂直堆疊 26px 行高。
6. `flyToBounds` 到當日範圍：`paddingTopLeft [120,150]`、`paddingBottomRight [100,90]`（寬度 <640px 時 [46,80] / [46,50]）、`maxZoom 12`、`duration .9`。
7. 等待「當日所有段落的道路資料 + 所有景點照片預載」（最多 9s），再延遲 400ms 開始跑第 1 段。
8. 每段開始：切換圖示、隱藏上一張圖卡、更新 `.legnow`；依整段方向一次轉正（不中途轉向）——水平位移 >4px 時決定左右翻面（`scaleX(±1)`），俯仰角限制 ±20°。
9. 段落縮放預備（`preWait` 後才開始移動）
   - <2.6km：`flyTo` 中點、zoom 15（<900m 用 16），preWait 1400ms
   - <16km：`flyToBounds` 該段兩端、`maxZoom 13.5`、duration 1，preWait 1400ms
   - 其餘且當前 zoom >12.2：退回當日全貌，duration 1.1，preWait 1400ms
10. 移動：`requestAnimationFrame`，時長 `clamp(legDist/16, 3200, 9000)`ms，easing `t<.5 ? 4t³ : 1-(-2t+2)³/2`；每 260ms 檢查載具是否接近視窗邊緣（<26% 邊界）→ `panTo` duration .7 跟隨。長度 <30m 的段落直接跳過。
11. 抵達（該段有指定景點時）：`flyTo(景點, max(currentZoom,14.5), 1s)` → 1050ms 後顯示 `.spotpop`（照片已預載）並將下方對應卡片加 `.active` → 停留 5400ms → 下一段（無景點時停留 900ms）。

### 資料來源（功能規格）
- **道路路徑**：OSRM demo（`router.project-osrm.org/route/v1/{driving|foot}/…?overview=full&geometries=geojson`），僅用於自駕／巴士／步行／市電；同時最多 3 個請求，結果快取；失敗時回退到內建的站點折線（Catmull-Rom 平滑）。
- **JR 路段**：不走路由，使用內建 `VIA` 沿線車站座標折線（千歲線、函館本線、室蘭本線等）。
- **景點照片**：`OWN`（使用者上傳，優先）→ Wikipedia `action=query&prop=pageimages&pithumbsize=900`（zh 再 ja），成功時卡片顯示出處連結。
- 生產環境建議：以後端代理或自建路由服務取代 OSRM demo；照片改為專案自有 CDN。

## State Management
- `cur`：當前日期索引
- `token`：render 世代編號（切換日期時遞增，用於中止舊動畫／舊 fetch 回填）
- `raf`：requestAnimationFrame handle
- `vehMarker`：載具 marker；`headAng` / `headFlip`：方向狀態
- `autoPlay` / `autoTimer`：自動連播
- `lastPan`：上次鏡頭跟隨時間
- `roadCache`（key = profile + 座標串）、`wikiCache`（key = 景點名）
- 圖層群組：`base / past / route / veh / pins / card`

## Design Tokens
```
--ink        #2b2721      主文字
--ink-2      #6a6055      次文字
--ink-3      #a89c8c      輔助文字
--paper      #fffefb      卡片／面板底
--bg         #fff4e2      頁面底（另加 linear-gradient(180deg,#fff8ec,#fff2dc 55%,#ffeed3)，background-attachment:fixed）
--line       rgba(43,39,33,.12)
--jr         #0e7ad4      JR／主色
--drive      #f4622e      自駕
--bus        #12a97a      巴士
walk/tram    #f0ad2a      步行／市電
stay         #7a5cc4      住宿
```
- 交通線色（JS `COL`）：jr `#0e7ad4`、drive `#f4622e`、bus `#12a97a`、walk/tram `#f0ad2a`
- 圓角：面板 22 / 卡片 20 / 圖卡 14 / 日期列 12 / 膠囊 99
- 陰影：面板 `0 1px 1px rgba(43,39,33,.03), 0 26px 46px -34px rgba(43,39,33,.5)`；卡片 `0 20px 34px -32px rgba(43,39,33,.6)`；圖卡 `0 18px 34px -22px rgba(43,39,33,.9)`
- 字體：`Zen Maru Gothic`（500/700，標題、日期、卡片標題）＋`Noto Sans TC`（300/400/500/700，正文）
- 字級：34 / 20 / 18 / 16.5 / 12.5 / 12 / 11.5 / 10.5 / 10
- RWD 斷點：1080（縮邊距、側欄 250px）、820（改為上下堆疊、日期列橫向捲動、地圖 52vh）、560（單欄卡片、地圖 46vh、載具 scale .8）

## Assets
- 18 張使用者提供的景點／住宿照片：`uploads/pasted-*.png`（`OWN` 對照表逐一指向景點名）
- 其餘景點照片由 Wikipedia pageimages 動態取得（卡片顯示出處連結）
- `image-slot.js`：可拖放替換照片的 web component（設計稿用；生產環境可改為一般 `<img>`）
- 交通圖示為內嵌 SVG（列車／汽車／巴士／腳印，皆在 `hokkaido-trip.html` 內）
- 地圖圖磚：OpenStreetMap（需保留 attribution）

## Files
- `hokkaido-trip.html` — 完整設計原型（HTML + CSS + JS + 行程資料 `DAYS` / 座標 `P` / 沿線站點 `VIA` / 段落景點對照 `LEG_SPOT` / 照片對照 `OWN`、`WIKI`）
- `image-slot.js` — 照片拖放元件
- `uploads/*.png` — 使用者提供的照片

## Screenshots
- `screenshots/01-day1-asahikawa.png`
- `screenshots/02-day2-asahiyama-zoo.png`
- `screenshots/03-day4-drive-hakodate.png`
- `screenshots/04-day5-hakodate-walk.png`
- `screenshots/05-day7-sapporo.png`
- `screenshots/06-spot-cards.png`

（截圖為原型實際畫面：Day 1 旭川、Day 2 旭山動物園、Day 4 自駕函館、Day 5 函館市區步行、Day 7 札幌，以及下半部景點卡片區。）
