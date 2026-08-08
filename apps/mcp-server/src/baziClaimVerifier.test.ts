import { describe, expect, it } from 'vitest';
import { calcBaziEnveloped } from '../../visual/src/legacy/baziEngine';
import { validateBaziClaims, type BaziPresentationClaim } from './baziClaimVerifier';

const envelope = calcBaziEnveloped({
  birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
});

describe('八字呈现断言校验', () => {
  it('接受与本次引擎结果一致的四柱、日主、五行、大运和神煞断言', () => {
    const data = envelope.data;
    const claims: BaziPresentationClaim[] = [
      { kind: 'pillar', pillar: 'year', value: `${data.pillars.year.stem}${data.pillars.year.branch}` },
      { kind: 'dayMaster', value: data.dayMaster },
      { kind: 'elementCount', element: '木', value: data.elements.木 },
      { kind: 'strength', value: data.advancedAnalysis.support.strength },
      { kind: 'luck', ageStart: data.luck[0].ageStart, value: `${data.luck[0].stem}${data.luck[0].branch}` },
      { kind: 'shenSha', value: data.shenSha[0]?.name ?? '无' },
    ];

    expect(validateBaziClaims(data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝伪造的四柱、五行、大运和未出现神煞', () => {
    const result = validateBaziClaims(envelope.data, [
      { kind: 'pillar', pillar: 'year', value: '甲子' },
      { kind: 'elementCount', element: '木', value: 99 },
      { kind: 'luck', ageStart: 999, value: '甲子' },
      { kind: 'shenSha', value: '天乙贵人' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'pillar', expected: `${envelope.data.pillars.year.stem}${envelope.data.pillars.year.branch}` }),
      expect.objectContaining({ kind: 'elementCount', expected: envelope.data.elements.木 }),
      expect.objectContaining({ kind: 'luck' }),
      expect.objectContaining({ kind: 'shenSha' }),
    ]));
  });
});
