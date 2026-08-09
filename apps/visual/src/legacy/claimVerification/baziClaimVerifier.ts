import type { BaziData } from '../baziEngine';

export type BaziPresentationClaim =
  | { kind: 'pillar'; pillar: 'year' | 'month' | 'day' | 'hour'; value: string }
  | { kind: 'dayMaster'; value: string }
  | { kind: 'elementCount'; element: '木' | '火' | '土' | '金' | '水'; value: number }
  | { kind: 'strength'; value: '身强' | '身弱' | '中和' }
  | { kind: 'luck'; ageStart: number; value: string }
  | { kind: 'shenSha'; value: string };

export interface BaziClaimViolation {
  index: number;
  kind: BaziPresentationClaim['kind'];
  message: string;
  expected?: string | number;
  actual: string | number;
}

export interface BaziClaimValidation {
  valid: boolean;
  violations: BaziClaimViolation[];
}

export function validateBaziClaims(data: BaziData, claims: BaziPresentationClaim[]): BaziClaimValidation {
  const violations: BaziClaimViolation[] = [];

  claims.forEach((claim, index) => {
    if (claim.kind === 'pillar') {
      const pillar = data.pillars[claim.pillar];
      const expected = `${pillar.stem}${pillar.branch}`;
      if (claim.value !== expected) {
        violations.push({ index, kind: claim.kind, message: `${claim.pillar} 柱与本次排盘不一致。`, expected, actual: claim.value });
      }
      return;
    }

    if (claim.kind === 'dayMaster') {
      if (claim.value !== data.dayMaster) {
        violations.push({ index, kind: claim.kind, message: '日主与本次排盘不一致。', expected: data.dayMaster, actual: claim.value });
      }
      return;
    }

    if (claim.kind === 'elementCount') {
      const expected = data.elements[claim.element];
      if (claim.value !== expected) {
        violations.push({ index, kind: claim.kind, message: `${claim.element} 五行计数与本次排盘不一致。`, expected, actual: claim.value });
      }
      return;
    }

    if (claim.kind === 'strength') {
      const expected = data.advancedAnalysis.support.strength;
      if (claim.value !== expected) {
        violations.push({ index, kind: claim.kind, message: '日主强弱与本次排盘不一致。', expected, actual: claim.value });
      }
      return;
    }

    if (claim.kind === 'luck') {
      const luck = data.luck.find((item) => item.ageStart === claim.ageStart);
      const expected = luck ? `${luck.stem}${luck.branch}` : undefined;
      if (claim.value !== expected) {
        violations.push({ index, kind: claim.kind, message: `${claim.ageStart} 岁起的大运与本次排盘不一致。`, expected, actual: claim.value });
      }
      return;
    }

    const shenShaNames = new Set(data.shenSha.map((item) => item.name));
    const expected = shenShaNames.has(claim.value) || (claim.value === '无' && data.shenSha.length === 0);
    if (!expected) {
      violations.push({ index, kind: claim.kind, message: `神煞“${claim.value}”未出现在本次排盘。`, actual: claim.value });
    }
  });

  return { valid: violations.length === 0, violations };
}
