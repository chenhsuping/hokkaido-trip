/**
 * 自動連播：從 Day 1 開始逐日播放，播完最後一天回到 Day 1 循環。
 *
 * 不再以「全程」開場——那個檢視是把七天的路線同時攤在圖上，
 * 但每段都只來得及畫成起訖兩點的直線（道路資料還沒回來就被切走），
 * 看起來像一張放射狀的直線示意圖，與逐日的實際路線對不起來。
 *
 * 每天動畫播完（由 timeline.select() 回傳的 Promise resolve）才排程下一天。
 * 固定間隔在階段一（靜態渲染）是對的，但單日動畫可能長達數十秒，
 * 必須等真正播完才切換，否則會在動畫播到一半時被切斷。
 */
export function startAutoplay({ days, timeline, dayGapMs = 2600 }) {
  let stopped = false;
  let timer = null;

  function stop() {
    stopped = true;
    clearTimeout(timer);
  }

  async function playDay(i) {
    if (stopped) return;
    const idx = i >= days.length ? 0 : i;
    await timeline.select(idx);
    if (stopped) return;
    timer = setTimeout(() => playDay(idx + 1), dayGapMs);
  }

  playDay(0);
  return { stop };
}
