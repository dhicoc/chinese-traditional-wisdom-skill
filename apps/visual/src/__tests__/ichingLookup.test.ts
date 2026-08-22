import { describe, expect, it } from 'vitest';
import { parseIChingLookupRequest, runIChingLookup } from '@/legacy/ichingLookup';

describe('I Ching Agent lookup', () => {
  it('按编号返回晋卦完整原文、关系卦和变卦', () => {
    const result = runIChingLookup(parseIChingLookupRequest({ by: 'number', number: 35, changingLines: [2] }));

    expect(result).toMatchObject({
      schemaVersion: '1.0.0',
      queryMode: 'number',
      hexagram: { number: 35, name: '晋', fullName: '火地晋', symbol: '䷢' },
      changingLines: [2],
    });
    expect(result.hexagram.classicalText.yaoCi).toHaveLength(6);
    expect(result.relations.cuo.number).toBeGreaterThan(0);
    expect(result.changedHexagram?.number).toBeGreaterThan(0);
  });

  it.each([
    [{ by: 'name', name: '火地晉' }, 35],
    [{ by: 'trigrams', upper: '离', lower: '坤' }, 35],
    [{ by: 'lines', linesBottomUp: ['yin', 'yin', 'yin', 'yang', 'yin', 'yang'] }, 35],
  ] as const)('支持查询方式 %#', (input, number) => {
    expect(runIChingLookup(parseIChingLookupRequest(input)).hexagram.number).toBe(number);
  });

  it('拒绝猜测、不完整爻形和越界动爻', () => {
    expect(() => parseIChingLookupRequest({ by: 'number', number: 0 })).toThrow('1-64');
    expect(() => parseIChingLookupRequest({ by: 'lines', linesBottomUp: ['yin'] })).toThrow('6 个');
    expect(() => parseIChingLookupRequest({ by: 'name', name: '晋', changingLines: [7] })).toThrow('1-6');
    expect(() => runIChingLookup(parseIChingLookupRequest({ by: 'name', name: '不存在的卦' }))).toThrow('没有找到');
  });

  it('不回显输入对象并提供固定来源和文化边界', () => {
    const result = runIChingLookup(parseIChingLookupRequest({ by: 'number', number: 1 }));
    expect(result).not.toHaveProperty('input');
    expect(result.provenance).toMatchObject({ license: 'MIT' });
    expect(result.limitation).toContain('传统文化学习');
    expect(result.changedHexagram).toBeNull();
  });
});
