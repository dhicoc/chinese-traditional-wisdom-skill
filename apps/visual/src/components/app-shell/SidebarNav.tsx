import type { ModuleGroup, ModuleId, WisdomModule } from '@/lib/modules';
import { MODULE_GROUPS, MODULES } from '@/lib/modules';
import { XuanOrbitLogo } from './XuanOrbitLogo';
import { BirthPanel } from '@/components/shared/BirthPanel';

interface SidebarNavProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

function statusTone(status: WisdomModule['status']) {
  if (status === 'local-exact') return 'border-jade-500/30 bg-jade-500/10 text-jade-400';
  if (status === 'demo') return 'border-cinnabar-500/30 bg-cinnabar-500/10 text-cinnabar-500';
  if (status === 'knowledge') return 'border-gold-500/25 bg-gold-500/10 text-gold-400';
  return 'border-white/10 bg-white/[0.04] text-jade-100/50';
}

function moduleCode(index: number) {
  return String(index + 1).padStart(2, '0');
}

export function SidebarNav({ activeModule, onSelectModule }: SidebarNavProps) {
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

      <nav className="mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1" aria-label="模块导航">
        {MODULE_GROUPS.map((group: ModuleGroup) => {
          const modules = MODULES.filter((module) => module.group === group);
          return (
            <section key={group}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-[11px] font-semibold tracking-[0.16em] text-jade-100/40">{group}</h2>
                <span className="font-mono text-[10px] text-jade-100/25">{modules.length}</span>
              </div>
              <div className="space-y-1.5">
                {modules.map((module) => {
                  const active = module.id === activeModule;
                  const index = MODULES.findIndex((item) => item.id === module.id);
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => onSelectModule(module.id)}
                      data-testid="nav-item"
                      className={[
                        'sidebar-nav-item group relative flex w-full items-center gap-3 rounded-[16px] border px-3 py-3 text-left transition active:scale-[0.99]',
                        active
                          ? 'border-jade-500/30 bg-jade-500/12 text-jade-50'
                          : 'border-transparent text-jade-100/60 hover:border-jade-500/20 hover:bg-white/[0.045] hover:text-jade-100',
                      ].join(' ')}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/8 bg-black/30 font-mono text-[11px]" style={{ color: module.accent }}>
                        {moduleCode(index)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{module.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-jade-100/35">{module.questionTypes.join(' / ')}</span>
                      </span>
                      <span className={[
                        'hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] xl:inline-flex',
                        statusTone(module.status),
                      ].join(' ')}>
                        {module.statusLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>

      {/* 全局生辰控制台（替代原"本地坛场"装饰区） */}
      <div className="mt-4 shrink-0">
        <BirthPanel />
      </div>
    </aside>
  );
}
