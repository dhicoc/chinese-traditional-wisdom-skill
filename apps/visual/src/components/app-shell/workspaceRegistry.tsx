import type { ComponentType } from 'react';
import { HomeDashboard } from '@/features/home/HomeDashboard';
import { BaziWorkspace } from '@/features/bazi/BaziWorkspace';
import { YunqiWorkspace } from '@/features/yunqi/YunqiWorkspace';
import { ConstitutionWorkspace } from '@/features/constitution/ConstitutionWorkspace';
import { LiuyaoWorkspace } from '@/features/liuyao/LiuyaoWorkspace';
import { MeihuaWorkspace } from '@/features/meihua/MeihuaWorkspace';
import { ZiweiWorkspace } from '@/features/ziwei/ZiweiWorkspace';
import { FeixingWorkspace } from '@/features/feixing/FeixingWorkspace';
import { BazhaiWorkspace } from '@/features/bazhai/BazhaiWorkspace';
import { FengshuiWorkspace } from '@/features/fengshui/FengshuiWorkspace';
import { MermaidWorkspace } from '@/features/mermaid/MermaidWorkspace';
import { TestRunnerConsole } from '@/features/testing/TestRunnerConsole';
import { AncientTextSplitReader } from '@/features/knowledge/AncientTextSplitReader';
import { HistoryWorkspace } from '@/features/history/HistoryPanel';
import type { ModuleId } from '@/lib/modules';

interface WorkspaceProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

export const WORKSPACE_COMPONENTS: Partial<Record<ModuleId, ComponentType<WorkspaceProps>>> = {
  bazi: BaziWorkspace,
  yunqi: YunqiWorkspace,
  meihua: MeihuaWorkspace,
  liuyao: LiuyaoWorkspace,
  ziwei: ZiweiWorkspace,
  tizhi: ConstitutionWorkspace,
  feixing: FeixingWorkspace,
  bazhai: BazhaiWorkspace,
  fengshui: FengshuiWorkspace,
  mermaid: MermaidWorkspace,
  testing: TestRunnerConsole,
  reader: AncientTextSplitReader,
  history: HistoryWorkspace,
};

export function resolveWorkspace(moduleId: ModuleId): ComponentType<WorkspaceProps> {
  return WORKSPACE_COMPONENTS[moduleId] ?? HomeDashboard;
}
