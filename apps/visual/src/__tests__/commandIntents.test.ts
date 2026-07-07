import { describe, expect, it } from 'vitest';
import {
  isRefreshAllCommand,
  parseBirthCommand,
  parseLiuyaoCommand,
  parseMeihuaCommand,
  parseReaderSearchCommand,
} from '@/lib/commandIntents';

describe('command intent parsers', () => {
  it('parses a Chinese solar birth command', () => {
    const parsed = parseBirthCommand('生辰 1992-03-04 9 女');
    expect(parsed?.patch).toMatchObject({
      year: 1992,
      month: 3,
      day: 4,
      hour: 9,
      gender: '女',
    });
  });

  it('parses lunar birth commands', () => {
    const parsed = parseBirthCommand('农历 1992-3-4 23 男');
    expect(parsed?.patch).toMatchObject({
      year: 1992,
      month: 3,
      day: 4,
      hour: 23,
      gender: '男',
      isLunar: true,
    });
  });

  it('does not treat a bare year as birth data', () => {
    expect(parseBirthCommand('2026')).toBeNull();
  });

  it('clamps out-of-range birth fields', () => {
    const parsed = parseBirthCommand('birth 2200 15 40 99 female');
    expect(parsed?.patch).toMatchObject({
      year: 2100,
      month: 12,
      day: 31,
      hour: 23,
      gender: '女',
    });
  });
});

describe('divination and reader command parsers', () => {
  it('parses Liuyao coin quick commands', () => {
    const parsed = parseLiuyaoCommand('六爻 今日财运');
    expect(parsed).toMatchObject({
      method: 'coin',
      question: '今日财运',
      recast: true,
    });
  });

  it('parses Liuyao manual quick commands', () => {
    const parsed = parseLiuyaoCommand('六爻 手动 789789 考试');
    expect(parsed).toMatchObject({
      method: 'manual',
      yaoValues: '789789',
      question: '考试',
    });
  });

  it('parses Meihua trigram quick commands', () => {
    const parsed = parseMeihuaCommand('梅花 乾 坤 3 克');
    expect(parsed).toMatchObject({
      upper: '乾',
      lower: '坤',
      movingLine: 3,
      relation: '克',
    });
  });

  it('parses pinyin Meihua trigram quick commands', () => {
    const parsed = parseMeihuaCommand('meihua qian kun 3');
    expect(parsed).toMatchObject({
      upper: '乾',
      lower: '坤',
      movingLine: 3,
    });
  });

  it('parses reader search commands', () => {
    expect(parseReaderSearchCommand('古籍 生气')).toMatchObject({ term: '生气' });
    expect(parseReaderSearchCommand('reader 八宅')).toMatchObject({ term: '八宅' });
  });

  it('detects refresh all commands', () => {
    expect(isRefreshAllCommand('刷新全部')).toBe(true);
    expect(isRefreshAllCommand('refresh all')).toBe(true);
    expect(isRefreshAllCommand('八字')).toBe(false);
  });
});
