import { useEffect, useMemo, useState } from 'react';
import { CanvasPanel } from '@/components/shared/CanvasPanel';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { FiveElementsChart } from '@/components/shared/FiveElementsChart';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { renderDataWithLegacyAdapter, calculateWithLegacyAdapter } from '@/legacy/engineAdapters';
import { renderLegacyBazi, type BaziPillars, type WuxingStats } from '@/legacy/canvasRenderers';
import type { BirthData } from '@/legacy/birthBridge';
import type { LegacyState } from '@/legacy/legacyGlobals';
import { useBirth } from '@/lib/birthContext';

const DEFAULT_PILLARS: BaziPillars = {
  year: { stem: '甲', branch: '辰' },
  month: { stem: '丙', branch: '寅' },
  day: { stem: '戊', branch: '午' },
  hour: { stem: '庚', branch: '申' },
  dayMaster: '戊',
  gender: '男',
};

const DEFAULT_WUXING: WuxingStats = { 木: 2, 火: 3, 土: 1, 金: 0, 水: 2 };
const WUXING_COLORS: Record<keyof WuxingStats, string> = {
  木: '#2c9f84',
  火: '#c6301f',
  土: '#c9b27a',
  金: '#e9e4d8',
  水: '#2f4f55',
};

interface BaziResult {
  pillars?: unknown;
  elements?: Partial<WuxingStats>;
  dayMaster?: string;
  dayMasterWuxing?: string;
  engineName?: string;
  mode?: string;
  confidenceNote?: string;
}

function calculateBazi(birth: BirthData, ready: boolean) {
  if (!ready) {
    return { result: null, pillars: { ...DEFAULT_PILLARS, gender: birth.gender }, wuxing: DEFAULT_WUXING };
  }
  const result = calculateWithLegacyAdapter<BirthData, BaziResult>('bazi', birth);
  const renderData = result ? renderDataWithLegacyAdapter<BirthData, BaziResult, BaziPillars>('bazi', result, birth) : null;
  return {
    result,
    pillars: renderData ?? { ...DEFAULT_PILLARS, gender: birth.gender },
    wuxing: { ...DEFAULT_WUXING, ...(result?.elements ?? {}) },
  };
}

function birthSummary(birth: BirthData) {
  return birth.year + '-' + String(birth.month).padStart(2, '0') + '-' + String(birth.day).padStart(2, '0') + ' ' + String(birth.hour).padStart(2, '0') + ':00';
}

export function BaziWorkspace() {
  const { birth } = useBirth();
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });

  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (mounted) setLegacyState(state);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const ready = legacyState.mode === 'ready';
  const { result, pillars, wuxing } = useMemo(() => calculateBazi(birth, ready), [birth, ready]);
  const pillarRows = [
    ['年柱', pillars.year],
    ['月柱', pillars.month],
    ['日柱', pillars.day],
    ['时柱', pillars.hour],
  ] as const;
  const maxWuxing = Math.max(1, ...Object.values(wuxing));
  const contextPayload = useMemo(
    () => ({
      module: 'bazi',
      mode: result?.mode ?? 'fallback-demo',
      engineName: result?.engineName ?? '等待旧引擎',
      birth,
      pillars,
      wuxing,
      source: 'visual/js/engine-adapters.js + visual/js/bazi.js',
    }),
    [birth, pillars, result, wuxing],
  );

  return (
    <section className="space-y-5">
      <div className="console-panel rounded-[22px] border border-jade-500/20 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-400">Bazi Plate</p>
            <h2 className="mt-1 text-2xl font-semibold text-jade-50">八字排盘工作台</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              读取顶部全局生辰，调用 BaziEngine / lunar-javascript Adapter 生成四柱与五行，再复用旧 Canvas renderer。
            </p>
          </div>
          <CopyContextButton commandScope="bazi" title="八字命盘 React 迁移上下文" payload={contextPayload} />
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-[16px] border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      <div className="bazi-console-grid grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <InterpretationCard
            title="排盘信息"
            badge={ready ? '已接入' : '加载中'}
            items={[
              { label: '生辰', value: birthSummary(birth) },
              { label: '历法', value: (birth.isLunar ? '农历' : '公历') + ' · ' + (birth.useExactCalendar ? '精确' : '近似') },
              { label: '性别', value: birth.gender },
              { label: '引擎', value: result?.engineName ?? '等待旧引擎' },
              { label: '模式', value: result?.mode ?? '降级展示' },
            ]}
          />
          <InterpretationCard
            title="推算边界"
            items={[
              { label: '日主', value: (result?.dayMaster ?? pillars.dayMaster ?? '?') + ' · ' + (result?.dayMasterWuxing ?? '?') },
              { label: '说明', value: result?.confidenceNote ?? '顶部“全局生辰”面板是所有工作区的唯一输入源。' },
            ]}
          />
        </aside>

        <div className="space-y-4">
          <CanvasPanel
            title="四柱主盘"
            description="统一 Adapter 计算后调用同一个 bazi renderer，避免 React 页与旧页口径分叉。"
            data={pillars}
            width={600}
            height={480}
            ready={ready}
            render={renderLegacyBazi}
          />
          <div className="console-panel rounded-[22px] border border-jade-500/20 bg-ink-950/90 p-4">
            <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="text-lg font-semibold text-jade-50">八字明细</h3>
              <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] text-jade-100/45">四柱</span>
            </div>
            <div className="grid grid-cols-4 overflow-hidden rounded-[18px] border border-white/10 text-center text-sm">
              {pillarRows.map(([label]) => (
                <div key={label} className="border-b border-white/10 bg-white/[0.035] px-2 py-2 text-xs text-jade-100/45">{label}</div>
              ))}
              {pillarRows.map(([label, pillar]) => (
                <div key={label + 'stem'} className="border-b border-white/10 px-2 py-4 font-serif text-3xl text-jade-400">{pillar.stem}</div>
              ))}
              {pillarRows.map(([label, pillar]) => (
                <div key={label + 'branch'} className="px-2 py-4 font-serif text-3xl text-jade-100">{pillar.branch}</div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="console-panel rounded-[22px] border border-jade-500/20 bg-ink-950/90 p-4 shadow-instrument">
            <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="text-lg font-semibold text-jade-50">五行能量</h3>
              <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2.5 py-1 text-[10px] text-jade-400">统计</span>
            </div>
            <div className="space-y-3">
              {(Object.keys(wuxing) as Array<keyof WuxingStats>).map((key) => {
                const value = wuxing[key];
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-jade-100/70">{key}</span>
                      <span className="font-mono text-jade-100/35">{value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full" style={{ width: Math.max(8, (value / maxWuxing) * 100) + '%', backgroundColor: WUXING_COLORS[key] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-jade-50">五行平衡</h3>
                <p className="mt-1 text-sm leading-6 text-jade-100/55">
                  五行相生相克图，统计来自同一次八字计算（Phase 10 SVG 替换）。
                </p>
              </div>
              <span className="w-fit rounded-full border border-jade-500/25 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">
                SVG · Phase 10
              </span>
            </div>
            <div className="canvas-stage overflow-x-auto rounded-[20px] border border-jade-500/18 bg-ink-950/92 p-3">
              {ready ? (
                <FiveElementsChart stats={wuxing} />
              ) : (
                <p className="py-12 text-center text-sm text-jade-100/45">正在加载八字引擎。</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
