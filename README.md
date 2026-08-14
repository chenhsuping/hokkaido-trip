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
