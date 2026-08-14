/** 完成度完全來自試算表，網站不提供勾選互動或本機覆寫。 */
export function summarizePrep(rows) {
  const items = rows.map(r => ({
    category: r['分類1'] || '',
    name: r['項目名稱'] || '',
    done: r['已完成'] === 'TRUE',
  }));
  const doneCount = items.filter(it => it.done).length;
  const totalCount = items.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  return { items, doneCount, totalCount, pct };
}
