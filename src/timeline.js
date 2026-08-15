const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function weekday(date) {
  return WEEK[new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay()];
}

function mmdd(date) {
  return String(date.m).padStart(2, '0') + '/' + String(date.d).padStart(2, '0');
}

/**
 * 時間軸列出各日，末列為尚未規劃的區間（若有）。
 * 未規劃區間刻意保留，讓行程的空缺在畫面上看得見。
 *
 * 沒有「全程」列：選單只給實際的日期。全程檢視仍存在（mapApi.showAll()），
 * 由 select(null) 觸發，自動連播在播完最後一天後仍會回到它。
 */
export function renderTimeline(el, { days, tripEnd, onSelect }) {
  const rows = [];

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
    return onSelect(index);
  }

  return { select };
}
