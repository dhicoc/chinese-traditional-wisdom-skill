import { describe, expect, it } from 'vitest';
import { Solar } from 'lunar-typescript';
import { calcDailyWellnessCombo, calcMonthlyFortuneCombo, calcZeriCombo } from '../../visual/src/legacy/comboEngine';
import { calcMarriageCombo } from '../../visual/src/legacy/marriageCombo';
import { validateComboClaims, type ComboPresentationClaim } from './comboClaimVerifier';

const envelope = calcZeriCombo({
  birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
  purpose: '开业',
  startDate: '2026-08-01',
  endDate: '2026-08-15',
  targetYear: 2026,
  topN: 3,
  solar: Solar,
});

const wellnessEnvelope = calcDailyWellnessCombo({
  birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
  constitution: '气虚质',
  now: { year: 2026, month: 8, day: 1, hour: 12 },
  targetYear: 2026,
  solar: Solar,
});

const monthlyEnvelope = calcMonthlyFortuneCombo({
  birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
  targetYear: 2026,
  targetMonth: 8,
  solar: Solar,
});

describe('组合择日呈现断言校验', () => {
  it('接受本次搜索范围、用途、候选日期与方位基础事实', () => {
    const data = envelope.data;
    const rankedDay = data.rankedDays[0]!;
    const direction = data.personalAuspicious[0]!;
    const claims: ComboPresentationClaim[] = [
      { tool: 'combo_zeri', kind: 'zeriPurpose', value: data.zeriPurpose },
      { tool: 'combo_zeri', kind: 'zeriRange', field: 'start', value: data.range.start },
      { tool: 'combo_zeri', kind: 'zeriRange', field: 'scannedDays', value: data.range.scannedDays },
      { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'date', value: rankedDay.date },
      { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'score', value: rankedDay.score },
      { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'chongOwner', value: rankedDay.chongOwner },
      { tool: 'combo_zeri', kind: 'zeriAnnualSha', field: 'taisui', value: data.annualSha.taisui },
      { tool: 'combo_zeri', kind: 'zeriPersonalDirection', index: 0, field: 'direction', value: direction.direction },
    ];

    expect(validateComboClaims('combo_zeri', data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝伪造分数、越界候选和跨工具断言', () => {
    const data = envelope.data;
    const result = validateComboClaims('combo_zeri', data, [
      { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'score', value: data.rankedDays[0]!.score + 1 },
      { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 99, field: 'date', value: '2026-08-01' },
      { tool: 'combo_monthly_fortune', kind: 'zeriPurpose', value: '开业' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ tool: 'combo_zeri', kind: 'zeriRankedDay' }),
      expect.objectContaining({ tool: 'combo_monthly_fortune', kind: 'zeriPurpose' }),
    ]));
  });
});

describe('组合月度基础事实校验', () => {
  it('接受本次精确年月、流月干支、节气与模式', () => {
    const data = monthlyEnvelope.data;
    const claims: ComboPresentationClaim[] = [
      { tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'year', value: data.context.year },
      { tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'month', value: data.context.month },
      { tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'monthGanZhi', value: data.context.monthGanZhi },
      { tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'jieqi', value: data.context.jieqi },
      { tool: 'combo_monthly_fortune', kind: 'monthlyMode', value: data.mode },
    ];

    expect(validateComboClaims('combo_monthly_fortune', data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝伪造流月、模式不符和跨工具断言', () => {
    const data = monthlyEnvelope.data;
    const result = validateComboClaims('combo_monthly_fortune', data, [
      { tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'monthGanZhi', value: '甲子' },
      { tool: 'combo_monthly_fortune', kind: 'monthlyMode', value: 'local-approx' },
      { tool: 'combo_zeri', kind: 'zeriPurpose', value: '开业' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ tool: 'combo_monthly_fortune', kind: 'monthlyContext' }),
      expect.objectContaining({ tool: 'combo_monthly_fortune', kind: 'monthlyMode' }),
      expect.objectContaining({ tool: 'combo_zeri', kind: 'zeriPurpose' }),
    ]));
  });
});

