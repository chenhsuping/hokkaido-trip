import { describe, it, expect } from 'vitest';
import { classifyMode, MODE_COLORS } from '../src/transport.js';

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

  it('航班不畫線', () => {
    expect(MODE_COLORS.flight).toBeNull();
  });
});
