import { Solar } from 'lunar-typescript';
import { describe, expect, it } from 'vitest';
import { resolveTrueSolarTime } from '@/legacy/trueSolarTime';
import {
  compareBaziShenShaRules,
  compareBaziTimeBasis,
  compareChenguzVersions,
  compareDaliurenSchools,
  compareStructuredVariants,
  compareTaiyiRules,
  compareZiweiDynamicScope,
  parseRuleComparisonRequest,
  type RuleVariantResult,
} from '@/legacy/ruleComparison';

const CITATION = [{ id: 'test-rules', title: '测试规则', source: 'test://rules' }];
const BIRTH = { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男' as const };

function variant(id: string, facts: RuleVariantResult['facts']): RuleVariantResult {
  return { id, label: `变体 ${id}`, config: { id }, citations: CITATION, facts, factsVerified: true };
}

describe('structured rule comparison', () => {
  it('separates common values from changed values', () => {
    const result = compareStructuredVariants('test', [variant('a', { stable: '同值', changed: 1 }), variant('b', { stable: '同值', changed: 2 })], []);
    expect(result.commonFacts).toEqual([{ field: 'stable', label: 'stable', value: '同值' }]);
    expect(result.differences).toEqual([{ field: 'changed', label: 'changed', values: [
      { variantId: 'a', label: '变体 a', value: 1 }, { variantId: 'b', label: '变体 b', value: 2 },
    ] }]);
  });

  it('uses canonical key and collection ordering for objects and arrays', () => {
    const result = compareStructuredVariants('test', [
      variant('a', { nested: { b: 2, a: ['乙', '甲'] } }), variant('b', { nested: { a: ['乙', '甲'], b: 2 } }),
    ], []);
    expect(result.differences).toHaveLength(0);
    expect(result.commonFacts[0].value).toEqual({ a: ['乙', '甲'], b: 2 });
  });

  it('requires two uniquely identified and cited variants', () => {
    expect(() => compareStructuredVariants('test', [variant('a', {})], [])).toThrow('至少需要两个');
    expect(() => compareStructuredVariants('test', [variant('a', {}), variant('a', {})], [])).toThrow('id 不得重复');
    expect(() => compareStructuredVariants('test', [variant('a', {}), { ...variant('b', {}), citations: [] }], [])).toThrow('规则来源');
  });
});

describe('rule comparison domains', () => {
  it('runs and verifies Bazi ShenSha year/day variants', () => {
    const result = compareBaziShenShaRules({ birth: BIRTH, solar: Solar });
    expect(result.variants.map(({ id }) => id)).toEqual(['year', 'day']);
    expect(result.variants.every(({ factsVerified }) => factsVerified)).toBe(true);
    expect(result.variants.every(({ citations }) => citations.some(({ source }) => source === 'docs/SHENSHA-REFERENCE.md'))).toBe(true);
    expect(result.commonFacts.map(({ field }) => field)).toEqual(expect.arrayContaining(['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar', 'dayMaster', 'elementWood']));
    expect(result.differences.map(({ field }) => field)).toContain('shenShaTrineSource');
  });

  it('compares all three Chenguz versions without diffing songs', () => {
    const result = compareChenguzVersions({ birth: BIRTH, solar: Solar });
    expect(result.variants.map(({ id }) => id)).toEqual(['standard', 'folk', 'full']);
    expect(result.variants.every(({ factsVerified, citations }) => factsVerified && citations.length > 0)).toBe(true);
    expect(result.differences.map(({ field }) => field)).toEqual(expect.arrayContaining(['versionId', 'versionName']));
    expect(JSON.stringify(result)).not.toContain('song');
    expect(result.limitations.join(' ')).toContain('称骨歌属于解释性文本');
  });

  it('compares and verifies all Daliuren schools', () => {
    const result = compareDaliurenSchools({ birth: BIRTH, solar: Solar });
    expect(result.variants.map(({ id }) => id)).toEqual(['classic', 'gufa', 'daxquan']);
    expect(result.variants.every(({ factsVerified }) => factsVerified)).toBe(true);
    expect(result.commonFacts.map(({ field }) => field)).toEqual(expect.arrayContaining(['dayGanZhi', 'hourGanZhi', 'yueJiang']));
    expect(result.differences.map(({ field }) => field)).toContain('school');
    expect(result.differences.map(({ field }) => field)).toEqual(expect.arrayContaining(['tianJiang', 'siKe']));
  });

  it('compares 2-4 explicit Taiyi configurations and rejects invalid cardinality', () => {
    const result = compareTaiyiRules({ birth: BIRTH, solar: Solar });
    expect(result.variants).toHaveLength(4);
    expect(result.variants.every(({ factsVerified }) => factsVerified)).toBe(true);
    expect(result.commonFacts.map(({ field }) => field)).toEqual(expect.arrayContaining(['dayGz', 'hourGz']));
    expect(result.differences.map(({ field }) => field)).toEqual(expect.arrayContaining(['jiStyle', 'acumYear', 'kook']));
    expect(() => compareTaiyiRules({ birth: BIRTH, configs: [{ jiStyle: 0, acumYear: 0 }], solar: Solar })).toThrow('2-4');
  });

  it('compares civil and recomputable verified true-solar time only', () => {
    const resolution = resolveTrueSolarTime(
      { ...BIRTH, useExactCalendar: true },
      { displayName: '纽约市，纽约州，美国', longitude: -74.006, ianaTimeZone: 'America/New_York', utcOffsetMinutes: -240, utcOffsetEvidence: 'IANA 时区历史规则核验：当地夏令时 UTC-04:00' },
    );
    const result = compareBaziTimeBasis({ resolution, solar: Solar });
    expect(result.variants.map(({ id }) => id)).toEqual(['civil', 'true-solar']);
    expect(result.variants.every(({ factsVerified }) => factsVerified)).toBe(true);
    expect(result.differences.map(({ field }) => field)).toEqual(expect.arrayContaining(['timeBasis', 'birthTime', 'trueSolarCorrectionMinutes']));
    expect(result.limitations.join(' ')).toContain('外部核验');
    expect(() => compareBaziTimeBasis({ resolution: { ...resolution, trueSolarCorrectionMinutes: 999 }, solar: Solar })).toThrow('复算不一致');
  });

  it('compares Ziwei natal-only and explicit month dynamic scope', () => {
    const result = compareZiweiDynamicScope({ birth: BIRTH, transit: { year: 2025, month: 7 } });
    expect(result.variants.map(({ id }) => id)).toEqual(['natal-only', 'month-dynamic']);
    expect(result.variants.every(({ factsVerified }) => factsVerified)).toBe(true);
    expect(result.commonFacts.map(({ field }) => field)).toEqual(expect.arrayContaining(['mainStars', 'sihua']));
    expect(result.differences.map(({ field }) => field)).toEqual(expect.arrayContaining(['dynamicScope', 'dynamicAnchor', 'enabledDynamicLayers']));
    expect(result.limitations.join(' ')).toContain('不补算流日');
  });

  it('never exposes a winner or recommendation in any comparison result', () => {
    const results = [
      compareBaziShenShaRules({ birth: BIRTH, solar: Solar }),
      compareChenguzVersions({ birth: BIRTH, solar: Solar }),
      compareDaliurenSchools({ birth: BIRTH, solar: Solar }),
      compareTaiyiRules({ birth: BIRTH, solar: Solar }),
    ];
    for (const result of results) {
      expect(result).not.toHaveProperty('bestVariant');
      expect(result).not.toHaveProperty('selectedVariant');
      expect(result).not.toHaveProperty('recommendedVariant');
      expect(result.limitations.join(' ')).toContain('不判断某一流派更准确');
    }
  });
});

describe('rule comparison request contract', () => {
  it('validates every independent comparison domain', () => {
    expect(parseRuleComparisonRequest({ domain: 'bazi-shensha', baseInput: { birth: BIRTH, timeBasis: 'civil-unverified', civilFallbackConfirmed: true } }).domain).toBe('bazi-shensha');
    expect(parseRuleComparisonRequest({ domain: 'chenguz-version', baseInput: { birth: BIRTH, baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true } }, variants: ['standard', 'folk'] }).domain).toBe('chenguz-version');
    expect(parseRuleComparisonRequest({ domain: 'daliuren-school', baseInput: { birth: BIRTH }, variants: ['classic', 'gufa'] }).domain).toBe('daliuren-school');
    expect(parseRuleComparisonRequest({ domain: 'taiyi-config', baseInput: { birth: BIRTH }, variants: [{ jiStyle: 0, acumYear: 0 }, { jiStyle: 1, acumYear: 1 }] }).domain).toBe('taiyi-config');
    expect(parseRuleComparisonRequest({ domain: 'bazi-time-basis', baseInput: { birth: BIRTH, location: { displayName: '纽约', longitude: -74.006, ianaTimeZone: 'America/New_York', utcOffsetMinutes: -240, utcOffsetEvidence: 'IANA UTC-04:00' } } }).domain).toBe('bazi-time-basis');
    expect(parseRuleComparisonRequest({ domain: 'ziwei-dynamic-scope', baseInput: { birth: BIRTH, transit: { year: 2025, month: 7 } } }).domain).toBe('ziwei-dynamic-scope');
  });

  it('rejects unknown domains, implicit variant sets, duplicates, and missing Ziwei target month', () => {
    expect(() => parseRuleComparisonRequest({ domain: 'unknown', baseInput: {} })).toThrow('domain');
    expect(() => parseRuleComparisonRequest({ domain: 'chenguz-version', baseInput: { birth: BIRTH, baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true } } })).toThrow('显式选择');
    expect(() => parseRuleComparisonRequest({ domain: 'daliuren-school', baseInput: { birth: BIRTH }, variants: ['classic', 'classic'] })).toThrow('重复');
    expect(() => parseRuleComparisonRequest({ domain: 'taiyi-config', baseInput: { birth: BIRTH }, variants: [{ jiStyle: 0, acumYear: 0 }] })).toThrow('2-4');
    expect(() => parseRuleComparisonRequest({ domain: 'ziwei-dynamic-scope', baseInput: { birth: BIRTH } })).toThrow('transit');
  });
});
