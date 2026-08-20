import type { ToolEnvelope } from './baseTypes';
import { LocalToolError } from './localToolErrors';
import { LOCAL_TOOL_REGISTRY, type LocalToolName } from './localToolRegistry';
import { validateBaziClaims } from './claimVerification/baziClaimVerifier';
import { validateZiweiClaims } from './claimVerification/ziweiClaimVerifier';
import { validateFeixingClaims } from './claimVerification/feixingClaimVerifier';
import { validateBazhaiClaims } from './claimVerification/bazhaiClaimVerifier';
import { validateCalendarClaims, type CalendarPresentationKind } from './claimVerification/calendarClaimVerifier';
import { validateDivinationClaims, type DivinationPresentationTool } from './claimVerification/divinationClaimVerifier';
import { validateDailyClaims, type DailyPresentationTool } from './claimVerification/dailyClaimVerifier';
import { validateComboClaims, type ComboPresentationTool } from './claimVerification/comboClaimVerifier';

export interface PublicClaimVerification {
  valid: boolean;
  tool: LocalToolName;
  verifiedFacts: Array<{ index: number; claim: Record<string, unknown> }>;
  violations: unknown[];
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new LocalToolError('INVALID_INPUT', `${label}必须是 JSON 对象。`);
  }
  return value as Record<string, unknown>;
}

const CALENDAR_KIND: Partial<Record<LocalToolName, CalendarPresentationKind>> = {
  calc_yunqi: 'yunqi',
  xingxiu_daily: 'xingxiu',
  get_almanac: 'almanac',
};

function runVerifier(tool: LocalToolName, data: unknown, claims: unknown[]) {
  const kind = LOCAL_TOOL_REGISTRY[tool].claimVerifier;
  switch (kind) {
    case 'bazi': return validateBaziClaims(data as never, claims as never);
    case 'ziwei': return validateZiweiClaims(data as never, claims as never);
    case 'feixing': return validateFeixingClaims(data as never, claims as never);
    case 'bazhai': return validateBazhaiClaims(data as never, claims as never);
    case 'calendar': return validateCalendarClaims(CALENDAR_KIND[tool]!, data as never, claims as never);
    case 'divination': return validateDivinationClaims(tool as DivinationPresentationTool, data as never, claims as never);
    case 'daily': return validateDailyClaims(tool as DailyPresentationTool, data as never, claims as never);
    case 'combo': return validateComboClaims(tool as ComboPresentationTool, data as never, claims as never);
    case 'none': throw new LocalToolError('UNSUPPORTED_INPUT', `${tool} 当前没有公开结构化 claims 校验器。`, tool);
  }
}

export function verifyLocalToolClaims(
  tool: LocalToolName,
  rawEnvelope: unknown,
  rawClaims: unknown,
): PublicClaimVerification {
  const definition = LOCAL_TOOL_REGISTRY[tool];
  if (definition.claimVerifier === 'none') {
    throw new LocalToolError('UNSUPPORTED_INPUT', `${tool} 当前没有公开结构化 claims 校验器。`, tool);
  }
  if (!Array.isArray(rawClaims)) {
    throw new LocalToolError('INVALID_INPUT', 'claims 必须是 JSON 数组。', tool);
  }

  const envelope = object(rawEnvelope, 'envelope') as unknown as ToolEnvelope<unknown>;
  if (envelope.ok !== true || !envelope.data) {
    throw new LocalToolError('INVALID_INPUT', '只能校验本次成功 ToolEnvelope.data。', tool);
  }
  if (envelope.tool !== definition.resultToolId) {
    throw new LocalToolError('INPUT_COMBINATION_INVALID', `envelope.tool=${String(envelope.tool)} 不是 ${tool} 的结果。`, tool);
  }

  const validation = runVerifier(tool, envelope.data, rawClaims) as unknown as {
    valid: boolean;
    violations: Array<{ index: number }>;
  };
  const invalidIndexes = new Set(validation.violations.map(({ index }) => index));
  return {
    valid: validation.valid,
    tool,
    verifiedFacts: rawClaims
      .map((claim, index) => ({ index, claim: object(claim, `claims[${index}]`) }))
      .filter(({ index }) => !invalidIndexes.has(index)),
    violations: validation.violations,
  };
}
