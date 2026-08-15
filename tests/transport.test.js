import { describe, it, expect } from 'vitest';
import { classifyMode, MODE_COLORS, overrideModeByDestination } from '../src/transport.js';

describe('classifyMode', () => {
  it('辨識 JR 相關', () => {
    expect(classifyMode('JR 特急 (Kamui / Lilac)')).toBe('jr');
    expect(classifyMode('Rapid Airport')).toBe('jr');
    expect(classifyMode('JR 特急 Hokuto')).toBe('jr');
    expect(classifyMode('JR 特級北斗 (Limited)')).toBe('jr');
  });

  it('多個交通工具時取先命中者', () => {
    expect(classifyMode('Rapid Airport、JR 函館本線 (普通 / 快速)')).toBe('jr');
  });

  it('辨識自駕', () => {
    expect(classifyMode('開車')).toBe('drive');
  });

  it('辨識巴士與接駁車', () => {
    expect(classifyMode('41號巴士')).toBe('bus');
    expect(classifyMode('飯店接駁車')).toBe('bus');
  });

  it('辨識市電與地下鐵', () => {
    expect(classifyMode('市電 十字街站')).toBe('tram');
    expect(classifyMode('從市營地下鐵東豐線 到 豐水薄野站')).toBe('tram');
  });

  it('辨識步行', () => {
    expect(classifyMode('步行')).toBe('walk');
  });

  it('辨識航班', () => {
    expect(classifyMode('台灣虎航 IT234')).toBe('flight');
  });

  it('空值與無法判斷者預設為步行', () => {
    expect(classifyMode('')).toBe('walk');
    expect(classifyMode(undefined)).toBe('walk');
    expect(classifyMode('搭乘魔毯')).toBe('walk');
  });
});

describe('MODE_COLORS', () => {
  it('各 mode 的顏色符合設計 token', () => {
    expect(MODE_COLORS.jr).toBe('#0e7ad4');
    expect(MODE_COLORS.drive).toBe('#f4622e');
    expect(MODE_COLORS.bus).toBe('#12a97a');
    expect(MODE_COLORS.tram).toBe('#f0ad2a');
    expect(MODE_COLORS.walk).toBe('#f0ad2a');
  });

  it('航班有專屬顏色——開頭的桃園→新千歲航段要畫出來', () => {
    expect(MODE_COLORS.flight).toBe('#5c9ecf');
  });

  it('纜車有專屬顏色', () => {
    expect(MODE_COLORS.ropeway).toBe('#7a5cc4');
  });
});

describe('overrideModeByDestination', () => {
  it('地點含「纜車」時覆寫為 ropeway——試算表該列填的是步行', () => {
    expect(overrideModeByDestination('walk', '函館山纜車')).toBe('ropeway');
  });

  it('日文與英文寫法同樣適用', () => {
    expect(overrideModeByDestination('walk', '函館山ロープウェイ')).toBe('ropeway');
    expect(overrideModeByDestination('walk', 'Hakodate Ropeway')).toBe('ropeway');
  });

  it('一般地點維持原本的分類結果', () => {
    expect(overrideModeByDestination('walk', '八幡坂')).toBe('walk');
    expect(overrideModeByDestination('jr', 'JR 札幌站')).toBe('jr');
  });

  it('地點為空時不覆寫', () => {
    expect(overrideModeByDestination('bus', '')).toBe('bus');
    expect(overrideModeByDestination('bus', undefined)).toBe('bus');
  });
});
