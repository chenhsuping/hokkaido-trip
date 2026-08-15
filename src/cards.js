/** 渲染當日景點卡片。地點為空者以「待定」呈現，不隱藏。 */
export function renderCards(el, { day, resolve }) {
  el.innerHTML = day.spots.map((s, i) => {
    const p = s.name ? resolve(s.name) : null;
    const img = p?.photo
      ? `<img src="${p.photo}" alt="${s.name}" loading="lazy">`
      : '';
    const desc = p?.desc || s.activity || '';
    return `<article class="card${s.pending ? ' pending' : ''}" data-index="${i}">
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

/** 把第 index 張卡片標記為 active，其餘清除。index 為 null 時只清除。 */
export function highlightCard(el, index) {
  el.querySelectorAll('.card.active').forEach(c => c.classList.remove('active'));
  if (index == null) return;
  el.querySelector(`.card[data-index="${index}"]`)?.classList.add('active');
}

/**
 * 自動連播：先顯示全程（select(null)）停留 allDwellMs 後進 Day 1；
 * 每天動畫播完（由 timeline.select() 回傳的 Promise resolve）才排程下一天，
 * 播完全部回到全程。
 *
 * 全程已不在日期選單中（使用者無法手動點選），但仍是連播的起訖狀態——
 * select(null) 會顯示全程路線並清除所有日期高亮。
 *
 * 固定間隔在階段一（靜態渲染）是對的，但單日動畫可能長達數十秒，
 * 必須等真正播完才切換，否則會在動畫播到一半時被切斷。
 */
export function startAutoplay({ days, timeline, allDwellMs = 2600, dayGapMs = 2600 }) {
  let stopped = false;
  let timer = null;

  function stop() {
    stopped = true;
    clearTimeout(timer);
  }

  function scheduleAll() {
    timeline.select(null);
    timer = setTimeout(() => { if (!stopped) playDay(0); }, allDwellMs);
  }

  async function playDay(i) {
    if (stopped) return;
    if (i >= days.length) return scheduleAll();
    await timeline.select(i);
    if (stopped) return;
    timer = setTimeout(() => playDay(i + 1), dayGapMs);
  }

  scheduleAll();
  return { stop };
}
