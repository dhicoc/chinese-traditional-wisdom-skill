import type { AlmanacData } from '../almanacData';
import type { XingXiuData } from '../xingxiuEngine';
import type { YunqiData } from '../yunqiEngine';

export type CalendarPresentationKind = 'yunqi' | 'xingxiu' | 'almanac';

export type CalendarPresentationClaim =
  | { kind: 'yunqiYear'; field: 'year'; value: number }
  | { kind: 'yunqiYear'; field: 'tiangan' | 'dizhi'; value: string }
  | { kind: 'yunqiWuyun'; field: 'dayun'; value: string }
  | { kind: 'yunqiLiuqi'; field: 'sitian' | 'zaiquan'; value: string }
  | { kind: 'yunqiStep'; step: string; field: 'qi' | 'start' | 'end'; value: string }
  | { kind: 'xingxiu'; field: 'queryDate' | 'zhiXiu' | 'zhiXiuFull' | 'xiang' | 'wuxing' | 'yao' | 'animal'; value: string }
  | { kind: 'almanac'; field: 'solarDate' | 'lunarDate' | 'yearGanZhi' | 'monthGanZhi' | 'dayGanZhi' | 'zodiac' | 'jieQi' | 'dayNaYin' | 'dayXiu' | 'dayTianShen' | 'dayTianShenType' | 'chong' | 'sha' | 'liuYao' | 'dayNineStar'; value: string }
  | { kind: 'almanacHour'; label: string; field: 'ganZhi' | 'tianShen' | 'tianShenType' | 'luck'; value: string };

export interface CalendarClaimViolation {
  index: number;
  kind: CalendarPresentationClaim['kind'];
  message: string;
  expected?: string | number;
  actual: string | number;
}

export interface CalendarClaimValidation {
  valid: boolean;
  violations: CalendarClaimViolation[];
}

export function validateCalendarClaims(
  resultKind: CalendarPresentationKind,
  data: YunqiData | XingXiuData | AlmanacData,
  claims: CalendarPresentationClaim[],
): CalendarClaimValidation {
  const violations: CalendarClaimViolation[] = [];

  claims.forEach((claim, index) => {
    const expected = getExpectedValue(resultKind, data, claim);
    if (claim.value !== expected) {
      violations.push({
        index,
        kind: claim.kind,
        message: getViolationMessage(claim),
        expected,
        actual: claim.value,
      });
    }
  });

  return { valid: violations.length === 0, violations };
}

function getExpectedValue(
  resultKind: CalendarPresentationKind,
  data: YunqiData | XingXiuData | AlmanacData,
  claim: CalendarPresentationClaim,
): string | number | undefined {
  switch (claim.kind) {
    case 'yunqiYear': {
      if (resultKind !== 'yunqi') return undefined;
      return (data as YunqiData)[claim.field];
    }
    case 'yunqiWuyun':
      return resultKind === 'yunqi' ? (data as YunqiData).wuyun.dayun : undefined;
    case 'yunqiLiuqi':
      return resultKind === 'yunqi' ? (data as YunqiData).liuqi[claim.field] : undefined;
    case 'yunqiStep': {
      if (resultKind !== 'yunqi') return undefined;
      return (data as YunqiData).liuqi.zhuke.find((step) => step.step === claim.step)?.[claim.field];
    }
    case 'xingxiu':
      return resultKind === 'xingxiu' ? (data as XingXiuData)[claim.field] : undefined;
    case 'almanac':
      return resultKind === 'almanac' ? (data as AlmanacData)[claim.field] : undefined;
    case 'almanacHour': {
      if (resultKind !== 'almanac') return undefined;
      return (data as AlmanacData).hours.find((hour) => hour.label === claim.label)?.[claim.field];
    }
  }
}

function getViolationMessage(claim: CalendarPresentationClaim): string {
  if (claim.kind === 'yunqiStep') return `${claim.step}的${claim.field}与本次五运六气结果不一致。`;
  if (claim.kind === 'almanacHour') return `${claim.label}的${claim.field}与本次黄历结果不一致。`;
  if (claim.kind.startsWith('yunqi')) return `${claim.kind}的${claim.field}与本次五运六气结果不一致。`;
  if (claim.kind === 'xingxiu') return `星宿${claim.field}与本次显式日期结果不一致。`;
  return `黄历${claim.field}与本次显式日期结果不一致。`;
}
