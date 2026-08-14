import { describe, it, expect } from 'vitest';
import { makeResolver, latLng } from '../src/places.js';
import places from '../places.json' with { type: 'json' };

describe('makeResolver', () => {
  const data = {
    '蜂屋 五条創業店': { lng: 142.364, lat: 43.77, desc: '醬油拉麵老店', ramen: '醬油' },
    '成吉思汗大黑屋 五稜郭店': {
      lng: 140.7598, lat: 41.796, aliases: ['成吉思汗大黑屋 函館五稜郭店'],
    },
  };

  it('以主鍵解析', () => {
    expect(makeResolver(data)('蜂屋 五条創業店').ramen).toBe('醬油');
  });

  it('以別名解析', () => {
    const r = makeResolver(data)('成吉思汗大黑屋 函館五稜郭店');
    expect(r).not.toBeNull();
    expect(r.lat).toBe(41.796);
  });

  it('忽略空白差異', () => {
    expect(makeResolver(data)('蜂屋五条創業店')).not.toBeNull();
  });

  it('找不到時回傳 null', () => {
    expect(makeResolver(data)('不存在的店')).toBeNull();
  });
});

describe('latLng', () => {
  it('轉為 Leaflet 的 [lat, lng] 順序', () => {
    expect(latLng({ lng: 142.364, lat: 43.77 })).toEqual([43.77, 142.364]);
  });
});

describe('places.json', () => {
  const resolve = makeResolver(places);

  // 這份清單取自試算表 2026-08-14 當下的即時內容（38 個相異地點）。
  // 「Co-op Sapporo Suehiro-Nishi-ten」是使用者在實作期間新增、
  // 尚無可靠座標來源的地點，刻意不放進 places.json，
  // 用來驗證未知地點的地理編碼退路（見 tests/geocode.test.js 與 Task 9）。
  it('涵蓋試算表中已知座標來源的 37 個地點', () => {
    const names = [
      '新千歲空港', 'JR 札幌站', 'JR 旭川站', '旭川 JR 酒店', '平和通商店街',
      '蜂屋 五条創業店', '旭川巴士總站 6 號月台', '旭山動物園', '旭山動物園 巴士站',
      'JR 小樽站', 'Nord 小樽飯店', '若鶏時代 なると 本店', '三角市場', 'JR 洞爺站',
      '洞爺觀光酒店', 'JR Rent-A-Car Toya', '昭和新山熊牧場', '函館熱帶植物園',
      '湯倉神社', 'JR車站租車 函館營業所', 'Condominium View Mt Hakodate',
      '金森紅磚倉庫', 'Lucky Pierrot Marina Suehiro branch', '客美多咖啡 函館港濱店',
      '八幡坂', '山崎洋服店', '函館山纜車', '五島軒 雪河亭', '五稜郭公園',
      '成吉思汗大黑屋 函館五稜郭店', '函館朝市', 'JR 函館站',
      'Downtown area Spacious cozy room Susukino IK901', '札幌電視塔',
      '札幌時計台', '北海道廳舊本廳舍', '札幌一粒庵',
    ];
    const missing = names.filter(n => !resolve(n));
    expect(missing).toEqual([]);
  });

  it('刻意未涵蓋的新地點交由地理編碼處理', () => {
    expect(resolve('Co-op Sapporo Suehiro-Nishi-ten')).toBeNull();
  });

  it('舊試算表命名可透過別名解析', () => {
    expect(resolve('湯之川 熱帶動植物園')).not.toBeNull();
    expect(resolve('成吉思汗大黑屋 五稜郭店')).not.toBeNull();
    expect(resolve('薄野 民宿 IK1003')).not.toBeNull();
    expect(resolve('大通公園、札幌電視塔')).not.toBeNull();
  });

  it('每個項目都有有效的北海道座標', () => {
    for (const [name, p] of Object.entries(places)) {
      expect(typeof p.lat, name).toBe('number');
      expect(typeof p.lng, name).toBe('number');
      expect(p.lat, name).toBeGreaterThan(41);
      expect(p.lat, name).toBeLessThan(46);
      expect(p.lng, name).toBeGreaterThan(139);
      expect(p.lng, name).toBeLessThan(146);
    }
  });

  it('三家拉麵店標記了流派', () => {
    expect(resolve('蜂屋 五条創業店').ramen).toBe('醬油');
    expect(resolve('山崎洋服店').ramen).toBe('鹽味');
    expect(resolve('札幌一粒庵').ramen).toBe('味噌');
  });
});
