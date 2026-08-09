import type { FeixingResult } from '../../visual/src/legacy/feixingEngine';

export type FeixingPresentationClaim =
  | { kind: 'year'; value: number }
  | { kind: 'yuanYun'; field: 'num' | 'name' | 'wangStar' | 'shengStar' | 'tuiStar'; value: number | string }
  | { kind: 'center'; field: 'centerStar' | 'starName' | 'wuxing' | 'luck'; value: number | string }
  | { kind: 'palace'; palace: string; field: 'starNum' | 'starName' | 'luck'; value: number | string };

export interface FeixingClaimViolation {
  index: number;
  kind: FeixingPresentationClaim['kind'];
  message: string;
  expected?: string | number;
  actual: string | number;
}

export interface FeixingClaimValidation {
  valid: boolean;
  violations: FeixingClaimViolation[];
}

const presentationResults = new Map<string, FeixingResult>();

export function registerFeixingPresentation(data: FeixingResult, token: string) {
  presentationResults.set(token, data);
}

export function validateFeixingPresentation(token: string, claims: FeixingPresentationClaim[]): FeixingClaimValidation | null {
  const data = presentationResults.get(token);
  return data ? validateFeixingClaims(data, claims) : null;
}

export function validateFeixingClaims(data: FeixingResult, claims: FeixingPresentationClaim[]): FeixingClaimValidation {
  const violations: FeixingClaimViolation[] = [];

  claims.forEach((claim, index) => {
    const expected = getExpectedValue(data, claim);
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

function getExpectedValue(data: FeixingResult, claim: FeixingPresentationClaim): string | number | undefined {
  if (claim.kind === 'year') return data.year;
  if (claim.kind === 'yuanYun') return data.yuanYun[claim.field];
  if (claim.kind === 'center') return data.center[claim.field];
  return data.grid.flat().find((cell) => cell.palace === claim.palace)?.[claim.field];
}

function getViolationMessage(claim: FeixingPresentationClaim): string {
  if (claim.kind === 'year') return '年度与本次流年飞星推算结果不一致。';
  if (claim.kind === 'yuanYun') return `元运${claim.field}与本次流年飞星推算结果不一致。`;
  if (claim.kind === 'center') return `中宫${claim.field}与本次流年飞星推算结果不一致。`;
  return `${claim.palace}宫的${claim.field}与本次九宫飞星盘不一致。`;
}
