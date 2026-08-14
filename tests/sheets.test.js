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
    const rows = [{ 日期: '2026-12-25', '訂位 / 備註': 'TCCR4K', 交通工具: '步行' }];
    const out = pickColumns(rows, ['日期', '交通工具']);
    expect(out).toEqual([{ 日期: '2026-12-25', 交通工具: '步行' }]);
    expect('訂位 / 備註' in out[0]).toBe(false);
  });

  it('白名單有但資料沒有的欄位補空字串', () => {
    const out = pickColumns([{ a: '1' }], ['a', 'b']);
    expect(out).toEqual([{ a: '1', b: '' }]);
  });

  it('訂位代號不會出現在序列化結果中', () => {
    const rows = [{ 日期: '2026-12-25', '訂位 / 備註': '訂位代號：TCCR4K' }];
    const out = pickColumns(rows, COLUMNS.transport);
    expect(JSON.stringify(out)).not.toContain('TCCR4K');
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
