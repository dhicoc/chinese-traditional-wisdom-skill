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
      <div className="sidebar-brand relative shrink-0 overflow-hidden rounded-[22px] border border-jade-500/18 bg-black/30 p-3.5">
        <div className="flex items-center gap-3">
          <div className="brand-seal grid h-11 w-11 shrink-0 place-items-center rounded-full border border-jade-500/30 bg-jade-500/10 text-jade-400">
            <XuanOrbitLogo className="h-9 w-9 drop-shadow-[0_0_10px_rgba(44,159,132,0.72)]" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-jade-400">XUANTAN LOCAL</p>
            <h1 className="mt-0.5 truncate text-base font-semibold tracking-tight text-jade-50">玄学排盘</h1>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-jade-100/55">本地引擎 · 可验证的传统智慧工具台</p>
      </div>

      {/* 全局生辰控制台 */}
      <div className="mt-3 shrink-0">
        <BirthPanel />
      </div>

      {/* 页脚：隐私说明，贴底填充留白 */}
      <div className="mt-auto pt-3">
        <div className="rounded-[18px] border border-jade-500/12 bg-black/20 p-2.5">
          <div className="flex items-center justify-between text-[11px] text-jade-100/55">
            <span>本地坛场</span>
            <span className="flex items-center gap-1 text-jade-400">
              <span className="h-1.5 w-1.5 rounded-full bg-jade-400" />
              Ready
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-5 text-jade-100/35">不上传完整生辰，所有排盘在本地完成。</p>
        </div>
      </div>
    </aside>
  );
}
