import { describe, it, expect } from 'vitest';
import { parseCsv, toObjects } from '../src/csv.js';

describe('parseCsv', () => {
  it('解析基本列', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('保留引號內的逗號', () => {
    expect(parseCsv('a,b\n"1,5",2')).toEqual([['a', 'b'], ['1,5', '2']]);
  });

  it('保留引號內的換行', () => {
    const text = 'a,b\n"line1\nline2",2';
    expect(parseCsv(text)).toEqual([['a', 'b'], ['line1\nline2', '2']]);
  });

  it('處理逸出的雙引號', () => {
    expect(parseCsv('a\n"say ""hi"""')).toEqual([['a'], ['say "hi"']]);
  });

  it('忽略 CRLF 的 CR', () => {
    expect(parseCsv('a,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('不因結尾換行產生空列', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('toObjects', () => {
  it('以首列為鍵並去除前後空白', () => {
    const rows = [[' 日期 ', '地點'], ['2026-12-25', ' 新千歲空港 ']];
    expect(toObjects(rows)).toEqual([{ 日期: '2026-12-25', 地點: '新千歲空港' }]);
  });

  it('缺少的欄位補空字串', () => {
    expect(toObjects([['a', 'b'], ['1']])).toEqual([{ a: '1', b: '' }]);
  });
});
