import { parseDate, diffDays, inferYear, addDays } from './dates.js';
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
      // 括號裡是「住哪幾晚」，不是入住～退房：
      //   旭川 (12/25)          住 25 一晚      → 12/26 退房（與住宿頁籤填的一致）
      //   函館 (12/28 ~ 12/30)  住 28、29、30   → 12/31 退房
      //   札幌 (12/31 ~ 01/02)  住 31、1、2     → 01/03 退房
      // 曾按字面當成入住～退房，結果 12/30 與 1/2 兩晚沒人認領，
      // 那兩天的行程頭尾就補不出住宿——剛好就是這個讀法補上的兩晚。
      const lastNight = toIso(range?.checkout ?? range?.checkin, tripStart, tripEnd);
      const checkoutIso = lastNight ? addDays(lastNight, 1) : null;
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
