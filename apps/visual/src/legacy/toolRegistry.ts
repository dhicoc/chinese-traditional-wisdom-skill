import { MODULES, type ModuleId, type WisdomModule } from '@/lib/modules';

export interface LegacyTool {
  id: string;
  title: string;
  icon: string;
  category: string;
  entryTab: ModuleId;
  capabilityKey: string;
  questionTypes: string[];
  requiredInputs: string[];
  privacyLevel: string;
  reportSection: string;
  accent: string;
  intro: string;
  description: string;
}

export interface LegacyCapability {
  label: string;
  mode: string;
  modeLabel: string;
  note: string;
}

interface LegacyRegistryWindow extends Window {
  ToolManifest?: {
    getVisibleTools?: () => LegacyTool[];
    getTools?: () => LegacyTool[];
  };
  CapabilityRegistry?: {
    getCapabilities?: () => Record<string, LegacyCapability>;
    modeLabels?: Record<string, string>;
  };
}

function legacyWindow() {
  return window as LegacyRegistryWindow;
}

function fallbackTool(module: WisdomModule): LegacyTool {
  return {
    id: module.id,
    title: module.title,
    icon: module.shortTitle.slice(0, 1),
    category: module.group,
    entryTab: module.id,
    capabilityKey: module.id,
    questionTypes: module.questionTypes,
    requiredInputs: [],
    privacyLevel: module.privacyLevel,
    reportSection: module.id,
    accent: module.accent,
    intro: module.description,
    description: module.description,
  };
}

export function getLegacyTools(): LegacyTool[] {
  return legacyWindow().ToolManifest?.getVisibleTools?.() ?? MODULES.filter((module) => module.id !== 'home').map(fallbackTool);
}

export function getLegacyCapabilities(): Record<string, LegacyCapability> {
  return legacyWindow().CapabilityRegistry?.getCapabilities?.() ?? {};
}

export function getCapabilityForTool(tool: LegacyTool) {
  const capabilities = getLegacyCapabilities();
  return capabilities[tool.capabilityKey] ?? capabilities[tool.id];
}

export function getToolModeLabel(tool: LegacyTool) {
  const capability = getCapabilityForTool(tool);
  return capability?.modeLabel ?? '能力待确认';
}

export function countLegacyToolsByMode(tools: LegacyTool[], predicate: (mode: string) => boolean) {
  const capabilities = getLegacyCapabilities();
  return tools.filter((tool) => predicate(capabilities[tool.capabilityKey]?.mode ?? '')).length;
}
