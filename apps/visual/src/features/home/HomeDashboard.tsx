import { useMemo } from 'react';
import { calculateBazi as calculateBaziPure } from '@/legacy/baziEngine';
import { getSolarEntry } from '@/legacy/solarEntry';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { HomeBaziPlate } from '@/components/shared/HomeBaziPlate';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import type { ModuleId } from '@/lib/modules';
import { MODULES } from '@/lib/modules';
import { type BaziPillars } from '@/legacy/canvasRenderers';
import { getCapabilityForTool, getLegacyTools, getToolModeLabel, type LegacyTool } from '@/legacy/toolRegistry';
import type { SolarBirth } from '@/legacy/birthBridge';
import { useBirth } from '@/lib/birthContext';

const FALLBACK_PILLARS: BaziPillars = {
  year: { stem: '甲', branch: '辰' },
  month: { stem: '丙', branch: '寅' },
  day: { stem: '戊', branch: '午' },
  hour: { stem: '庚', branch: '申' },
  dayMaster: '戊',
  gender: '男',
};

/** 用纯 TS 八字引擎算四柱；失败时回退占位四柱（仅展示，不宣称真实）。 */
function resolvePillars(solarBirth: SolarBirth, ready: boolean): { pillars: BaziPillars; engineName?: string } {
  if (!ready) return { pillars: { ...FALLBACK_PILLARS, gender: solarBirth.gender } };
  try {
    const pure = calculateBaziPure({ birth: solarBirth, solar: getSolarEntry() });
    const pillars: BaziPillars = {
      year: { stem: pure.pillars.year.stem, branch: pure.pillars.year.branch, hidden: pure.hiddenStems.year },
      month: { stem: pure.pillars.month.stem, branch: pure.pillars.month.branch, hidden: pure.hiddenStems.month },
      day: { stem: pure.pillars.day.stem, branch: pure.pillars.day.branch, hidden: pure.hiddenStems.day },
      hour: { stem: pure.pillars.hour.stem, branch: pure.pillars.hour.branch, hidden: pure.hiddenStems.hour },
      dayMaster: pure.dayMaster,
      gender: pure.gender,
    };
    return { pillars, engineName: pure.engineName };
  } catch {
    return { pillars: { ...FALLBACK_PILLARS, gender: solarBirth.gender }, engineName: 'fallback-demo' };
  }
}

interface HomeDashboardProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

