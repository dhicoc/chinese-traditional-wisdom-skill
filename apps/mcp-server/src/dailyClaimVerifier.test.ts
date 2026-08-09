import { describe, expect, it } from 'vitest';
import {
  calcNameRatingEnveloped,
  calcXiYongEnveloped,
  getConstitutionTendencyEnveloped,
} from '../../visual/src/legacy/envelopeAdapters';
import { calcCeziEnveloped } from '../../visual/src/legacy/ceziEngine';
import { calcChenguzEnveloped } from '../../visual/src/legacy/chenguzEngine';
import { getDailyRhythmEnveloped } from '../../visual/src/legacy/rhythmEngine';
import { assessConstitutionEnveloped } from '../../visual/src/legacy/constitutionAssessEngine';
import { searchDreamEnveloped } from '../../visual/src/legacy/envelopeSample';
import { Solar } from 'lunar-typescript';
import { validateDailyClaims, type DailyPresentationClaim } from './dailyClaimVerifier';

describe('日用与民俗呈现断言校验', () => {
  it('接受姓名、测字、称骨、每日节律与体质问卷的基础事实', async () => {
    const name = (await calcNameRatingEnveloped('张', '伟', 1990)).data;
    const xiyong = calcXiYongEnveloped('金', { 木: 1, 火: 2, 土: 3, 金: 4, 水: 5 }).data;
    const tendency = getConstitutionTendencyEnveloped({
      wuyun: { dayun: '木运太过' },
      liuqi: { sitian: '厥阴风木', zaquan: '少阳相火' },
    }).data;
    const dream = searchDreamEnveloped('蛇').data;
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
    const xiyongClaims: DailyPresentationClaim[] = [
      { tool: 'calc_xiyong', kind: 'xiyong', field: 'dayMasterWuxing', value: xiyong.dayMasterWuxing },
      { tool: 'calc_xiyong', kind: 'xiyong', field: 'similarPoint', value: xiyong.similarPoint },
      { tool: 'calc_xiyong', kind: 'xiyongElements', group: 'similar', value: xiyong.similar },
    ];
    const tendencyClaims: DailyPresentationClaim[] = [
      { tool: 'get_constitution_tendency', kind: 'constitutionTendencySource', field: 'dayun', value: tendency.dayun },
      { tool: 'get_constitution_tendency', kind: 'constitutionTendency', index: 0, field: 'type', value: tendency.tendencies[0]!.type },
    ];
    const dreamClaims: DailyPresentationClaim[] = [
      { tool: 'dream_interpret', kind: 'dreamSearch', field: 'hit', value: dream.hit },
      { tool: 'dream_interpret', kind: 'dreamEntry', index: 0, field: 'title', value: dream.entries[0]!.title },
      { tool: 'dream_interpret', kind: 'dreamEntry', index: 0, field: 'luck', value: dream.entries[0]!.luck },
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
    expect(validateDailyClaims('calc_xiyong', xiyong, xiyongClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('get_constitution_tendency', tendency, tendencyClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('dream_interpret', dream, dreamClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('cast_cezi', cezi, ceziClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('calc_chenguz', chenguz, chenguzClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('get_daily_rhythm', rhythm, rhythmClaims)).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('assess_constitution', constitution, constitutionClaims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝跨工具 token 与伪造基础字段', async () => {
    const name = (await calcNameRatingEnveloped('张', '伟', 1990)).data;
    const xiyong = calcXiYongEnveloped('金', { 木: 1, 火: 2, 土: 3, 金: 4, 水: 5 }).data;
    const dream = searchDreamEnveloped('蛇').data;
    const result = validateDailyClaims('analyze_name', name, [
      { tool: 'cast_cezi', kind: 'cezi', field: 'char', value: '明' },
      { tool: 'analyze_name', kind: 'nameRating', field: 'totalScore', value: name.totalScore + 1 },
    ]);
    const xiyongResult = validateDailyClaims('calc_xiyong', xiyong, [
      { tool: 'calc_xiyong', kind: 'xiyongElements', group: 'similar', value: [...xiyong.similar, '火'] },
      { tool: 'get_constitution_tendency', kind: 'constitutionTendencySource', field: 'dayun', value: '木运太过' },
    ]);
    const dreamResult = validateDailyClaims('dream_interpret', dream, [
      { tool: 'dream_interpret', kind: 'dreamEntry', index: 0, field: 'luck', value: '吉' },
      { tool: 'cast_cezi', kind: 'cezi', field: 'char', value: '明' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ tool: 'cast_cezi' }),
      expect.objectContaining({ tool: 'analyze_name' }),
    ]));
    expect(xiyongResult.valid).toBe(false);
    expect(xiyongResult.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ tool: 'calc_xiyong', actual: [...xiyong.similar, '火'] }),
      expect.objectContaining({ tool: 'get_constitution_tendency' }),
    ]));
    expect(dreamResult.valid).toBe(false);
    expect(dreamResult.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ tool: 'dream_interpret', kind: 'dreamEntry', actual: '吉' }),
      expect.objectContaining({ tool: 'cast_cezi' }),
    ]));
  });
});