describe('组合养生传统规则输出校验', () => {
  it('接受本次节气、体质、经络、方位和传统建议条目', () => {
    const data = wellnessEnvelope.data;
    const recommendation = data.recommendations[0]!;
    const claims: ComboPresentationClaim[] = [
      { tool: 'combo_daily_wellness', kind: 'wellnessContext', field: 'jieqi', value: data.context.jieqi },
      { tool: 'combo_daily_wellness', kind: 'wellnessConstitution', field: 'type', value: data.constitution.type },
      { tool: 'combo_daily_wellness', kind: 'wellnessJieqi', field: 'principle', value: data.jieqiWellness.principle },
      { tool: 'combo_daily_wellness', kind: 'wellnessJieqi', field: 'diet', value: data.jieqiWellness.diet },
      { tool: 'combo_daily_wellness', kind: 'wellnessMeridian', field: 'meridian', value: data.meridianHour.meridian },
      { tool: 'combo_daily_wellness', kind: 'wellnessDirection', value: data.directionTip },
      { tool: 'combo_daily_wellness', kind: 'wellnessRecommendation', index: 0, field: 'value', value: recommendation.value },
    ];

    expect(validateComboClaims('combo_daily_wellness', data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝伪造传统建议、越界条目和跨工具断言', () => {
    const data = wellnessEnvelope.data;
    const result = validateComboClaims('combo_daily_wellness', data, [
      { tool: 'combo_daily_wellness', kind: 'wellnessJieqi', field: 'diet', value: '任意饮食均可' },
      { tool: 'combo_daily_wellness', kind: 'wellnessRecommendation', index: 99, field: 'label', value: '不存在建议' },
      { tool: 'combo_zeri', kind: 'zeriPurpose', value: '开业' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ tool: 'combo_daily_wellness', kind: 'wellnessJieqi' }),
      expect.objectContaining({ tool: 'combo_daily_wellness', kind: 'wellnessRecommendation' }),
      expect.objectContaining({ tool: 'combo_zeri', kind: 'zeriPurpose' }),
    ]));
  });
});

describe('组合合婚基础事实校验', () => {
  it('接受本次场景、双方日柱日主五行命卦与逐柱冲合布尔事实', async () => {
    const envelope = await calcMarriageCombo({
      personA: { birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' }, solar: Solar },
      personB: { birth: { year: 1992, month: 9, day: 20, hour: 8, gender: '女' }, solar: Solar },
      scene: '婚恋',
      targetYear: 2026,
    });
    const data = envelope.data;
    const scan = data.chongHeScan[0]!;
    const claims: ComboPresentationClaim[] = [
      { tool: 'combo_marriage', kind: 'marriageScene', value: data.scene },
      { tool: 'combo_marriage', kind: 'marriagePerson', person: 'personA', field: 'dayGanZhi', value: data.personA.dayGanZhi },
      { tool: 'combo_marriage', kind: 'marriagePerson', person: 'personA', field: 'dayMaster', value: data.personA.dayMaster },
      { tool: 'combo_marriage', kind: 'marriagePerson', person: 'personB', field: 'dayMasterWuxing', value: data.personB.dayMasterWuxing },
      { tool: 'combo_marriage', kind: 'marriageElement', person: 'personA', element: '木', value: data.personA.elements['木']! },
      { tool: 'combo_marriage', kind: 'marriageMingGua', person: 'personB', field: 'trigram', value: data.personB.mingGua.trigram },
      { tool: 'combo_marriage', kind: 'marriageMingGua', person: 'personB', field: 'group', value: data.personB.mingGua.group },
      { tool: 'combo_marriage', kind: 'marriageChongHe', index: 0, field: 'pillar', value: scan.pillar },
      { tool: 'combo_marriage', kind: 'marriageChongHe', index: 0, field: 'aGanZhi', value: scan.aGanZhi },
      { tool: 'combo_marriage', kind: 'marriageChongHe', index: 0, field: 'bGanZhi', value: scan.bGanZhi },
      { tool: 'combo_marriage', kind: 'marriageChongHeRelation', index: 0, field: 'ganHe', value: scan.relation.ganHe },
    ];

    expect(validateComboClaims('combo_marriage', data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝伪造五行、越界逐柱冲合与跨工具断言', async () => {
    const envelope = await calcMarriageCombo({
      personA: { birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' }, solar: Solar },
      personB: { birth: { year: 1992, month: 9, day: 20, hour: 8, gender: '女' }, solar: Solar },
      scene: '婚恋',
      targetYear: 2026,
    });
    const data = envelope.data;
    const result = validateComboClaims('combo_marriage', data, [
      { tool: 'combo_marriage', kind: 'marriageElement', person: 'personA', element: '木', value: data.personA.elements['木']! + 1 },
      { tool: 'combo_marriage', kind: 'marriageChongHe', index: 99, field: 'pillar', value: '年柱' },
      { tool: 'combo_zeri', kind: 'zeriPurpose', value: '开业' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ tool: 'combo_marriage', kind: 'marriageElement' }),
      expect.objectContaining({ tool: 'combo_marriage', kind: 'marriageChongHe' }),
      expect.objectContaining({ tool: 'combo_zeri', kind: 'zeriPurpose' }),
    ]));
  });
});
