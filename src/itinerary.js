import { parseDate, compareDates } from './dates.js';
import { classifyMode } from './transport.js';

/**
 * 每一列 = 一個景點 + 抵達該景點的那一段交通。
 * 因此同日相鄰兩列即構成一段 leg；當日第一列只產生景點。
 */
export function buildItinerary(rows) {
  const byDate = new Map();

  for (const r of rows) {
    const date = parseDate(r['日期']);
    if (!date) continue;
    if (!byDate.has(date.iso)) byDate.set(date.iso, { date, rows: [] });
    byDate.get(date.iso).rows.push(r);
  }

  return [...byDate.values()]
    .sort((a, b) => compareDates(a.date, b.date))
    .map((group, index) => {
      const spots = group.rows.map(r => {
        const activity = r['活動內容'] || '';
        return {
          name: r['地點'] || '',
          time: r['抵達時間'] || '',
          city: r['城市'] || '',
          activity,
          stay: /check-in/i.test(activity),
          transfer: activity.trim() === '轉車',
          pending: !r['地點'],
        };
      });

      const legs = [];
      for (let i = 1; i < group.rows.length; i++) {
        const r = group.rows[i];
        const mins = parseInt(r['交通時間'], 10);
        legs.push({
          fromIndex: i - 1,
          toIndex: i,
          mode: classifyMode(r['交通工具']),
          label: r['交通工具'] || '',
          mins: Number.isNaN(mins) ? null : mins,
        });
      }

      return {
        index,
        date: group.date,
        city: spots.find(s => s.city)?.city || '',
        spots,
        legs,
      };
    });
}
