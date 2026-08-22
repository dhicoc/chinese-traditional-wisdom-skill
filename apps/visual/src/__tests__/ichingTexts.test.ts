import { describe, expect, it } from 'vitest';
import {
  changeHexagramLines,
  findCanonicalHexagramByName,
  getCanonicalHexagram,
  getHexagramRelations,
  ICHING_DATA_PROVENANCE,
  listCanonicalHexagrams,
  resolveHexagram,
  resolveHexagramLines,
  searchCanonicalHexagrams,
  TRIGRAM_ORDER,
} from '@/legacy/ichingTexts';

describe('六十四卦规范模型', () => {
  it('完整覆盖文王六十四卦、Unicode 和唯一爻形', () => {
    const all = listCanonicalHexagrams();

    expect(all).toHaveLength(64);
    expect(all.map((hexagram) => hexagram.number)).toEqual(Array.from({ length: 64 }, (_, index) => index + 1));
    expect(new Set(all.map((hexagram) => hexagram.name))).toHaveLength(64);
    expect(new Set(all.map((hexagram) => hexagram.symbol))).toHaveLength(64);
    expect(new Set(all.map((hexagram) => hexagram.linesBottomUp.join(''))).size).toBe(64);
    expect(all[0]).toMatchObject({ number: 1, name: '乾', fullName: '乾为天', symbol: '䷀', codePoint: 'U+4DC0' });
    expect(all[63]).toMatchObject({ number: 64, name: '未济', fullName: '火水未济', symbol: '䷿', codePoint: 'U+4DFF' });
  });

  it('八个上卦与八个下卦的 64 种组合各对应唯一一卦', () => {
    const resolved = TRIGRAM_ORDER.flatMap((upper) => TRIGRAM_ORDER.map((lower) => resolveHexagram(upper, lower)));

    expect(resolved.every(Boolean)).toBe(true);
    expect(new Set(resolved.map((hexagram) => hexagram?.number)).size).toBe(64);
    expect(resolveHexagram('離', '坤')).toMatchObject({ number: 35, name: '晋', fullName: '火地晋' });
    expect(resolveHexagram('天', '泽')).toMatchObject({ number: 10, name: '履', fullName: '天泽履' });
  });

  it('每卦均有卦辞、六条爻辞和彖传', () => {
    for (const hexagram of listCanonicalHexagrams()) {
      expect(hexagram.guaCi, `${hexagram.number} ${hexagram.name} 卦辞`).toBeTruthy();
      expect(hexagram.yaoCi, `${hexagram.number} ${hexagram.name} 爻辞`).toHaveLength(6);
      expect(hexagram.yaoCi.every(Boolean), `${hexagram.number} ${hexagram.name} 爻辞完整`).toBe(true);
      expect(hexagram.tuanZhuan, `${hexagram.number} ${hexagram.name} 彖传`).toBeTruthy();
    }
  });

  it('支持编号、简繁卦名、全名、Unicode、上下卦和原文查询', () => {
    expect(findCanonicalHexagramByName('晉')).toMatchObject({ number: 35, name: '晋' });
    expect(findCanonicalHexagramByName('火地晋')).toMatchObject({ number: 35, name: '晋' });
    expect(findCanonicalHexagramByName('火地晉')).toMatchObject({ number: 35, name: '晋' });
    expect(findCanonicalHexagramByName('䷢')).toMatchObject({ number: 35, name: '晋' });
    expect(findCanonicalHexagramByName('上离下坤')).toMatchObject({ number: 35, name: '晋' });
    expect(searchCanonicalHexagrams('35')).toHaveLength(1);
    expect(searchCanonicalHexagrams('第35卦')[0]).toMatchObject({ name: '晋' });
    expect(searchCanonicalHexagrams('明出地上').some((hexagram) => hexagram.number === 35)).toBe(true);
  });

  it('可由六爻阴阳结构精确反查，不接受不完整输入', () => {
    expect(resolveHexagramLines(['yang', 'yang', 'yang', 'yang', 'yang', 'yang'])).toMatchObject({ number: 1, name: '乾' });
    expect(resolveHexagramLines(['yin', 'yin', 'yin', 'yin', 'yin', 'yin'])).toMatchObject({ number: 2, name: '坤' });
    expect(resolveHexagramLines(['yang', 'yin'])).toBeNull();
    expect(resolveHexagramLines(['yang', 'yin', 'invalid', 'yin', 'yin', 'yang'] as never)).toBeNull();
  });

  it('本地计算错卦、综卦和互卦，并覆盖全部 64 卦', () => {
    for (const hexagram of listCanonicalHexagrams()) {
      const relations = getHexagramRelations(hexagram);
      expect(relations, `${hexagram.number} ${hexagram.name} 关系`).not.toBeNull();
      expect(relations?.cuo.number).toBeGreaterThanOrEqual(1);
      expect(relations?.zong.number).toBeLessThanOrEqual(64);
      expect(relations?.hu.linesBottomUp).toHaveLength(6);
    }
    expect(getHexagramRelations(1)).toMatchObject({
      cuo: { number: 2, name: '坤' },
      zong: { number: 1, name: '乾' },
      hu: { number: 1, name: '乾' },
    });
    expect(getHexagramRelations(11)).toMatchObject({ cuo: { number: 12 }, zong: { number: 12 } });
    expect(getHexagramRelations(63)).toMatchObject({ cuo: { number: 64 }, zong: { number: 64 } });
  });

  it('按用户明确选择的动爻计算变卦', () => {
    expect(changeHexagramLines(1, [1])).toMatchObject({ number: 44, name: '姤' });
    expect(changeHexagramLines(1, [1, 2, 3, 4, 5, 6])).toMatchObject({ number: 2, name: '坤' });
    expect(changeHexagramLines(35, [])).toMatchObject({ number: 35, name: '晋' });
    expect(changeHexagramLines(35, [0])).toBeNull();
    expect(changeHexagramLines(35, [7])).toBeNull();
  });

  it('馆藏返回防御性副本并记录固定来源', () => {
    const first = listCanonicalHexagrams();
    const second = listCanonicalHexagrams();
    first[0].aliases.push('临时别名');
    first[0].yaoCi[0] = '临时文本';

    expect(second[0].aliases).not.toContain('临时别名');
    expect(second[0].yaoCi[0]).not.toBe('临时文本');
    expect(ICHING_DATA_PROVENANCE).toMatchObject({
      source: 'kentang2017/kintaiyi',
      license: 'MIT',
      upstreamBlobSha: 'c54e68889fe33d52f95699b59e535da1d26fd3f8',
    });
  });

  it('越界编号返回空值', () => {
    expect(getCanonicalHexagram(0)).toBeNull();
    expect(getCanonicalHexagram(65)).toBeNull();
    expect(getCanonicalHexagram(1.5)).toBeNull();
  });
});
