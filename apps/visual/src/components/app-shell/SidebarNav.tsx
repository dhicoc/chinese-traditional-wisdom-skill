import type { ModuleId } from '@/lib/modules';
import { XuanOrbitLogo } from './XuanOrbitLogo';
import { BirthPanel } from '@/components/shared/BirthPanel';

interface SidebarNavProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

export function SidebarNav(_props: SidebarNavProps) {
  return (
    <aside data-testid="sidebar-nav" className="app-sidebar flex h-full min-h-0 flex-col rounded-[26px] border border-jade-500/18 bg-ink-950/94 p-4 shadow-instrument">
      <div className="sidebar-brand relative overflow-hidden rounded-[22px] border border-jade-500/18 bg-black/30 p-4">
        <div className="flex items-center gap-3">
          <div className="brand-seal grid h-12 w-12 shrink-0 place-items-center rounded-full border border-jade-500/30 bg-jade-500/10 text-jade-400">
            <XuanOrbitLogo className="h-9 w-9 drop-shadow-[0_0_10px_rgba(44,159,132,0.72)]" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-jade-400">XUANTAN LOCAL</p>
            <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-jade-50">玄学排盘</h1>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-jade-100/60">本地引擎、能力边界、知识映射集中在一套可验证的传统智慧工具台。</p>
      </div>

      {/* 全局生辰控制台（替代原"本地坛场"装饰区） */}
      <div className="mt-4 shrink-0">
        <BirthPanel />
      </div>
    </aside>
  );
}
