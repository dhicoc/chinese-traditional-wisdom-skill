import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runLocalTool } from '@/legacy/directRunner';
import type { ToolEnvelope } from '@/legacy/baseTypes';
import { validateBaziClaims, type BaziPresentationClaim } from '@/legacy/claimVerification/baziClaimVerifier';
import { validateBazhaiClaims, type BazhaiPresentationClaim } from '@/legacy/claimVerification/bazhaiClaimVerifier';
import { validateCalendarClaims, type CalendarPresentationClaim } from '@/legacy/claimVerification/calendarClaimVerifier';
import { validateComboClaims, type ComboPresentationClaim } from '@/legacy/claimVerification/comboClaimVerifier';
import { validateDailyClaims, type DailyPresentationClaim } from '@/legacy/claimVerification/dailyClaimVerifier';
import { validateDivinationClaims, type DivinationPresentationClaim } from '@/legacy/claimVerification/divinationClaimVerifier';
import { validateFeixingClaims, type FeixingPresentationClaim } from '@/legacy/claimVerification/feixingClaimVerifier';
import { validateNumericAssertionClaims } from '@/legacy/claimVerification/numericAssertionVerifier';
import { validateZiweiClaims, type ZiweiPresentationClaim } from '@/legacy/claimVerification/ziweiClaimVerifier';
import { getZiweiHoroscopeSummary, type ZiweiBirth, type ZiweiData } from '@/legacy/ziweiEngine';

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../__fixtures__/local-tools',
);

async function resultData<T>(tool: string, fixtureName: string): Promise<T> {
  const input = JSON.parse(await readFile(path.join(fixtureDir, fixtureName), 'utf8'));
  const result = await runLocalTool(tool as never, input) as ToolEnvelope<T>;
  expect(result.ok).toBe(true);
  return result.data;
}

