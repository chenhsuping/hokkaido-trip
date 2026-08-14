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
