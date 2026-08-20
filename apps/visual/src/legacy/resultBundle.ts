import type { ToolEnvelope } from './baseTypes';
import type { TrueSolarTimeResolution } from './trueSolarTime';
import { runLocalTool } from './directRunner';
import { verifyLocalToolClaims } from './localClaimVerifier';
import { LOCAL_TOOL_REGISTRY, type LocalToolName } from './localToolRegistry';
import { LocalToolError } from './localToolErrors';
import { canonicalStringify, hashStableValue, redactFingerprintInput, type ResultProvenance } from './provenance';

export interface SafeResultBundle {
  schemaVersion: '1.0.0';
  tool: LocalToolName;
  resultToolId: string;
  resultVersion: string;
  provenance: ResultProvenance;
  verifiedFacts: unknown[];
  limitations: string[];
  disclaimers: string[];
  inputIncluded: false;
  replayable: false;
  integrity: string;
}

type BundleWithoutIntegrity = Omit<SafeResultBundle, 'integrity'>;

function safeClaim(value: unknown): unknown {
  const redacted = redactFingerprintInput(value);
  if (typeof redacted === 'string') return redacted.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '****-**-**');
  if (Array.isArray(redacted)) return redacted.map(safeClaim);
  if (redacted && typeof redacted === 'object') return Object.fromEntries(Object.entries(redacted as Record<string, unknown>).map(([key, child]) => [key, safeClaim(child)]));
  return redacted;
}

function bundleIntegrity(bundle: BundleWithoutIntegrity): string {
  return `fnv1a32:${hashStableValue(bundle)}`;
}

export async function createSafeResultBundle(tool: LocalToolName, input: unknown, claims: unknown[] = []): Promise<SafeResultBundle> {
  const result = await runLocalTool(tool, input) as ToolEnvelope<unknown> | TrueSolarTimeResolution;
  const definition = LOCAL_TOOL_REGISTRY[tool];
  if (!result.provenance) throw new LocalToolError('ENGINE_FAILURE', '本次结果缺少 provenance。', tool);
  if (definition.resultKind === 'ToolEnvelope' && (result as ToolEnvelope<unknown>).ok !== true) {
    throw new LocalToolError('ENGINE_FAILURE', (result as ToolEnvelope<unknown>).error?.message ?? '本次工具未生成成功结果。', tool);
  }

  let verifiedFacts: unknown[] = [];
  if (claims.length > 0) {
    const verification = verifyLocalToolClaims(tool, result, claims);
    if (!verification.valid) throw new LocalToolError('INPUT_COMBINATION_INVALID', 'claims 含未通过本次结果校验的断言，不能生成结果包。', tool);
    verifiedFacts = verification.verifiedFacts.map(({ claim }) => safeClaim(claim));
  }

  const base: BundleWithoutIntegrity = {
    schemaVersion: '1.0.0',
    tool,
    resultToolId: definition.resultToolId,
    resultVersion: definition.resultKind === 'ToolEnvelope' ? (result as ToolEnvelope<unknown>).version : '1.0.0',
    provenance: result.provenance,
    verifiedFacts,
    limitations: result.provenance.limitations,
    disclaimers: ['本结果包只记录脱敏 provenance 与已核验结构化 facts，不包含传统解释、现实效果保证或原始输入。'],
    inputIncluded: false,
    replayable: false,
  };
  return { ...base, integrity: bundleIntegrity(base) };
}

export function verifySafeResultBundle(value: unknown): { valid: boolean; expected: string; actual?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { valid: false, expected: '' };
  const { integrity, ...base } = value as SafeResultBundle;
  const expected = bundleIntegrity(base);
  return { valid: integrity === expected, expected, actual: integrity };
}

export function serializeSafeResultBundle(bundle: SafeResultBundle): string {
  return `${canonicalStringify(bundle)}\n`;
}
