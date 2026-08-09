import type { DailyWellnessResult, ZeriResult } from '../../visual/src/legacy/comboEngine';

export type ComboPresentationTool = 'combo_zeri' | 'combo_daily_wellness';

export type ComboPresentationClaim =
  | { tool: string; kind: 'zeriPurpose'; value: ZeriResult['zeriPurpose'] }
  | { tool: string; kind: 'zeriRange'; field: 'start' | 'end' | 'scannedDays'; value: string | number }
  | { tool: string; kind: 'zeriRankedDay'; index: number; field: 'date' | 'lunarDate' | 'dayGanZhi' | 'score' | 'tone' | 'chongOwner' | 'hitsAnnualSha'; value: string | number | boolean }
  | { tool: string; kind: 'zeriAnnualSha'; field: 'taisui' | 'suiPo' | 'sanSha' | 'fiveYellow'; value: string }
  | { tool: string; kind: 'zeriPersonalDirection'; index: number; field: 'star' | 'direction'; value: string }
  | { tool: string; kind: 'wellnessContext'; field: 'date' | 'jieqi' | 'season' | 'shichen' | 'meridian'; value: string }
  | { tool: string; kind: 'wellnessConstitution'; field: 'type' | 'source' | 'reason'; value: string }
  | { tool: string; kind: 'wellnessJieqi'; field: 'jieqi' | 'season' | 'feature' | 'diet' | 'lifestyle' | 'exercise' | 'acupoints' | 'principle'; value: string }
  | { tool: string; kind: 'wellnessMeridian'; field: 'name' | 'time' | 'hours' | 'meridian' | 'organ' | 'function' | 'advice' | 'wuxing'; value: string }
  | { tool: string; kind: 'wellnessDirection'; value: string }
  | { tool: string; kind: 'wellnessRecommendation'; index: number; field: 'label' | 'value' | 'tone'; value: string };

export interface ComboClaimViolation {
  index: number;
  tool: string;
  kind: ComboPresentationClaim['kind'];
  message: string;
  expected?: string | number | boolean;
  actual: string | number | boolean;
}

export interface ComboClaimValidation {
  valid: boolean;
  violations: ComboClaimViolation[];
}

type ComboPresentationData = ZeriResult | DailyWellnessResult;

const presentationResults = new Map<string, { tool: ComboPresentationTool; data: ComboPresentationData }>();

export function registerComboPresentation(tool: ComboPresentationTool, data: ComboPresentationData, token: string) {
  presentationResults.set(token, { tool, data });
}

export function validateComboPresentation(token: string, claims: ComboPresentationClaim[]): ComboClaimValidation | null {
  const entry = presentationResults.get(token);
  return entry ? validateComboClaims(entry.tool, entry.data, claims) : null;
}

export function validateComboClaims(
  tool: ComboPresentationTool,
  data: ComboPresentationData,
  claims: ComboPresentationClaim[],
): ComboClaimValidation {
  const violations: ComboClaimViolation[] = [];

  claims.forEach((claim, index) => {
    const expected = claim.tool === tool ? getExpectedValue(tool, data, claim) : undefined;
    if (claim.value !== expected) {
      violations.push({
        index,
        tool: claim.tool,
        kind: claim.kind,
        message: claim.tool === tool
          ? `${claim.kind} 与本次${tool}传统规则输出不一致。`
          : `该凭证不属于 ${claim.tool}，不能校验此断言。`,
        expected,
        actual: claim.value,
      });
    }
  });

  return { valid: violations.length === 0, violations };
}

function getExpectedValue(
  tool: ComboPresentationTool,
  data: ComboPresentationData,
  claim: ComboPresentationClaim,
): string | number | boolean | undefined {
  if (tool === 'combo_zeri') {
    const zeri = data as ZeriResult;
    switch (claim.kind) {
      case 'zeriPurpose':
        return zeri.zeriPurpose;
      case 'zeriRange':
        return zeri.range[claim.field];
      case 'zeriRankedDay':
        return zeri.rankedDays[claim.index]?.[claim.field];
      case 'zeriAnnualSha':
        return zeri.annualSha[claim.field];
      case 'zeriPersonalDirection':
        return zeri.personalAuspicious[claim.index]?.[claim.field];
      default:
        return undefined;
    }
  }

  const wellness = data as DailyWellnessResult;
  switch (claim.kind) {
    case 'wellnessContext':
      return wellness.context[claim.field];
    case 'wellnessConstitution':
      return wellness.constitution[claim.field];
    case 'wellnessJieqi':
      return wellness.jieqiWellness[claim.field];
    case 'wellnessMeridian':
      return wellness.meridianHour[claim.field];
    case 'wellnessDirection':
      return wellness.directionTip;
    case 'wellnessRecommendation':
      return wellness.recommendations[claim.index]?.[claim.field];
    default:
      return undefined;
  }
}
