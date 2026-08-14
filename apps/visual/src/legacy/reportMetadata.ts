import type { ModuleId } from '@/lib/modules';
import { getLegacyCapabilities } from '@/legacy/toolRegistry';

export const REPORT_FORMAT_VERSION = '1.0';

export type ReportTimeBasis = 'true-solar-verified' | 'civil-unverified';

export interface ReportMetadata {
  reportVersion: string;
  toolVersion: string;
  capabilityMode: string;
  inputSummary: string;
  timeBasis?: string;
}

export interface ReportMetadataItem {
  label: '报告版本' | '工具版本' | '能力模式' | '输入摘要' | '时间口径';
  value: string;
}

export interface ReportMetadataInput {
  tool: string;
  version: string;
  capability: { mode: string; modeLabel: string };
  inputSummary: string;
  timeBasis?: ReportTimeBasis;
}

export interface WorkspaceReportMetadataInput {
  moduleId: Exclude<ModuleId, 'home'>;
  tool: string;
  version: string;
  inputSummary: string;
  timeBasis?: ReportTimeBasis;
}

const TIME_BASIS_LABEL: Record<ReportTimeBasis, string> = {
  'true-solar-verified': '已核验真太阳时',
  'civil-unverified': '民用时间（未完成真太阳时复核）',
};

export function createReportMetadata(input: ReportMetadataInput): ReportMetadata {
  return {
    reportVersion: REPORT_FORMAT_VERSION,
    toolVersion: `${input.tool}@${input.version}`,
    capabilityMode: `${input.capability.modeLabel}（${input.capability.mode}）`,
    inputSummary: input.inputSummary,
    ...(input.timeBasis ? { timeBasis: TIME_BASIS_LABEL[input.timeBasis] } : {}),
  };
}

export function createWorkspaceReportMetadata(input: WorkspaceReportMetadataInput): ReportMetadata {
  const capability = getLegacyCapabilities()[input.moduleId];
  if (!capability) throw new Error(`Missing capability metadata for module: ${input.moduleId}`);

  return createReportMetadata({
    tool: input.tool,
    version: input.version,
    capability,
    inputSummary: input.inputSummary,
    timeBasis: input.timeBasis,
  });
}

export function getReportMetadataItems(metadata: ReportMetadata): ReportMetadataItem[] {
  return [
    { label: '报告版本', value: metadata.reportVersion },
    { label: '工具版本', value: metadata.toolVersion },
    { label: '能力模式', value: metadata.capabilityMode },
    { label: '输入摘要', value: metadata.inputSummary },
    ...(metadata.timeBasis ? [{ label: '时间口径' as const, value: metadata.timeBasis }] : []),
  ];
}
