import { describe, expect, it } from 'vitest';
import { calcNameRatingEnveloped } from '../../visual/src/legacy/envelopeAdapters';
import { calcCeziEnveloped } from '../../visual/src/legacy/ceziEngine';
import { calcChenguzEnveloped } from '../../visual/src/legacy/chenguzEngine';
import { getDailyRhythmEnveloped } from '../../visual/src/legacy/rhythmEngine';
import { assessConstitutionEnveloped } from '../../visual/src/legacy/constitutionAssessEngine';
import { Solar } from 'lunar-typescript';
import { validateDailyClaims, type DailyPresentationClaim } from './dailyClaimVerifier';

describe('日用与民俗呈现断言校验', () => {
  it('接受姓名、测字、称骨、每日节律与体质问卷的基础事实', async () => {
    const name = (await calcNameRatingEnveloped('张', '伟', 1990)).data;
    const cezi = (await calcCeziEnveloped({ char: '明', solar: Solar })).data;
    const chenguz = calcChenguzEnveloped({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      solar: Solar,
    }).data;
    const rhythm = getDailyRhythmEnveloped({ date: '2026-08-01', hour: 12, solar: Solar }).data;
    const constitution = assessConstitutionEnveloped({
      answers: [{ type: '气虚质', score: 5 }, { type: '气虚质', score: 4 }, { type: '平和质', score: 3 }],
    }).data;

    const nameClaims: DailyPresentationClaim[] = [
      { tool: 'analyze_name', kind: 'nameRating', field: 'totalScore', value: name.totalScore },
      { tool: 'analyze_name', kind: 'nameDimension', name: name.dimensions[0]!.name, field: 'weight', value: name.dimensions[0]!.weight },
    ];
    const ceziClaims: DailyPresentationClaim[] = [
      { tool: 'cast_cezi', kind: 'cezi', field: 'strokes', value: cezi.strokes },
      { tool: 'cast_cezi', kind: 'ceziShuli', field: 'number', value: cezi.shuli.number },
      { tool: 'cast_cezi', kind: 'ceziStructure', field: 'structure', value: cezi.structure.structure },
    ];
    const chenguzClaims: DailyPresentationClaim[] = [
      { tool: 'calc_chenguz', kind: 'chenguzBone', component: 'yearBone', field: 'branch', value: chenguz.yearBone.branch },
      { tool: 'calc_chenguz', kind: 'chenguzBone', component: 'dayBone', field: 'lunarDay', value: chenguz.dayBone.lunarDay },
      { tool: 'calc_chenguz', kind: 'chenguzTotal', field: 'text', value: chenguz.totalText },
      { tool: 'calc_chenguz', kind: 'chenguzVersion', field: 'id', value: chenguz.versionId },
    ];
    const rhythmClaims: DailyPresentationClaim[] = [
      { tool: 'get_daily_rhythm', kind: 'rhythm', field: 'date', value: rhythm.date },
      { tool: 'get_daily_rhythm', kind: 'rhythmMeridian', field: 'meridian', value: rhythm.meridian?.meridian ?? null },
    ];
    const constitutionClaims: DailyPresentationClaim[] = [
      { tool: 'assess_constitution', kind: 'constitution', field: 'dominantType', value: constitution.dominantType },
      { tool: 'assess_constitution', kind: 'constitutionScore', type: '气虚质', value: constitution.scores['气虚质']! },
    ];

    expect(validateDailyClaims('analyze_name', name, nameClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('cast_cezi', cezi, ceziClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('calc_chenguz', chenguz, chenguzClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('get_daily_rhythm', rhythm, rhythmClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('assess_constitution', constitution, constitutionClaims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝跨工具 token 与伪造基础字段', async () => {
    const name = (await calcNameRatingEnveloped('张', '伟', 1990)).data;
    const result = validateDailyClaims('analyze_name', name, [
      { tool: 'cast_cezi', kind: 'cezi', field: 'char', value: '明' },
      { tool: 'analyze_name', kind: 'nameRating', field: 'totalScore', value: name.totalScore + 1 },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ tool: 'cast_cezi' }),
      expect.objectContaining({ tool: 'analyze_name' }),
    ]));
  });
});
