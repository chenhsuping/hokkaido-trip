import { describe, it, expect } from 'vitest';
import { trainIcon, carIcon, busIcon, walkIcon, tramIcon, ICON } from '../src/icons.js';

describe('icon generators', () => {
  it('每個圖示都回傳有效的 svg 字串', () => {
    for (const fn of [trainIcon, carIcon, busIcon, walkIcon, tramIcon]) {
      const svg = fn(40);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }
  });

  it('尺寸反映在 width/height 屬性上', () => {
    expect(trainIcon(40)).toMatch(/width="\d+(\.\d+)?"/);
    expect(Number(trainIcon(40).match(/width="([\d.]+)"/)[1])).toBeGreaterThan(0);
  });

  it('列車不畫車輪——40px 下輪子只會變成車底一排難辨的黑點', () => {
    expect(trainIcon(40)).not.toContain('spinw');
    expect(trainIcon(40)).not.toContain('animateTransform');
  });

  it('列車為兩節車廂', () => {
    // 兩節車身各有一條橘色腰線
    const stripes = trainIcon(40).match(/fill="#f0a02a" opacity="\.9"/g) || [];
    expect(stripes.length).toBe(2);
  });
});

describe('ICON registry', () => {
  it('涵蓋五種交通模式，市電有專屬圖示而非沿用腳印', () => {
    expect(Object.keys(ICON).sort()).toEqual(['bus', 'drive', 'jr', 'tram', 'walk']);
    expect(ICON.tram).toBe(tramIcon);
    expect(ICON.tram).not.toBe(ICON.walk);
  });

  it('每個登記的產生器都是函式', () => {
    for (const fn of Object.values(ICON)) expect(typeof fn).toBe('function');
  });
});

describe('walkIcon 腳印動畫', () => {
  it('四個腳印，左右交錯排列', () => {
    const svg = walkIcon(40);
    expect((svg.match(/<ellipse/g) || []).length).toBe(4);
  });

  it('每個腳印依序淡入，形成一步一腳印', () => {
    const svg = walkIcon(40);
    const begins = [...svg.matchAll(/begin="([\d.]+)s"/g)].map(m => Number(m[1]));
    expect(begins).toEqual([0, 0.4, 0.8, 1.2]);
  });

  it('用內嵌 SMIL animate 而非 CSS class，避免 divIcon 重建時進度重置', () => {
    expect(walkIcon(40)).toContain('<animate');
  });
});

describe('tramIcon', () => {
  it('有集電弓與軌道，與 JR 高速列車區隔', () => {
    const svg = tramIcon(40);
    expect(svg).toContain('#5c5348');   // 集電弓
    expect(svg).not.toContain('trainBody');
  });

  it('可自訂顏色，預設為設計 token 的市電色', () => {
    expect(tramIcon(40)).toContain('#f0ad2a');
    expect(tramIcon(40, '#123456')).toContain('#123456');
  });
});
