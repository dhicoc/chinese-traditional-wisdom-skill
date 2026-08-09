import { describe, expect, it } from 'vitest';
import { getAlmanacEnveloped } from '../../visual/src/legacy/almanacData';
import { calcXingXiuEnveloped } from '../../visual/src/legacy/xingxiuEngine';
import { calcYunqiEnveloped } from '../../visual/src/legacy/yunqiEngine';
import { validateCalendarClaims, type CalendarPresentationClaim } from './calendarClaimVerifier';
import { Solar } from 'lunar-typescript';

describe('历法与年度盘面呈现断言校验', () => {
  it('接受本次五运六气的年度、岁运、司天在泉与客气步骤断言', () => {
    const data = calcYunqiEnveloped({ year: 2026, currentMonth: 6, solar: Solar }).data;
    const step = data.liuqi.zhuke[0]!;
    const claims: CalendarPresentationClaim[] = [
      { kind: 'yunqiYear', field: 'year', value: data.year },
      { kind: 'yunqiYear', field: 'tiangan', value: data.tiangan },
      { kind: 'yunqiWuyun', field: 'dayun', value: data.wuyun.dayun },
      { kind: 'yunqiLiuqi', field: 'sitian', value: data.liuqi.sitian },
      { kind: 'yunqiStep', step: step.step, field: 'qi', value: step.qi },
    ];

    expect(validateCalendarClaims('yunqi', data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('接受显式日期的二十八星宿与黄历基础历法断言', () => {
    const xingxiu = calcXingXiuEnveloped({
      birth: { year: 1990, month: 6, day: 15 },
      queryDate: '2026-08-09',
      solar: Solar,
    }).data;
    const almanac = getAlmanacEnveloped({ date: '2026-08-09', solar: Solar }).data;

    expect(validateCalendarClaims('xingxiu', xingxiu, [
      { kind: 'xingxiu', field: 'queryDate', value: xingxiu.queryDate },
      { kind: 'xingxiu', field: 'zhiXiu', value: xingxiu.zhiXiu },
      { kind: 'xingxiu', field: 'wuxing', value: xingxiu.wuxing },
    ])).toEqual({ valid: true, violations: [] });
    expect(validateCalendarClaims('almanac', almanac, [
      { kind: 'almanac', field: 'solarDate', value: almanac.solarDate },
      { kind: 'almanac', field: 'dayGanZhi', value: almanac.dayGanZhi },
      { kind: 'almanac', field: 'dayXiu', value: almanac.dayXiu },
      { kind: 'almanacHour', label: almanac.hours[0]!.label, field: 'ganZhi', value: almanac.hours[0]!.ganZhi },
    ])).toEqual({ valid: true, violations: [] });
  });

  it('拒绝错误类别、伪造字段与不存在时辰', () => {
    const yunqi = calcYunqiEnveloped({ year: 2026, solar: Solar }).data;
    const almanac = getAlmanacEnveloped({ date: '2026-08-09', solar: Solar }).data;
    const result = validateCalendarClaims('yunqi', yunqi, [
      { kind: 'almanac', field: 'dayGanZhi', value: almanac.dayGanZhi },
      { kind: 'yunqiYear', field: 'year', value: 1999 },
      { kind: 'yunqiStep', step: '不存在步骤', field: 'qi', value: '不存在之气' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'almanac' }),
      expect.objectContaining({ kind: 'yunqiYear' }),
      expect.objectContaining({ kind: 'yunqiStep' }),
    ]));
  });
});
