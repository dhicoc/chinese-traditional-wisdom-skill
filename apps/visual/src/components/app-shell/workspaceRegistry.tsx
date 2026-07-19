import type { ComponentType } from 'react';
import { HomeDashboard } from '@/features/home/HomeDashboard';
import { BaziWorkspace } from '@/features/bazi/BaziWorkspace';
import { YunqiWorkspace } from '@/features/yunqi/YunqiWorkspace';
import { ConstitutionWorkspace } from '@/features/constitution/ConstitutionWorkspace';
import { LiuyaoWorkspace } from '@/features/liuyao/LiuyaoWorkspace';
import { MeihuaWorkspace } from '@/features/meihua/MeihuaWorkspace';
import { QimenWorkspace } from '@/features/qimen/QimenWorkspace';
import { ZiweiWorkspace } from '@/features/ziwei/ZiweiWorkspace';
import { FeixingWorkspace } from '@/features/feixing/FeixingWorkspace';
import { BazhaiWorkspace } from '@/features/bazhai/BazhaiWorkspace';
import { FengshuiWorkspace } from '@/features/fengshui/FengshuiWorkspace';
import { TestRunnerConsole } from '@/features/testing/TestRunnerConsole';
import { AncientTextSplitReader } from '@/features/knowledge/AncientTextSplitReader';
import { HistoryWorkspace } from '@/features/history/HistoryPanel';
// 日用工具扩展 (v0.4)
import { AlmanacWorkspace } from '@/features/almanac/AlmanacWorkspace';
import { NamewuxingWorkspace } from '@/features/namewuxing/NamewuxingWorkspace';
import { DreamWorkspace } from '@/features/dream/DreamWorkspace';
import { RhythmWorkspace } from '@/features/rhythm/RhythmWorkspace';
import { ComboWorkspace } from '@/features/combo/ComboWorkspace';
import { LiurenWorkspace } from '@/features/liuren/LiurenWorkspace';
import { XingXiuWorkspace } from '@/features/xingxiu/XingXiuWorkspace';
import { TaiyiWorkspace } from '@/features/taiyi/TaiyiWorkspace';
import { HuangjiWorkspace } from '@/features/huangji/HuangjiWorkspace';
import { CeziWorkspace } from '@/features/cezi/CeziWorkspace';
import { ChenguzWorkspace } from '@/features/chenguz/ChenguzWorkspace';
import type { ModuleId } from '@/lib/modules';

interface WorkspaceProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

export const WORKSPACE_COMPONENTS: Partial<Record<ModuleId, ComponentType<WorkspaceProps>>> = {
  bazi: BaziWorkspace,
  yunqi: YunqiWorkspace,
  meihua: MeihuaWorkspace,
  qimen: QimenWorkspace,
  liuyao: LiuyaoWorkspace,
  ziwei: ZiweiWorkspace,
  tizhi: ConstitutionWorkspace,
  feixing: FeixingWorkspace,
  bazhai: BazhaiWorkspace,
  fengshui: FengshuiWorkspace,
  testing: TestRunnerConsole,
  reader: AncientTextSplitReader,
  history: HistoryWorkspace,
  // 日用工具扩展 (v0.4)
  almanac: AlmanacWorkspace,
  namewuxing: NamewuxingWorkspace,
  dream: DreamWorkspace,
  rhythm: RhythmWorkspace,
  combo: ComboWorkspace,
  liuren: LiurenWorkspace,
  xingxiu: XingXiuWorkspace,
  taiyi: TaiyiWorkspace,
  huangji: HuangjiWorkspace,
  cezi: CeziWorkspace,
  chenguz: ChenguzWorkspace,
};

export function resolveWorkspace(moduleId: ModuleId): ComponentType<WorkspaceProps> {
  return WORKSPACE_COMPONENTS[moduleId] ?? HomeDashboard;
}
