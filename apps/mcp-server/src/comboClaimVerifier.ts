import type { ZeriResult } from '../../visual/src/legacy/comboEngine';

export type ComboPresentationTool = 'combo_zeri';

export type ComboPresentationClaim =
  | { tool: string; kind: 'zeriPurpose'; value: ZeriResult['zeriPurpose'] }
  | { tool: string; kind: 'zeriRange'; field: 'start' | 'end' | 'scannedDays'; value: string | number }
  | { tool: string; kind: 'zeriRankedDay'; index: number; field: 'date' | 'lunarDate' | 'dayGanZhi' | 'score' | 'tone' | 'chongOwner' | 'hitsAnnualSha'; value: string | number | boolean }
  | { tool: string; kind: 'zeriAnnualSha'; field: 'taisui' | 'suiPo' | 'sanSha' | 'fiveYellow'; value: string }
  | { tool: string; kind: 'zeriPersonalDirection'; index: number; field: 'star' | 'direction'; value: string };

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

const presentationResults = new Map<string, { tool: ComboPresentationTool; data: ZeriResult }>();

export function registerComboPresentation(tool: ComboPresentationTool, data: ZeriResult, token: string) {
  presentationResults.set(token, { tool, data });
}

export function validateComboPresentation(token: string, claims: ComboPresentationClaim[]): ComboClaimValidation | null {
  const entry = presentationResults.get(token);
  return entry ? validateComboClaims(entry.tool, entry.data, claims) : null;
}

export function validateComboClaims(
  tool: ComboPresentationTool,
  data: ZeriResult,
  claims: ComboPresentationClaim[],
): ComboClaimValidation {
  const violations: ComboClaimViolation[] = [];

  claims.forEach((claim, index) => {
    const expected = claim.tool === tool ? getExpectedValue(data, claim) : undefined;
    if (claim.value !== expected) {
      violations.push({
        index,
        tool: claim.tool,
        kind: claim.kind,
        message: claim.tool === tool
          ? `${claim.kind} 与本次${tool}基础结果不一致。`
          : `该凭证不属于 ${claim.tool}，不能校验此断言。`,
        expected,
        actual: claim.value,
      });
    }
  });

  return { valid: violations.length === 0, violations };
}

function getExpectedValue(
  data: ZeriResult,
  claim: ComboPresentationClaim,
): string | number | boolean | undefined {
  switch (claim.kind) {
    case 'zeriPurpose':
      return data.zeriPurpose;
    case 'zeriRange':
      return data.range[claim.field];
    case 'zeriRankedDay':
      return data.rankedDays[claim.index]?.[claim.field];
    case 'zeriAnnualSha':
      return data.annualSha[claim.field];
    case 'zeriPersonalDirection':
      return data.personalAuspicious[claim.index]?.[claim.field];
  }
}
