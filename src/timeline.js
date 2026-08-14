const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function weekday(date) {
  return WEEK[new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay()];
}

function mmdd(date) {
  return String(date.m).padStart(2, '0') + '/' + String(date.d).padStart(2, '0');
}

/**
 * 時間軸首列為「全程」，末列為尚未規劃的區間（若有）。
 * 未規劃區間刻意保留，讓行程的空缺在畫面上看得見。
 */
export function renderTimeline(el, { days, tripEnd, onSelect }) {
  const rows = [];

  const all = document.createElement('div');
  all.className = 'day all';
  all.innerHTML = `<div><div class="lb">OVERVIEW</div>`
    + `<div class="dd">全程<em>${days.length} 天</em></div>`
    + `<div class="ci">${[...new Set(days.map(d => d.city))].filter(Boolean).join(' · ')}</div></div>`;
  all.addEventListener('click', () => select(null));
  rows.push({ el: all, index: null });
  el.appendChild(all);

  days.forEach((d, i) => {
    const row = document.createElement('div');
    row.className = 'day';
    row.innerHTML = `<div><div class="lb">DAY ${i + 1}</div>`
      + `<div class="dd">${mmdd(d.date)}<em>（${weekday(d.date)}）</em></div>`
      + `<div class="ci">${d.city}</div></div>`;
    row.addEventListener('click', () => select(i));
    rows.push({ el: row, index: i });
    el.appendChild(row);
  });

  const last = days[days.length - 1];
  if (last && last.date.iso < tripEnd) {
    const pend = document.createElement('div');
    pend.className = 'day pend';
    pend.innerHTML = `<div><div class="lb">未規劃</div>`
      + `<div class="dd">至 ${tripEnd.slice(5).replace('-', '/')}</div>`
      + `<div class="ci">待規劃</div></div>`;
    el.appendChild(pend);
  }

  function select(index) {
    rows.forEach(r => r.el.classList.toggle('on', r.index === index));
    onSelect(index);
  }

  return { select };
}
