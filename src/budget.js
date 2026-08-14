function parseAmount(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

export function toTwd({ ntd, jpy }, rate) {
  if (ntd == null && jpy == null) return null;
  return (ntd ?? 0) + (jpy != null ? jpy * rate : 0);
}

/**
 * 總額只加總「已填」項目，未填顯示待補而非 0——
 * 避免把低估值誤讀為完整預算（見規格「已登錄總額」而非「總預算」）。
 */
export function summarizeBudget(rows, rate) {
  const items = rows.map(r => {
    const ntd = parseAmount(r['NTD']);
    const jpy = parseAmount(r['JPY']);
    const filled = ntd != null || jpy != null;
    return {
      category: r['分類1'] || '',
      subcategory: r['分類2'] || '',
      name: r['項目'] || '',
      ntd, jpy,
      twd: filled ? toTwd({ ntd, jpy }, rate) : null,
      filled,
    };
  });

  const totalTwd = items.reduce((sum, it) => sum + (it.twd ?? 0), 0);
  const filledCount = items.filter(it => it.filled).length;

  const byCategory = new Map();
  for (const it of items) {
    if (!byCategory.has(it.category)) byCategory.set(it.category, { hasAny: false, sum: 0 });
    const c = byCategory.get(it.category);
    if (it.filled) { c.hasAny = true; c.sum += it.twd; }
  }
  const categoryTotals = [...byCategory.entries()].map(([category, c]) => ({
    category, twd: c.hasAny ? c.sum : null,
  }));

  return { items, totalTwd, filledCount, totalCount: items.length, categoryTotals };
}
