/**
 * 纜車路段補上山麓站——上山與下山都要。
 *
 * 行程頁籤把「走到纜車站」和「搭纜車上山」記成同一列（交通工具欄填的是步行），
 * 於是整段——包含市區裡走路的那一半——都被畫成纜車，纜索憑空從街上長出來，
 * 而且終點停在山麓站，根本沒上山。
 *
 * 下山那段同理但方向相反：離開山頂的下一列填的是步行，實際上是先搭纜車回
 * 山麓站，才在市區走到下一個地方。不拆的話會畫成從山頂一路走下山。
 *
 * 山麓站是中途換乘點，標成 transfer，播放時不彈景點圖卡也不拉近鏡頭。
 */

/** 纜車山頂站 → 其山麓站的地名。兩個名稱都要在 places.json 裡有座標。 */
const BASE_OF = {
  '函館山纜車': '函館山纜車 山麓站',
};

const baseSpot = (name, city, activity) => ({
  name, time: '', city, activity,
  stay: false, transfer: true, pending: false,
});

/** 這一段是搭纜車上山嗎？是的話回傳要先走到的山麓站名。 */
const ascentBase = (leg, from, to) =>
  (leg.mode === 'ropeway' && BASE_OF[to?.name] !== from?.name ? BASE_OF[to?.name] : null) || null;

/** 這一段是從山頂離開嗎？是的話回傳要先搭纜車回到的山麓站名。 */
const descentBase = (leg, from, to) =>
  (leg.mode !== 'ropeway' && BASE_OF[from?.name] !== to?.name ? BASE_OF[from?.name] : null) || null;

export function addRopewayBaseStations(days) {
  return days.map(day => {
    const needsSplit = day.legs.some(l => {
      const from = day.spots[l.fromIndex], to = day.spots[l.toIndex];
      return ascentBase(l, from, to) || descentBase(l, from, to);
    });
    if (!needsSplit) return day;

    // 重建時依賴一個既有的性質：legs 是一條首尾相接的鏈，legs[j] 由 spots[j]
    // 連到 spots[j+1]（buildItinerary 如此產生，bookend 與 opening 的插入也維持）。
    const spots = [day.spots[day.legs[0].fromIndex]];
    const legs = [];
    const push = (spot, leg) => {
      spots.push(spot);
      legs.push({ ...leg, fromIndex: spots.length - 2, toIndex: spots.length - 1 });
    };

    for (const leg of day.legs) {
      const from = day.spots[leg.fromIndex], to = day.spots[leg.toIndex];

      const up = ascentBase(leg, from, to);
      if (up) {
        // 走到山麓站的這一段，原本那列填的交通工具就是步行
        push(baseSpot(up, to.city || '', '搭纜車上山'),
          { mode: 'walk', label: leg.label || '步行', mins: null });
      }

      const down = descentBase(leg, from, to);
      if (down) {
        push(baseSpot(down, from.city || '', '搭纜車下山'),
          { mode: 'ropeway', label: '纜車下山', mins: null });
      }

      push(to, leg);
    }

    return { ...day, spots, legs };
  });
}
