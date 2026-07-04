import type { ModuleId } from '@/lib/modules';
import { MODULES, getModuleById } from '@/lib/modules';

interface WorkspaceTabsProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

export function WorkspaceTabs({ activeModule, onSelectModule }: WorkspaceTabsProps) {
  const active = getModuleById(activeModule);

  return (
    <div className="rounded-panel border border-ink-700 bg-ink-850/70 p-2">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="工作区标签">
        {MODULES.map((module) => (
          <button
            key={module.id}
            type="button"
            role="tab"
            aria-selected={module.id === activeModule}
            onClick={() => onSelectModule(module.id)}
            className={[
              'shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition',
              module.id === activeModule
                ? 'border-jade-500/40 bg-jade-500/12 text-zinc-50'
                : 'border-transparent text-zinc-500 hover:border-white/10 hover:text-zinc-200',
            ].join(' ')}
          >
            {module.title}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2 rounded-card border border-white/8 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-serif text-2xl font-semibold text-zinc-100">{active.title}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{active.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-3 py-1 text-xs text-jade-500">{active.statusLabel}</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-400">{active.privacyLevel}</span>
        </div>
      </div>
    </div>
  );
}
