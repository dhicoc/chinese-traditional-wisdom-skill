import type { ToolEnvelope } from './baseTypes';
import { LocalToolError } from './localToolErrors';
import type { LocalToolName } from './localToolRegistry';
import { describeLocalTool } from './localToolIntrospection';
import { validateBaziClaims, type BaziPresentationClaim } from './claimVerification/baziClaimVerifier';
import type { BaziData } from './baziEngine';

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

export function verifyLocalToolClaims(
  tool: LocalToolName,
  rawEnvelope: unknown,
  rawClaims: unknown,
): PublicClaimVerification {
  const descriptor = describeLocalTool(tool);
  if (descriptor.claimVerifier === 'none') {
    throw new LocalToolError('UNSUPPORTED_INPUT', `${tool} 当前没有公开结构化 claims 校验器。`, tool);
  }
  if (!Array.isArray(rawClaims)) {
    throw new LocalToolError('INVALID_INPUT', 'claims 必须是 JSON 数组。', tool);
  }

  const envelope = object(rawEnvelope, 'envelope') as unknown as ToolEnvelope<unknown>;
  if (envelope.ok !== true || !envelope.data) {
    throw new LocalToolError('INVALID_INPUT', '只能校验本次成功 ToolEnvelope.data。', tool);
  }

  if (tool === 'bazi_calculate') {
    if (envelope.tool !== 'BaziLunarAdapter') {
      throw new LocalToolError('INPUT_COMBINATION_INVALID', `envelope.tool=${String(envelope.tool)} 不是 bazi_calculate 的结果。`, tool);
    }
    const claims = rawClaims as BaziPresentationClaim[];
    const validation = validateBaziClaims(envelope.data as BaziData, claims);
    const invalidIndexes = new Set(validation.violations.map((violation) => violation.index));
    return {
      valid: validation.valid,
      tool,
      verifiedFacts: claims
        .map((claim, index) => ({ index, claim: claim as unknown as Record<string, unknown> }))
        .filter(({ index }) => !invalidIndexes.has(index)),
      violations: validation.violations,
    };
  }

  throw new LocalToolError('UNSUPPORTED_INPUT', `${tool} 的公开 claims CLI 将在 registry 迁移阶段接入。`, tool);
}
