import { describe, it, expect } from 'vitest';
import { toTwd, summarizeBudget } from '../src/budget.js';

describe('toTwd', () => {
  it('只有 NTD 時直接使用', () => {
    expect(toTwd({ ntd: 1000, jpy: null }, 0.21)).toBe(1000);
  });

  it('只有 JPY 時依匯率換算', () => {
    expect(toTwd({ ntd: null, jpy: 1000 }, 0.21)).toBeCloseTo(210, 5);
  });

  it('兩者皆空回傳 null', () => {
    expect(toTwd({ ntd: null, jpy: null }, 0.21)).toBeNull();
  });
});

const row = (o = {}) => ({ 分類1: '交通', 分類2: '機票', 項目: '台灣虎航 IT234', NTD: '42,957', JPY: '', 備註: '', ...o });

describe('summarizeBudget', () => {
  it('解析千分位逗號金額', () => {
    const { items } = summarizeBudget([row()], 0.21);
    expect(items[0].ntd).toBe(42957);
  });

  it('未填金額標記 filled:false，不計為 0', () => {
    const { items } = summarizeBudget([row({ NTD: '', JPY: '' })], 0.21);
    expect(items[0].filled).toBe(false);
    expect(items[0].twd).toBeNull();
  });

  it('已填金額項數與總項數', () => {
    const { filledCount, totalCount } = summarizeBudget([
      row(), row({ NTD: '', JPY: '' }),
    ], 0.21);
    expect(filledCount).toBe(1);
    expect(totalCount).toBe(2);
  });

  it('總額只加總已填項目，日圓依匯率換算', () => {
    const { totalTwd } = summarizeBudget([
      row({ NTD: '1000', JPY: '' }),
      row({ NTD: '', JPY: '1000' }),
      row({ NTD: '', JPY: '' }),
    ], 0.21);
    expect(totalTwd).toBeCloseTo(1210, 5);
  });

  it('分類彙總依分類1加總，未填則該分類為 null', () => {
    const { categoryTotals } = summarizeBudget([
      row({ 分類1: '交通', NTD: '1000' }),
      row({ 分類1: '生活', NTD: '', JPY: '' }),
    ], 0.21);
    const life = categoryTotals.find(c => c.category === '生活');
    expect(life.twd).toBeNull();
    const transport = categoryTotals.find(c => c.category === '交通');
    expect(transport.twd).toBe(1000);
  });
});
