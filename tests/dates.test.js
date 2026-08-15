import { describe, it, expect } from 'vitest';
import { parseDate, compareDates, monthDay, matchByDate, findDateAnomalies, inferYear, diffDays, daysBetweenInclusive, addDays } from '../src/dates.js';

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

describe('inferYear', () => {
  it('月份接近行程起始月時用起始年', () => {
    expect(inferYear(12, '2026-12-25', '2027-01-03')).toBe(2026);
  });

  it('月份接近行程結束月時用結束年', () => {
    expect(inferYear(1, '2026-12-25', '2027-01-03')).toBe(2027);
  });

  it('行程未跨年時兩者同年', () => {
    expect(inferYear(7, '2026-07-01', '2026-07-10')).toBe(2026);
  });
});

describe('diffDays', () => {
  it('計算相差天數', () => {
    expect(diffDays('2026-12-28', '2026-12-31')).toBe(3);
  });

  it('跨年也正確', () => {
    expect(diffDays('2026-12-31', '2027-01-02')).toBe(2);
  });

  it('同一天為 0', () => {
    expect(diffDays('2026-12-25', '2026-12-25')).toBe(0);
  });
});

describe('daysBetweenInclusive', () => {
  it('頭尾都算入', () => {
    expect(daysBetweenInclusive('2026-12-25', '2027-01-03')).toBe(10);
  });

  it('單日行程為 1', () => {
    expect(daysBetweenInclusive('2026-12-25', '2026-12-25')).toBe(1);
  });
});

describe('addDays', () => {
  it('同月內加減', () => {
    expect(addDays('2026-12-25', 1)).toBe('2026-12-26');
    expect(addDays('2026-12-25', -1)).toBe('2026-12-24');
  });

  it('跨月', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });

  it('跨年——這趟行程正好跨年，算錯會讓住宿對不上日期', () => {
    expect(addDays('2027-01-02', 1)).toBe('2027-01-03');
    expect(addDays('2026-12-30', 4)).toBe('2027-01-03');
  });

  it('無法解析的日期回傳 null', () => {
    expect(addDays('', 1)).toBeNull();
  });
});
