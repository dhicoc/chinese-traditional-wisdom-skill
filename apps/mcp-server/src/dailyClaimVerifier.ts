import type { ConstitutionTendencyData, NameRatingData, XiYongData } from '../../visual/src/legacy/envelopeAdapters';
import type { CeziResult } from '../../visual/src/legacy/ceziEngine';
import type { ChenguzResult } from '../../visual/src/legacy/chenguzEngine';
import type { RhythmResult } from '../../visual/src/legacy/rhythmEngine';
import type { AssessResult } from '../../visual/src/legacy/constitutionAssessEngine';

export type DailyPresentationTool = 'analyze_name' | 'calc_xiyong' | 'get_constitution_tendency' | 'cast_cezi' | 'calc_chenguz' | 'get_daily_rhythm' | 'assess_constitution';

type DailyPresentationData = NameRatingData | XiYongData | ConstitutionTendencyData | CeziResult | ChenguzResult | RhythmResult | AssessResult;

export type DailyPresentationClaim =
  | { tool: 'analyze_name'; kind: 'nameRating'; field: 'totalScore' | 'grade'; value: number | string }
  | { tool: 'analyze_name'; kind: 'nameDimension'; name: string; field: 'score' | 'weight'; value: number }
  | { tool: 'calc_xiyong'; kind: 'xiyong'; field: 'dayMasterWuxing' | 'qiangRuo' | 'shen'; value: string }
  | { tool: 'calc_xiyong'; kind: 'xiyong'; field: 'similarPoint' | 'heterogeneousPoint'; value: number }
  | { tool: 'calc_xiyong'; kind: 'xiyongElements'; group: 'similar' | 'heterogeneous'; value: string[] }
  | { tool: 'get_constitution_tendency'; kind: 'constitutionTendencySource'; field: 'dayun' | 'sitian' | 'zaiquan'; value: string }
  | { tool: 'get_constitution_tendency'; kind: 'constitutionTendency'; index: number; field: 'type'; value: string }
  | { tool: 'cast_cezi'; kind: 'cezi'; field: 'char' | 'strokes' | 'strokesEstimated' | 'charWuxing'; value: string | number | boolean }
  | { tool: 'cast_cezi'; kind: 'ceziShuli'; field: 'number' | 'lucky' | 'skyNine'; value: string | number }
  | { tool: 'cast_cezi'; kind: 'ceziStructure'; field: 'structure' | 'radical'; value: string }
  | { tool: 'cast_cezi'; kind: 'ceziBaziComplement'; field: 'complement' | 'score'; value: string | number | null }
  | { tool: 'calc_chenguz'; kind: 'chenguzBone'; component: 'yearBone' | 'hourBone'; field: 'branch' | 'liang' | 'qian'; value: string | number }
  | { tool: 'calc_chenguz'; kind: 'chenguzBone'; component: 'monthBone'; field: 'lunarMonth' | 'liang' | 'qian'; value: number }
  | { tool: 'calc_chenguz'; kind: 'chenguzBone'; component: 'dayBone'; field: 'lunarDay' | 'liang' | 'qian'; value: number }
  | { tool: 'calc_chenguz'; kind: 'chenguzTotal'; field: 'liang' | 'qian' | 'text'; value: string | number }
  | { tool: 'calc_chenguz'; kind: 'chenguzVersion'; field: 'id' | 'name'; value: string }
  | { tool: 'get_daily_rhythm'; kind: 'rhythm'; field: 'date' | 'jieqi'; value: string }
  | { tool: 'get_daily_rhythm'; kind: 'rhythmMeridian'; field: 'time' | 'hours' | 'meridian' | 'organ'; value: string | null }
  | { tool: 'assess_constitution'; kind: 'constitution'; field: 'dominantType'; value: string }
  | { tool: 'assess_constitution'; kind: 'constitutionScore'; type: string; value: number };

export interface DailyClaimViolation {
  index: number;
  tool: DailyPresentationClaim['tool'];
  kind: DailyPresentationClaim['kind'];
  message: string;
  expected?: string | number | boolean | string[] | null;
  actual: string | number | boolean | string[] | null;
}

