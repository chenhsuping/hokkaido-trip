import { describe, it, expect } from 'vitest';
import { trainIcon, carIcon, busIcon, walkIcon, ICON } from '../src/icons.js';

describe('icon generators', () => {
  it('每個圖示都回傳有效的 svg 字串', () => {
    for (const fn of [trainIcon, carIcon, busIcon, walkIcon]) {
      const svg = fn(40);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }
  });

  it('尺寸反映在 width/height 屬性上', () => {
    expect(trainIcon(40)).toMatch(/width="6\d(\.\d+)?"/);
  });
});

describe('ICON registry', () => {
  it('涵蓋五種交通模式，tram 與 walk 共用同一圖示', () => {
    expect(Object.keys(ICON).sort()).toEqual(['bus', 'drive', 'jr', 'tram', 'walk']);
    expect(ICON.tram).toBe(ICON.walk);
  });

  it('每個登記的產生器都是函式', () => {
    for (const fn of Object.values(ICON)) expect(typeof fn).toBe('function');
  });
});
