import type { ModuleGroup, ModuleId, WisdomModule } from '@/lib/modules';
import { MODULE_GROUPS, MODULES } from '@/lib/modules';

interface SidebarNavProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

function statusTone(status: WisdomModule['status']) {
  if (status === 'local-exact') return 'bg-jade-500/12 text-jade-500 ring-jade-500/20';
  if (status === 'demo') return 'bg-cinnabar-500/12 text-cinnabar-500 ring-cinnabar-500/20';
  return 'bg-white/7 text-zinc-300 ring-white/10';
}

export function SidebarNav({ activeModule, onSelectModule }: SidebarNavProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col rounded-panel border border-ink-700 bg-ink-850/92 p-3 shadow-instrument">
      <div className="mb-4 rounded-card border border-white/8 bg-white/[0.035] p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-jade-500">Local-first</p>
        <h1 className="mt-2 font-serif text-xl font-semibold text-zinc-100">中国传统文化智慧工具台</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">新中式数据主义界面预览，保留旧 Dashboard 的确定性引擎契约。</p>
      </div>

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1" aria-label="模块导航">
        {MODULE_GROUPS.map((group: ModuleGroup) => {
          const modules = MODULES.filter((module) => module.group === group);
          return (
            <section key={group}>
              <h2 className="mb-2 px-2 text-xs font-semibold text-zinc-500">{group}</h2>
              <div className="space-y-1">
                {modules.map((module) => {
                  const active = module.id === activeModule;
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => onSelectModule(module.id)}
                      className={[
                        'group flex w-full items-center gap-3 rounded-card border px-3 py-2.5 text-left transition',
                        active
                          ? 'border-jade-500/35 bg-jade-500/10 text-zinc-50 shadow-glowJade'
                          : 'border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[0.045] hover:text-zinc-100',
                      ].join(' ')}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: module.accent }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{module.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">{module.questionTypes.join(' / ')}</span>
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${statusTone(module.status)}`}>
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

      <div className="mt-4 rounded-card border border-white/8 bg-black/20 p-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Agent Status</span>
          <span className="text-jade-500">Ready</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-zinc-500">旧入口保留，新 React Shell 仅作为迁移预览。</p>
      </div>
    </aside>
  );
}