export interface DailyClaimValidation {
  valid: boolean;
  violations: DailyClaimViolation[];
}

const presentationResults = new Map<string, { tool: DailyPresentationTool; data: DailyPresentationData }>();

export function registerDailyPresentation(tool: DailyPresentationTool, data: DailyPresentationData, token: string) {
  presentationResults.set(token, { tool, data });
}

export function validateDailyPresentation(token: string, claims: DailyPresentationClaim[]): DailyClaimValidation | null {
  const entry = presentationResults.get(token);
  return entry ? validateDailyClaims(entry.tool, entry.data, claims) : null;
}

export function validateDailyClaims(
  tool: DailyPresentationTool,
  data: DailyPresentationData,
  claims: DailyPresentationClaim[],
): DailyClaimValidation {
  const violations: DailyClaimViolation[] = [];

  claims.forEach((claim, index) => {
    const expected = claim.tool === tool ? getExpectedValue(data, claim) : undefined;
    if (!valuesEqual(claim.value, expected)) {
      violations.push({
        index,
        tool: claim.tool,
        kind: claim.kind,
        message: claim.tool === tool ? `${claim.kind} 与本次${tool}基础结果不一致。` : `该凭证不属于 ${claim.tool}，不能校验此断言。`,
        expected,
        actual: claim.value,
      });
    }
  });

  return { valid: violations.length === 0, violations };
}

function valuesEqual(
  actual: DailyPresentationClaim['value'],
  expected: string | number | boolean | string[] | null | undefined,
): boolean {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return Array.isArray(actual) && Array.isArray(expected)
      && actual.length === expected.length
      && actual.every((value, index) => value === expected[index]);
  }
  return actual === expected;
}

function getExpectedValue(
  data: DailyPresentationData,
  claim: DailyPresentationClaim,
): string | number | boolean | string[] | null | undefined {
  switch (claim.tool) {
    case 'analyze_name': {
      const result = data as NameRatingData;
      if (claim.kind === 'nameRating') return result[claim.field];
      return result.dimensions.find((dimension) => dimension.name === claim.name)?.[claim.field];
    }
    case 'calc_xiyong': {
      const result = data as XiYongData;
      return claim.kind === 'xiyongElements' ? result[claim.group] : result[claim.field];
    }
    case 'get_constitution_tendency': {
      const result = data as ConstitutionTendencyData;
      return claim.kind === 'constitutionTendencySource'
        ? result[claim.field]
        : result.tendencies[claim.index]?.type;
    }
    case 'cast_cezi': {
      const result = data as CeziResult;
      if (claim.kind === 'cezi') return result[claim.field];
      if (claim.kind === 'ceziShuli') return result.shuli[claim.field];
      if (claim.kind === 'ceziStructure') return result.structure[claim.field];
      return result.baziComplement?.[claim.field] ?? null;
    }
    case 'calc_chenguz': {
      const result = data as ChenguzResult;
      if (claim.kind === 'chenguzBone') {
        if (claim.component === 'yearBone' || claim.component === 'hourBone') {
          const bone = result[claim.component];
          if (claim.field === 'liang' || claim.field === 'qian') return bone.weight[claim.field];
          return bone.branch;
        }
        if (claim.component === 'monthBone') {
          if (claim.field === 'liang' || claim.field === 'qian') return result.monthBone.weight[claim.field];
          return result.monthBone.lunarMonth;
        }
        if (claim.field === 'liang' || claim.field === 'qian') return result.dayBone.weight[claim.field];
        return result.dayBone.lunarDay;
      }
      if (claim.kind === 'chenguzTotal') return claim.field === 'text' ? result.totalText : result.total[claim.field];
      return claim.field === 'id' ? result.versionId : result.versionName;
    }
    case 'get_daily_rhythm': {
      const result = data as RhythmResult;
      if (claim.kind === 'rhythm') return result[claim.field];
      return result.meridian?.[claim.field] ?? null;
    }
    case 'assess_constitution': {
      const result = data as AssessResult;
      return claim.kind === 'constitution' ? result.dominantType : result.scores[claim.type];
    }
  }
}
