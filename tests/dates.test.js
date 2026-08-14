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
