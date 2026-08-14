import { describe, it, expect } from 'vitest';
import { summarizePrep } from '../src/prep.js';

const row = (o = {}) => ({ 分類1: '交通', 項目名稱: '去程機票', 已完成: 'TRUE', ...o });

describe('summarizePrep', () => {
  it('解析每一項的完成狀態', () => {
    const { items } = summarizePrep([row(), row({ 已完成: 'FALSE', 項目名稱: 'eSim' })]);
    expect(items).toEqual([
      { category: '交通', name: '去程機票', done: true },
      { category: '交通', name: 'eSim', done: false },
    ]);
  });

  it('計算完成數與總數', () => {
    const { doneCount, totalCount } = summarizePrep([row(), row({ 已完成: 'FALSE' }), row({ 已完成: 'FALSE' })]);
    expect(doneCount).toBe(1);
    expect(totalCount).toBe(3);
  });

  it('百分比四捨五入為整數', () => {
    const rows = [row(), row(), row({ 已完成: 'FALSE' })];
    expect(summarizePrep(rows).pct).toBe(67);
  });

  it('空值視為未完成', () => {
    expect(summarizePrep([row({ 已完成: '' })])[0]?.done).toBeUndefined();
    expect(summarizePrep([row({ 已完成: '' })]).items[0].done).toBe(false);
  });

  it('沒有項目時不除以零', () => {
    expect(summarizePrep([])).toEqual({ items: [], doneCount: 0, totalCount: 0, pct: 0 });
  });
});