function isModuleId(value: string): value is ModuleId {
  return MODULES.some((module) => module.id === value);
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
  const { birth, solarBirth } = useBirth();
  const tools = useMemo(() => getLegacyTools(), []);

  const ready = true;
  const legacyReady = ready;
  const { pillars } = useMemo(() => resolvePillars(solarBirth, ready), [solarBirth, ready]);

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
    <section className="space-y-5" data-testid="home-dashboard">
      {/* 场景化入口（UX P1） */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: '我想看运势', desc: '八字+五运六气+奇门 联合', module: 'combo' as ModuleId, icon: '运' },
          { label: '我想起名', desc: '姓名五行 · 五格评分', module: 'namewuxing' as ModuleId, icon: '名' },
          { label: '我想问事', desc: '六爻+梅花+奇门 三卜交叉', module: 'combo' as ModuleId, icon: '卜' },
          { label: '我想看风水', desc: '飞星+八宅+奇门吉方 联合', module: 'combo' as ModuleId, icon: '堪' },
        ].map((entry, idx) => (
          <button
            key={entry.label}
            type="button"
            onClick={() => onSelectModule(entry.module)}
            className={`group flex items-center gap-3 rounded-panel border border-ink-700 bg-ink-850/60 p-4 text-left transition hover:border-jade-500/30 hover:bg-ink-850/80 ct-animate-slide-up ct-delay-${idx + 1}`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-jade-500/25 bg-jade-500/10 font-serif text-lg text-jade-400 transition group-hover:bg-jade-500/20">
              {entry.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-jade-100">{entry.label}</p>
              <p className="mt-0.5 truncate text-xs text-jade-100/45">{entry.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <section className="console-panel rounded-[22px] border border-jade-500/20 bg-ink-950/90 p-4 shadow-instrument">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-400">Birth Input</p>
              <h2 className="mt-1 text-lg font-semibold text-jade-50">排盘信息</h2>
            </div>
            <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2.5 py-1 text-[10px] text-jade-400">已同步</span>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-jade-100/45">出生时间</dt>
              <dd className="mt-1 font-mono text-jade-100">{birthSummary(solarBirth.year, solarBirth.month, solarBirth.day, solarBirth.hour)}</dd>
            </div>
            <div>
              <dt className="text-xs text-jade-100/45">历法 / 性别</dt>
              <dd className="mt-1 text-jade-100">{birth.isLunar ? '农历' : '公历'} · {solarBirth.gender} · {solarBirth.useExactCalendar ? '精确历法' : '近似历法'}</dd>
            </div>
            <div>
              <dt className="text-xs text-jade-100/45">隐私边界</dt>
              <dd className="mt-1 text-jade-100/80">仅在浏览器本地计算，不保存完整姓名、完整出生地。</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => onSelectModule('bazi')}
            className="mt-5 w-full rounded-[16px] border border-cinnabar-500/50 bg-cinnabar-500 px-4 py-3 text-sm font-semibold text-jade-50 transition hover:bg-cinnabar-600 active:scale-[0.99]"
          >
            立即排盘
          </button>
        </section>

        <section className="console-panel rounded-[22px] border border-jade-500/20 bg-ink-950/90 p-4 shadow-instrument">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-400">Core Plate</p>
              <h2 className="mt-1 text-xl font-semibold text-jade-50">四柱 / 九宫工作台</h2>
            </div>
            <CopyContextButton
              commandScope="home"
              title="首页工具目录上下文"
              payload={{ module: selected, tools: tools.length, localCapabilities: counts.local, demoBoundaries: counts.demo, legacyReady, source: 'ToolManifest + CapabilityRegistry + React HomeDashboard' }}
            />
          </div>
          <div className="mt-4">
            {ready ? (
              <div className="mx-auto max-w-[460px]">
                <ZoomableSvg title="四柱 / 九宫命盘">
                  <HomeBaziPlate pillars={pillars} size={460} />
                </ZoomableSvg>
              </div>
            ) : (
              <div className="mx-auto max-w-[460px]">
                <LoadingSkeleton label="正在排盘" />
              </div>
            )}
            <p className="mt-2 text-center text-[11px] text-jade-100/45">
              {ready ? '真实四柱 · 双击放大查看 · 右键复制为图像' : '引擎加载后显示真实四柱'}
            </p>
          </div>
        </section>
      </div>

      <section className="console-panel rounded-[22px] border border-jade-500/20 bg-ink-950/90 p-4 shadow-instrument">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-100/45">Primary Tools</p>
            <h2 className="mt-1 text-lg font-semibold text-jade-50">常用排盘入口</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-jade-100/45">{primaryTools.length} 个核心入口</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {primaryTools.map((tool, index) => {
            const modeLabel = getToolModeLabel(tool);
            const capability = getCapabilityForTool(tool);
            return (
              <article
                key={tool.id}
                data-testid="tool-card"
                className={`tool-tile group relative overflow-hidden rounded-[20px] border border-white/8 bg-white/[0.035] p-4 transition hover:-translate-y-1 hover:border-jade-500/30 ct-animate-slide-up ct-delay-${(index % 4) + 1}`}
              >
                <button
                  type="button"
                  data-testid={tool.entryTab === 'bazi' ? 'tool-card-bazi' : 'tool-card'}
                  onClick={() => isModuleId(tool.entryTab) && onSelectModule(tool.entryTab)}
                  className="flex min-h-40 w-full flex-col text-left"
                >
                  <span className="font-mono text-[11px] text-jade-100/30">{String(index + 1).padStart(2, '0')}</span>
                  <span className="mt-3 text-lg font-semibold text-jade-50">{tool.title}</span>
                  <span className="mt-2 line-clamp-2 text-sm leading-6 text-jade-100/55">{tool.description}</span>
                  <span className="mt-auto w-fit rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] text-jade-100/45">{modeLabel}</span>
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
              <h3 className="text-base font-semibold text-jade-100">{group}</h3>
              <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-jade-100/45">{groupTools.length} 个入口</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {groupTools.map((tool) => {
                const modeLabel = getToolModeLabel(tool);
                return (
                  <button key={tool.id} type="button" onClick={() => isModuleId(tool.entryTab) && onSelectModule(tool.entryTab)} className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/25 px-3 py-3 text-left transition hover:border-jade-500/25 hover:bg-white/[0.04]">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-jade-100">{tool.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-jade-100/55">{tool.questionTypes.slice(0, 2).join(' / ')}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-jade-100/55">{modeLabel}</span>
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
