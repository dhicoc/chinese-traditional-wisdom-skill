import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import type { ModuleId } from '@/lib/modules';
import { MODULES } from '@/lib/modules';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { getCapabilityForTool, getLegacyTools, getToolModeLabel, type LegacyTool } from '@/legacy/toolRegistry';
import { useBirth } from '@/lib/birthContext';

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

function birthSummary(year: number, month: number, day: number, hour: number) {
  return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0') + ' ' + String(hour).padStart(2, '0') + ':00';
}

export function HomeDashboard({ activeModule, onSelectModule }: HomeDashboardProps) {
  const { birth } = useBirth();
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
  const primaryTools = tools.filter((tool) => ['bazi', 'ziwei', 'liuyao', 'meihua', 'fengshui'].includes(tool.entryTab));

  return (
    <section className="space-y-5">
      <div className="home-console-grid grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
        <section className="console-panel rounded-[22px] border border-talisman-500/20 bg-ink-950/90 p-4 shadow-instrument">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-talisman-500">Birth Input</p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-50">排盘信息</h2>
            </div>
            <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2.5 py-1 text-[10px] text-jade-500">已同步</span>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">出生时间</dt>
              <dd className="mt-1 font-mono text-zinc-100">{birthSummary(birth.year, birth.month, birth.day, birth.hour)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">历法 / 性别</dt>
              <dd className="mt-1 text-zinc-100">{birth.isLunar ? '农历' : '公历'} · {birth.gender} · {birth.useExactCalendar ? '精确历法' : '近似历法'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">隐私边界</dt>
              <dd className="mt-1 text-zinc-300">仅在浏览器本地计算，不保存完整姓名、完整出生地。</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => onSelectModule('bazi')}
            className="mt-5 w-full rounded-[16px] border border-cinnabar-500/50 bg-cinnabar-500 px-4 py-3 text-sm font-semibold text-zinc-50 transition hover:bg-cinnabar-600 active:scale-[0.99]"
          >
            立即排盘
          </button>
        </section>

        <section className="console-panel center-oracle rounded-[22px] border border-talisman-500/20 bg-ink-950/90 p-4 shadow-instrument">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-talisman-500">Core Plate</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-50">四柱 / 九宫工作台</h2>
            </div>
            <CopyContextButton
              commandScope="home"
              title="首页工具目录上下文"
              payload={{ module: selected, tools: tools.length, localCapabilities: counts.local, demoBoundaries: counts.demo, legacyReady, source: 'ToolManifest + CapabilityRegistry + React HomeDashboard' }}
            />
          </div>
          <div className="home-plate mx-auto mt-4 aspect-square max-h-[360px] w-full max-w-[420px]">
            <div className="home-plate-ring home-plate-ring-outer" />
            <div className="home-plate-ring home-plate-ring-inner" />
            <div className="home-plate-grid">
              {['年', '月', '日', '时'].map((label, index) => (
                <div key={label} className="home-pillar-cell">
                  <span className="text-xs text-zinc-500">{label}柱</span>
                  <strong>{['庚', '辛', '甲', '戊'][index]}</strong>
                  <small>{['午', '巳', '寅', '辰'][index]}</small>
                </div>
              ))}
            </div>
            <div className="home-plate-orbit home-plate-wood">木</div>
            <div className="home-plate-orbit home-plate-fire">火</div>
            <div className="home-plate-orbit home-plate-earth">土</div>
            <div className="home-plate-orbit home-plate-metal">金</div>
            <div className="home-plate-core">命</div>
          </div>
        </section>

        <section className="console-panel rounded-[22px] border border-talisman-500/20 bg-ink-950/90 p-4 shadow-instrument">
          <div className="flex items-center justify-between border-b border-white/8 pb-3">
            <h2 className="text-lg font-semibold text-zinc-50">基本信息</h2>
            <span className="rounded-full border border-talisman-500/25 bg-talisman-500/10 px-2.5 py-1 text-[10px] text-talisman-500">详析</span>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">工具入口</dt><dd className="font-mono text-talisman-500">{tools.length}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">本地能力</dt><dd className="font-mono text-jade-500">{counts.local}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">演示边界</dt><dd className="font-mono text-cinnabar-500">{counts.demo}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">当前模块</dt><dd className="text-zinc-100">{selected.title}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">Manifest</dt><dd className="text-zinc-100">{legacyReady ? '已读取' : 'Fallback'}</dd></div>
          </dl>
          <div className="mt-5 rounded-[18px] border border-cinnabar-500/20 bg-cinnabar-500/8 p-3">
            <p className="text-xs font-semibold text-cinnabar-500">边界说明</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">六爻已接入本地京房八宫纳甲引擎；不同流派在纳甲地支顺逆与六神起例上可能存在口径差异。</p>
          </div>
        </section>
      </div>

      <section className="console-panel rounded-[22px] border border-talisman-500/20 bg-ink-950/90 p-4 shadow-instrument">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Primary Tools</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-50">常用排盘入口</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-zinc-500">{primaryTools.length} 个核心入口</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {primaryTools.map((tool, index) => {
            const modeLabel = getToolModeLabel(tool);
            const capability = getCapabilityForTool(tool);
            return (
              <article key={tool.id} className="tool-tile group relative overflow-hidden rounded-[20px] border border-white/8 bg-white/[0.035] p-4 transition hover:-translate-y-1 hover:border-talisman-500/30">
                <button type="button" onClick={() => isModuleId(tool.entryTab) && onSelectModule(tool.entryTab)} className="flex min-h-40 w-full flex-col text-left">
                  <span className="font-mono text-[11px] text-zinc-600">{String(index + 1).padStart(2, '0')}</span>
                  <span className="mt-3 text-lg font-semibold text-zinc-50">{tool.title}</span>
                  <span className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{tool.description}</span>
                  <span className="mt-auto w-fit rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] text-zinc-400">{modeLabel}</span>
                </button>
                <div className="mt-3 border-t border-white/8 pt-3">
                  <CopyContextButton label="Copy context" title={tool.title + ' 工具上下文'} payload={{ tool, capability, modeLabel, source: 'legacy ToolManifest + CapabilityRegistry' }} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4">
        {Object.entries(grouped).map(([group, groupTools]) => (
          <section key={group} className="console-panel rounded-[22px] border border-ink-700 bg-ink-950/82 p-4">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
              <h3 className="text-base font-semibold text-zinc-100">{group}</h3>
              <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-zinc-500">{groupTools.length} 个入口</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {groupTools.map((tool) => {
                const modeLabel = getToolModeLabel(tool);
                return (
                  <button key={tool.id} type="button" onClick={() => isModuleId(tool.entryTab) && onSelectModule(tool.entryTab)} className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/25 px-3 py-3 text-left transition hover:border-talisman-500/25 hover:bg-white/[0.04]">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-zinc-100">{tool.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-500">{tool.questionTypes.slice(0, 2).join(' / ')}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">{modeLabel}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
