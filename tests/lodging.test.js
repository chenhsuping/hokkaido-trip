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
