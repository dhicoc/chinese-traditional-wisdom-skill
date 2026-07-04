import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import type { ModuleId } from '@/lib/modules';
import { MODULES } from '@/lib/modules';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { getCapabilityForTool, getLegacyTools, getToolModeLabel, type LegacyTool } from '@/legacy/toolRegistry';

interface HomeDashboardProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

function isModuleId(value: string): value is ModuleId {
  return MODULES.some((module) => module.id === value);
}

function fallbackTools(): LegacyTool[] {
  return MODULES.filter((module) => module.id !== 'home').map((module) => ({
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
  }));
}

function modeCounts(tools: LegacyTool[]) {
  let local = 0;
  let demo = 0;
  tools.forEach((tool) => {
    const mode = getCapabilityForTool(tool)?.mode ?? '';
    if (mode === 'local' || mode === 'local-exact' || mode === 'local-approx' || mode === 'derived' || mode === 'knowledge') local += 1;
    if (mode === 'demo' || mode === 'fallback-demo' || mode === 'external-required') demo += 1;
  });
  return { local, demo };
}

export function HomeDashboard({ activeModule, onSelectModule }: HomeDashboardProps) {
  const [tools, setTools] = useState<LegacyTool[]>(() => fallbackTools());
  const [legacyReady, setLegacyReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (!mounted) return;
      if (state.mode === 'ready') {
        setTools(getLegacyTools());
        setLegacyReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const selected = MODULES.find((module) => module.id === activeModule) ?? MODULES[0];
  const grouped = useMemo(
    () => tools.reduce<Record<string, LegacyTool[]>>((acc, tool) => {
      acc[tool.category] = acc[tool.category] ?? [];
      acc[tool.category].push(tool);
      return acc;
    }, {}),
    [tools],
  );
  const counts = modeCounts(tools);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <div className="rounded-panel border border-ink-700 bg-ink-850/82 p-6 shadow-instrument md:p-8">
          <p className="w-fit rounded-full border border-jade-500/25 bg-jade-500/10 px-3 py-1 font-mono text-xs font-semibold tracking-[0.18em] text-jade-500">
            NEO-CHINESE DATAVIZ
          </p>
          <h2 className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-[-0.03em] text-zinc-50 md:text-6xl">
            用专业仪器感重构传统智慧工作台。
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">
            React 迁移预览已接入旧 ToolManifest 与 CapabilityRegistry，首页目录来自当前稳定 Dashboard 的真实 manifest。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onSelectModule('bazi')}
              className="rounded-full border border-cinnabar-600 bg-cinnabar-500 px-5 py-3 text-sm font-semibold text-zinc-50 transition hover:bg-cinnabar-600"
            >
              进入八字
            </button>
            <button
              type="button"
              onClick={() => onSelectModule('yunqi')}
              className="rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-jade-500/30 hover:text-jade-500"
            >
              看五运六气
            </button>
          </div>
        </div>

        <div className="grid gap-3 rounded-panel border border-ink-700 bg-black/24 p-4">
          {[
            ['工具入口', tools.length],
            ['本地与派生能力', counts.local],
            ['演示边界', counts.demo],
          ].map(([label, value]) => (
            <div key={label} className="rounded-card border border-white/8 bg-white/[0.04] p-4">
              <p className="font-mono text-3xl font-semibold text-jade-500">{value}</p>
              <p className="mt-1 text-sm text-zinc-400">{label}</p>
            </div>
          ))}
          <div className="rounded-card border border-cinnabar-500/20 bg-cinnabar-500/8 p-4">
            <p className="text-sm font-semibold text-zinc-100">当前模块</p>
            <p className="mt-1 text-sm text-zinc-400">{selected.title} · {selected.statusLabel}</p>
            <p className="mt-2 text-xs text-zinc-500">{legacyReady ? '已读取旧 manifest' : '使用静态 fallback'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {Object.entries(grouped).map(([group, groupTools]) => (
          <section key={group} className="rounded-panel border border-ink-700 bg-ink-850/72 p-4">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
              <h3 className="font-serif text-xl font-semibold text-zinc-100">{group}</h3>
              <span className="text-xs text-zinc-500">{groupTools.length} 个入口</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {groupTools.map((tool) => {
                const modeLabel = getToolModeLabel(tool);
                const capability = getCapabilityForTool(tool);
                const active = tool.entryTab === activeModule;
                return (
                  <article
                    key={tool.id}
                    className={[
                      'group flex min-h-48 flex-col rounded-card border p-4 text-left transition hover:-translate-y-0.5',
                      active
                        ? 'border-jade-500/35 bg-jade-500/10 shadow-glowJade'
                        : 'border-white/8 bg-white/[0.035] hover:border-white/16 hover:bg-white/[0.055]',
                    ].join(' ')}
                  >
                    <button type="button" onClick={() => isModuleId(tool.entryTab) && onSelectModule(tool.entryTab)} className="flex flex-1 flex-col text-left">
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/24 font-serif text-sm font-semibold" style={{ color: tool.accent }}>
                          {tool.icon || tool.title.slice(0, 1)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-zinc-400">{modeLabel}</span>
                      </div>
                      <p className="mt-4 text-base font-semibold text-zinc-100">{tool.title}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{tool.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {tool.questionTypes.slice(0, 2).map((type) => (
                          <span key={type} className="rounded-full bg-black/24 px-2 py-1 text-xs text-zinc-500">{type}</span>
                        ))}
                      </div>
                    </button>
                    <div className="mt-4 border-t border-white/8 pt-3">
                      <CopyContextButton
                        label="Copy context"
                        title={`${tool.title} 工具上下文`}
                        payload={{ tool, capability, modeLabel, source: 'legacy ToolManifest + CapabilityRegistry' }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
