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
