import { describe, it, expect } from 'vitest';
import { addRopewayBaseStations } from '../src/ropeway.js';

const spot = (o = {}) => ({
  name: '', time: '', city: '', activity: '', stay: false, transfer: false, pending: false, ...o,
});
const day = (spots, legs) => ({ index: 0, date: { iso: '2026-12-29' }, city: '函館市', spots, legs });
const leg = (from, to, mode, label = '') => ({ fromIndex: from, toIndex: to, mode, label, mins: null });

/** 12/29 的實際情形：走完八幡坂吃完午餐，再上函館山看夜景。 */
const hakodate = () => day(
  [
    spot({ name: '八幡坂' }),
    spot({ name: '山崎洋服店', city: '函館市' }),
    spot({ name: '函館山纜車', city: '函館市' }),
    spot({ name: '五島軒 雪河亭' }),
  ],
  [leg(0, 1, 'walk'), leg(1, 2, 'ropeway', '步行'), leg(2, 3, 'walk')],
);

describe('addRopewayBaseStations', () => {
  it('上山前後各插入一次山麓站——上去下來都經過同一站', () => {
    const out = addRopewayBaseStations([hakodate()])[0];
    expect(out.spots.map(s => s.name)).toEqual([
      '八幡坂', '山崎洋服店',
      '函館山纜車 山麓站', '函館山纜車', '函館山纜車 山麓站',
      '五島軒 雪河亭',
    ]);
  });

  it('市區的步行與山上的纜車分開，上山下山都是纜車', () => {
    const out = addRopewayBaseStations([hakodate()])[0];
    const named = out.legs.map(l => `${out.spots[l.fromIndex].name}→${out.spots[l.toIndex].name}:${l.mode}`);
    expect(named).toEqual([
      '八幡坂→山崎洋服店:walk',
      '山崎洋服店→函館山纜車 山麓站:walk',
      '函館山纜車 山麓站→函館山纜車:ropeway',
      '函館山纜車→函館山纜車 山麓站:ropeway',
      '函館山纜車 山麓站→五島軒 雪河亭:walk',
    ]);
  });

  it('上山與下山的山麓站說明不同，卡片才不會兩張一模一樣', () => {
    const out = addRopewayBaseStations([hakodate()])[0];
    const acts = out.spots.filter(s => s.name === '函館山纜車 山麓站').map(s => s.activity);
    expect(acts).toEqual(['搭纜車上山', '搭纜車下山']);
  });

  it('山麓站標為轉乘點——播放時不彈圖卡、不拉近鏡頭，直接接著上山', () => {
    const out = addRopewayBaseStations([hakodate()])[0];
    expect(out.spots.find(s => s.name === '函館山纜車 山麓站').transfer).toBe(true);
  });

  it('插入後其餘路段的索引仍指向正確的景點', () => {
    const out = addRopewayBaseStations([hakodate()])[0];
    const last = out.legs.at(-1);
    expect(out.spots[last.fromIndex].name).toBe('函館山纜車 山麓站');
    expect(out.spots[last.toIndex].name).toBe('五島軒 雪河亭');
  });

  it('沒有纜車路段的日子原封不動', () => {
    const d = day([spot({ name: 'A' }), spot({ name: 'B' })], [leg(0, 1, 'walk')]);
    const out = addRopewayBaseStations([d]);
    expect(out[0]).toBe(d);
  });

  it('起點已經是山麓站時不重複插入', () => {
    const d = day(
      [spot({ name: '函館山纜車 山麓站' }), spot({ name: '函館山纜車' })],
      [leg(0, 1, 'ropeway')],
    );
    const out = addRopewayBaseStations([d]);
    expect(out[0]).toBe(d);
  });

  it('下山後的下一站已經是山麓站時不重複插入', () => {
    const d = day(
      [spot({ name: '函館山纜車' }), spot({ name: '函館山纜車 山麓站' })],
      [leg(0, 1, 'walk')],
    );
    expect(addRopewayBaseStations([d])[0]).toBe(d);
  });

  it('山頂是當天最後一站時不會多生出下山那段', () => {
    const d = day(
      [spot({ name: '山崎洋服店' }), spot({ name: '函館山纜車' })],
      [leg(0, 1, 'ropeway')],
    );
    const out = addRopewayBaseStations([d])[0];
    expect(out.spots.map(s => s.name)).toEqual([
      '山崎洋服店', '函館山纜車 山麓站', '函館山纜車',
    ]);
  });

  it('沒有登記山麓站的纜車不動它——寧可少畫也不要亂插一站', () => {
    const d = day(
      [spot({ name: 'X' }), spot({ name: '某某纜車' })],
      [leg(0, 1, 'ropeway')],
    );
    expect(addRopewayBaseStations([d])[0]).toBe(d);
  });

  it('沒有路段的日子不報錯', () => {
    const d = day([spot({ name: 'A' })], []);
    expect(addRopewayBaseStations([d])[0]).toBe(d);
  });

  it('不改動原始 days 陣列', () => {
    const d = hakodate();
    addRopewayBaseStations([d]);
    expect(d.spots).toHaveLength(4);
    expect(d.legs).toHaveLength(3);
  });
});
