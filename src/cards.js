/** 渲染當日景點卡片。地點為空者以「待定」呈現，不隱藏。 */
export function renderCards(el, { day, resolve }) {
  el.innerHTML = day.spots.map((s, i) => {
    const p = s.name ? resolve(s.name) : null;
    const img = p?.photo
      ? `<img src="${p.photo}" alt="${s.name}" loading="lazy">`
      : '';
    const desc = p?.desc || s.activity || '';
    return `<article class="card${s.pending ? ' pending' : ''}">
      <div class="img">${img}</div>
      <div class="body">
        <span class="tag${s.stay ? ' stay' : ''}">${i + 1} · ${s.time}</span>
        <h3>${s.name || '待定'}</h3>
        <div class="kana">${s.activity}</div>
        <p>${desc}</p>
      </div>
    </article>`;
  }).join('');
}

/**
 * 自動連播：全程停留 delayMs 後進 Day 1，之後逐日推進，播完回到全程。
 * 使用者點選任一日期即停止（由 main.js 呼叫 stop()）。
 */
export function startAutoplay({ days, timeline, delayMs = 2600 }) {
  let timer = null;
  let i = -1;
  let stopped = false;

  function tick() {
    if (stopped) return;
    i += 1;
    if (i >= days.length) i = -1;
    timeline.select(i < 0 ? null : i);
    timer = setTimeout(tick, delayMs);
  }

  timer = setTimeout(tick, delayMs);

  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}
