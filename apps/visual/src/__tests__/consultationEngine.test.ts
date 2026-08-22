import { Solar } from 'lunar-typescript';
import { describe, expect, it } from 'vitest';
import { executeAlmanacConsultation, executeBaziConsultation, executeBazhaiConsultation, executeFeixingConsultation } from '@/engine-api/consultation';

describe('browser-safe consultation execution', () => {
  const birth = { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男' as const };

  it('returns only verified structured Bazi facts and a neutral typed presentation', () => {
    const result = executeBaziConsultation({ birth, timeBasis: 'civil-unverified', civilFallbackConfirmed: true, solar: Solar });
    expect(result).toMatchObject({ state: 'success', tool: 'bazi_calculate', mode: 'local-exact', factsVerified: true });
    expect(result.verifiedFacts).toHaveLength(11);
    expect(result.verifiedFacts.map(({ label }) => label)).toEqual(expect.arrayContaining(['年柱', '时柱', '日主', '日主强弱']));
    expect(result.presentation.overallTone).toBe('中');
    expect(result.presentation.actions).toEqual([]);
    expect(result.presentation.limitations.join(' ')).toContain('未完成真太阳时复核');
    expect(result).not.toHaveProperty('input_normalized');
    expect(JSON.stringify(result)).not.toContain('1990-06-15');
    expect(result.provenance?.inputFingerprint).toMatch(/^fnv1a32:/);
  });

  it('requires explicit civil-time confirmation', () => {
    expect(() => executeBaziConsultation({ birth, timeBasis: 'civil-unverified', civilFallbackConfirmed: false as true, solar: Solar })).toThrow('明确确认');
  });

  it('rejects invalid Gregorian dates instead of allowing calendar normalization', () => {
    expect(() => executeBaziConsultation({ birth: { ...birth, month: 2, day: 30 }, timeBasis: 'civil-unverified', civilFallbackConfirmed: true, solar: Solar })).toThrow('有效的公历出生日期');
  });


  it('executes and verifies Feixing, Bazhai, and Almanac slices', () => {
    const feixing = executeFeixingConsultation({ year: 2026 });
    expect(feixing).toMatchObject({ tool: 'calc_feixing', factsVerified: true });
    expect(feixing.verifiedFacts).toHaveLength(6);

    const bazhai = executeBazhaiConsultation({ birthYear: 1990, gender: '男', year: 2026 });
    expect(bazhai).toMatchObject({ tool: 'calc_bazhai', factsVerified: true });
    expect(bazhai.verifiedFacts).toHaveLength(6);

    const almanac = executeAlmanacConsultation({ date: '2026-08-22', solar: Solar });
    expect(almanac).toMatchObject({ tool: 'get_almanac', factsVerified: true });
    expect(almanac.verifiedFacts).toHaveLength(9);
    expect(JSON.stringify([feixing, bazhai, almanac])).not.toContain('input_normalized');
  });

  it('rejects implicit or malformed explicit dates and years', () => {
    expect(() => executeFeixingConsultation({ year: 0 })).toThrow('明确飞星年份');
    expect(() => executeBazhaiConsultation({ birthYear: 1990, gender: '男', year: 2200 })).toThrow('查询年份');
    expect(() => executeAlmanacConsultation({ date: '2026-02-30', solar: Solar })).toThrow('有效的公历日期');
  });

});
