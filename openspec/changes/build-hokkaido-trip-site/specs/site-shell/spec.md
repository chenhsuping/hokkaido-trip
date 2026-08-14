## ADDED Requirements

### Requirement: 吸頂導覽列

系統 SHALL 提供吸頂導覽列，可跳至各內容區塊。

#### Scenario: 捲動頁面

- **WHEN** 使用者向下捲動
- **THEN** 導覽列固定於視窗頂端

#### Scenario: 點選導覽項目

- **WHEN** 使用者點選任一導覽項目
- **THEN** 頁面捲動至對應區塊

### Requirement: 沿用既有設計 token

系統 SHALL 沿用既有原型的設計 token，SHALL NOT 引入新色票。

| Token | 值 |
|---|---|
| `--ink` | `#2b2721` |
| `--ink-2` | `#6a6055` |
| `--ink-3` | `#a89c8c` |
| `--paper` | `#fffefb` |
| `--bg` | `#fff4e2` |
| `--line` | `rgba(43,39,33,.12)` |
| JR／主色 | `#0e7ad4` |
| 自駕 | `#f4622e` |
| 巴士 | `#12a97a` |
| 步行／市電 | `#f0ad2a` |
| 住宿 | `#7a5cc4` |

字體為 `Zen Maru Gothic`（標題）與 `Noto Sans TC`（正文）；圓角為面板 22、卡片 20、圖卡 14、膠囊 99。

#### Scenario: 新增內容區塊

- **WHEN** 實作任一新區塊
- **THEN** 其配色、字體與圓角取自上述 token

### Requirement: 響應式版面

系統 SHALL 於 1080、820、560 三個斷點調整版面，並確保頁面本身不產生水平捲動。

#### Scenario: 平板寬度瀏覽

- **WHEN** 視窗寬度小於 1080px
- **THEN** 版面縮減邊距並調整格線欄數

#### Scenario: 手機寬度瀏覽

- **WHEN** 視窗寬度小於 560px
- **THEN** 卡片改為單欄，且頁面無水平捲動

### Requirement: 純靜態部署

系統 SHALL 以純靜態檔案部署於 GitHub Pages，不需建置流程、後端或使用者帳號。

#### Scenario: 部署網站

- **WHEN** 將儲存庫推上 GitHub 並啟用 Pages
- **THEN** 網站可由公開網址開啟，且功能完整

### Requirement: 保留外部服務署名

系統 SHALL 保留 OpenStreetMap 的 attribution。

#### Scenario: 顯示地圖

- **WHEN** 地圖載入
- **THEN** 畫面上可見 `© OpenStreetMap contributors` 字樣

### Requirement: 資料落差如實呈現

系統 SHALL 如實呈現試算表中的資料落差，SHALL NOT 在程式中自行修正或隱藏。

已知落差包括：僅一個頁籤的年份更新為 2026、行程只填了 7 天／共 10 天、機票為三人份而 JR Pass 與 ICOCA 為兩人份、成吉思汗店名在頁籤間矛盾、住宿頁籤缺兩間、照片對照表兩筆與試算表命名不符。

#### Scenario: 資料存在矛盾

- **WHEN** 同一項目在不同頁籤有不一致的內容
- **THEN** 網站呈現該頁籤各自的內容，不自動選擇或覆寫

#### Scenario: 資料不完整

- **WHEN** 某欄位為空
- **THEN** 網站以「待補」等明確標示呈現，不以 0 或空白掩蓋
