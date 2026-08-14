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
