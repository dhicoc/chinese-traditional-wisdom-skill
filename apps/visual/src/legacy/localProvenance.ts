import type { ToolEnvelope } from './baseTypes';
import type { TrueSolarTimeResolution } from './trueSolarTime';
import { LOCAL_TOOL_REGISTRY, type LocalToolName } from './localToolRegistry';
import { createInputFingerprint, type ResultProvenance } from './provenance';

export const RULESET_VERSION = '2026.08.20';
export const PROVENANCE_SCHEMA_VERSION = '1.0.0' as const;

const DEPENDENCY_VERSIONS = {
  'lunar-typescript': '1.8.6',
  iztro: '2.5.8',
  '3meta': '2.6.0',
} as const;

function collectCitationIds(value: unknown, out = new Set<string>(), seen = new WeakSet<object>()): string[] {
  if (typeof value === 'string') {
    for (const match of value.match(/kb:\/\/[\w./%\-\u4e00-\u9fff]+/g) ?? []) out.add(match);
    return [...out].sort();
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return [...out].sort();
  seen.add(value);
  for (const child of Array.isArray(value) ? value : Object.values(value as Record<string, unknown>)) collectCitationIds(child, out, seen);
  return [...out].sort();
}

function buildProvenance(tool: LocalToolName, input: unknown, result: ToolEnvelope<unknown> | TrueSolarTimeResolution): ResultProvenance {
  const definition = LOCAL_TOOL_REGISTRY[tool];
  const envelope = definition.resultKind === 'ToolEnvelope' ? result as ToolEnvelope<unknown> : null;
  const limitations = [
    '输入指纹基于脱敏字段，仅用于本地一致性标识，不是密码学签名，也不能恢复原始输入。',
    '结构化事实一致性不验证传统解释、建议、预测或现实效果。',
    ...(envelope?.evidence?.limitations ?? []),
  ];
  return {
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    tool,
    resultToolId: definition.resultToolId,
    toolVersion: envelope?.version ?? '1.0.0',
    rulesetVersion: RULESET_VERSION,
    dependencyVersions: { ...DEPENDENCY_VERSIONS },
    calculationConfig: { ...(envelope?.result_meta?.calculationConfig ?? {}) },
    inputFingerprint: createInputFingerprint(input),
    citationIds: collectCitationIds(result),
    limitations: [...new Set(limitations)],
  };
}

export function attachLocalProvenance<T extends ToolEnvelope<unknown> | TrueSolarTimeResolution>(
  tool: LocalToolName,
  input: unknown,
  result: T,
): T {
  return { ...result, provenance: buildProvenance(tool, input, result) };
}