describe('claims verifier 回归矩阵', () => {
  it('八字：接受真实排盘 claim，拒绝篡改与不存在的大运选择器', async () => {
    const data = await resultData<any>('bazi_calculate', 'bazi_calculate.success.json');
    const luck = data.luck[0];
    const valid: BaziPresentationClaim[] = [
      { kind: 'pillar', pillar: 'day', value: `${data.pillars.day.stem}${data.pillars.day.branch}` },
      { kind: 'elementCount', element: '金', value: data.elements.金 },
      { kind: 'luck', ageStart: luck.ageStart, value: `${luck.stem}${luck.branch}` },
    ];

    expect(validateBaziClaims(data, valid)).toEqual({ valid: true, violations: [] });
    expect(validateBaziClaims(data, [{ kind: 'dayMaster', value: '错' }]).valid).toBe(false);
    expect(validateBaziClaims(data, [{ kind: 'luck', ageStart: -1, value: '不存在' }]).violations[0]).toMatchObject({ expected: undefined });
  });

  it('八宅：接受真实命卦与方位 claim，拒绝篡改与不存在方向', async () => {
    const data = await resultData<any>('calc_bazhai', 'calc_bazhai.success.json');
    const direction = data.directions[0];
    const valid: BazhaiPresentationClaim[] = [
      { kind: 'mingGua', field: 'trigram', value: data.mingGua.trigram },
      { kind: 'direction', direction: direction.direction, field: 'star', value: direction.star },
      { kind: 'annual', field: 'taisuiDirection', value: data.taisui.taisui.direction },
    ];

    expect(validateBazhaiClaims(data, valid)).toEqual({ valid: true, violations: [] });
    expect(validateBazhaiClaims(data, [{ kind: 'mingGua', field: 'num', value: data.mingGua.num + 1 }]).valid).toBe(false);
    expect(validateBazhaiClaims(data, [{ kind: 'direction', direction: '不存在', field: 'star', value: '生气' }]).violations[0]).toMatchObject({ expected: undefined });
  });

  it('飞星：接受真实中宫与宫位 claim，拒绝篡改与不存在宫位', async () => {
    const data = await resultData<any>('calc_feixing', 'calc_feixing.success.json');
    const palace = data.grid.flat()[0];
    const valid: FeixingPresentationClaim[] = [
      { kind: 'year', value: data.year },
      { kind: 'center', field: 'centerStar', value: data.center.centerStar },
      { kind: 'palace', palace: palace.palace, field: 'starNum', value: palace.starNum },
    ];

    expect(validateFeixingClaims(data, valid)).toEqual({ valid: true, violations: [] });
    expect(validateFeixingClaims(data, [{ kind: 'year', value: data.year + 1 }]).valid).toBe(false);
    expect(validateFeixingClaims(data, [{ kind: 'palace', palace: '不存在', field: 'starNum', value: 1 }]).violations[0]).toMatchObject({ expected: undefined });
  });

  it('紫微：接受本命与动态层 claim，拒绝篡改、不存在宫位及缺失动态层', async () => {
    const data = await resultData<ZiweiData>('ziwei_chart', 'ziwei_chart.success.json');
    const [palaceName, palace] = Object.entries(data.palaces)[0];
    const birth: ZiweiBirth = {
      ...data.birthInfo,
      gender: data.birthInfo.gender === '女' ? '女' : '男',
    };
    const transit = getZiweiHoroscopeSummary(birth, 2026, 8);
    const valid: ZiweiPresentationClaim[] = [
      { kind: 'palace', palace: palaceName, field: 'position', value: palace.position },
      { kind: 'metadata', field: 'soul', value: data.soul ?? '' },
      { kind: 'transit', field: 'age', value: transit.age.nominalAge },
    ];

    expect(validateZiweiClaims(data, valid, transit)).toEqual({ valid: true, violations: [] });
    expect(validateZiweiClaims(data, [{ kind: 'palace', palace: palaceName, field: 'position', value: '错' }]).valid).toBe(false);
    expect(validateZiweiClaims(data, [{ kind: 'palace', palace: '不存在', field: 'position', value: '命宫' }]).violations[0]).toMatchObject({ expected: undefined });
    expect(validateZiweiClaims(data, [{ kind: 'transit', field: 'age', value: transit.age.nominalAge }]).violations[0]).toMatchObject({ expected: undefined });
  });

  it('历法：接受五运六气与黄历 claim，拒绝篡改、错误结果种类和不存在时辰', async () => {
    const yunqi = await resultData<any>('calc_yunqi', 'calc_yunqi.success.json');
    const almanac = await resultData<any>('get_almanac', 'get_almanac.success.json');
    const hour = almanac.hours[0];
    const valid: CalendarPresentationClaim[] = [
      { kind: 'yunqiYear', field: 'year', value: yunqi.year },
      { kind: 'yunqiWuyun', field: 'dayun', value: yunqi.wuyun.dayun },
      { kind: 'yunqiStep', step: yunqi.liuqi.zhuke[0].step, field: 'qi', value: yunqi.liuqi.zhuke[0].qi },
    ];

    expect(validateCalendarClaims('yunqi', yunqi, valid)).toEqual({ valid: true, violations: [] });
    expect(validateCalendarClaims('yunqi', yunqi, [{ kind: 'yunqiYear', field: 'year', value: yunqi.year + 1 }]).valid).toBe(false);
    expect(validateCalendarClaims('almanac', almanac, [{ kind: 'almanacHour', label: hour.label, field: 'ganZhi', value: hour.ganZhi }])).toEqual({ valid: true, violations: [] });
    expect(validateCalendarClaims('almanac', almanac, [{ kind: 'yunqiYear', field: 'year', value: yunqi.year }]).violations[0]).toMatchObject({ expected: undefined });
    expect(validateCalendarClaims('almanac', almanac, [{ kind: 'almanacHour', label: '不存在', field: 'luck', value: '吉' }]).violations[0]).toMatchObject({ expected: undefined });
  });

  it('组合：接受真实择日 claim，拒绝篡改、越界索引和跨工具 claim', async () => {
    const data = await resultData<any>('combo_zeri', 'combo_zeri.success.json');
    const valid: ComboPresentationClaim[] = [
      { tool: 'combo_zeri', kind: 'zeriPurpose', value: data.zeriPurpose },
      { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'date', value: data.rankedDays[0].date },
    ];

    expect(validateComboClaims('combo_zeri', data, valid)).toEqual({ valid: true, violations: [] });
    expect(validateComboClaims('combo_zeri', data, [{ tool: 'combo_zeri', kind: 'zeriRange', field: 'scannedDays', value: data.range.scannedDays + 1 }]).valid).toBe(false);
    expect(validateComboClaims('combo_zeri', data, [{ tool: 'combo_zeri', kind: 'zeriRankedDay', index: -1, field: 'date', value: '不存在' }]).violations[0]).toMatchObject({ expected: undefined });
    expect(validateComboClaims('combo_zeri', data, [{ tool: 'combo_monthly_fortune', kind: 'monthlyMode', value: 'local-exact' }]).violations[0]).toMatchObject({ expected: undefined });
  });

  it('日用：接受真实姓名与喜用 claim，拒绝篡改、数组顺序变化和跨工具 claim', async () => {
    const name = await resultData<any>('analyze_name', 'analyze_name.success.json');
    const xiyong = await resultData<any>('calc_xiyong', 'calc_xiyong.success.json');
    const valid: DailyPresentationClaim[] = [
      { tool: 'analyze_name', kind: 'nameRating', field: 'totalScore', value: name.totalScore },
      { tool: 'analyze_name', kind: 'nameDimension', name: name.dimensions[0].name, field: 'score', value: name.dimensions[0].score },
    ];

    expect(validateDailyClaims('analyze_name', name, valid)).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('analyze_name', name, [{ tool: 'analyze_name', kind: 'nameRating', field: 'totalScore', value: name.totalScore + 1 }]).valid).toBe(false);
    expect(validateDailyClaims('calc_xiyong', xiyong, [{ tool: 'calc_xiyong', kind: 'xiyongElements', group: 'similar', value: [...xiyong.similar].reverse() }]).valid).toBe(false);
    expect(validateDailyClaims('analyze_name', name, [{ tool: 'calc_xiyong', kind: 'xiyong', field: 'shen', value: '金' }]).violations[0]).toMatchObject({ expected: undefined });
  });

  it('占测：接受真实六爻 claim，拒绝篡改、越界选择器和跨工具 claim', async () => {
    const data = await resultData<any>('cast_liuyao', 'cast_liuyao.success.json');
    const valid: DivinationPresentationClaim[] = [
      { tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: data.hexagramName },
      { tool: 'cast_liuyao', kind: 'yao', field: 'changingYao', value: data.changingYao.join('、') },
    ];

    expect(validateDivinationClaims('cast_liuyao', data, valid)).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('cast_liuyao', data, [{ tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: '错卦' }]).valid).toBe(false);
    expect(validateDivinationClaims('arrange_qimen', await resultData<any>('arrange_qimen', 'arrange_qimen.success.json'), [{ tool: 'arrange_qimen', kind: 'palace', position: -1, field: 'gate', value: '开门' }]).violations[0]).toMatchObject({ expected: undefined });
    expect(validateDivinationClaims('cast_liuyao', data, [{ tool: 'cast_meihua', kind: 'yao', field: 'changingLine', value: 1 }]).violations[0]).toMatchObject({ expected: undefined });
  });

  it('数值断言：接受真实嵌套数值，拒绝篡改、非法路径、数组越界和跨工具', async () => {
    const data = await resultData<any>('calc_feixing', 'calc_feixing.success.json');
    const result = { data };
    const path = 'data.center.centerStar';

    expect(validateNumericAssertionClaims('calc_feixing', result, [{ tool: 'calc_feixing', path, value: data.center.centerStar }])).toEqual({ valid: true, violations: [] });
    expect(validateNumericAssertionClaims('calc_feixing', result, [{ path, value: data.center.centerStar + 1 }]).valid).toBe(false);
    expect(validateNumericAssertionClaims('calc_feixing', result, [{ path: 'center.centerStar', value: data.center.centerStar }]).violations[0]).toMatchObject({ expected: undefined });
    expect(validateNumericAssertionClaims('calc_feixing', result, [{ path: 'data.grid.99.starNum', value: 1 }]).violations[0]).toMatchObject({ expected: undefined });
    expect(validateNumericAssertionClaims('calc_feixing', result, [{ tool: 'calc_bazhai', path, value: data.center.centerStar }]).violations[0]).toMatchObject({
      expected: undefined,
      message: '该凭证属于 calc_bazhai，不能校验 calc_feixing 的数值断言。',
    });
  });
});
