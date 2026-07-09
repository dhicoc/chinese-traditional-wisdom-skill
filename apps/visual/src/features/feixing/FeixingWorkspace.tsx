import { useEffect, useMemo, useState } from 'react';
import { ControlField } from '@/components/shared/ControlField';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { LegendPanel, type LegendItem } from '@/components/shared/LegendPanel';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { KnowledgeReferencePanel } from '@/components/shared/KnowledgeReferencePanel';
import { NinePalaceGrid } from '@/components/shared/NinePalaceGrid';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import {
  getFeixingGrid,
  getFeixingSummary,
} from '@/legacy/canvasRenderers';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { DataModeBadge } from '@/components/shared/DataModeBadge';
import type { LegacyState } from '@/legacy/legacyGlobals';
import {
  YEAR_INTENT_EVENT,
  normalizeCommandYear,
  readPendingCommandYear,
  type YearIntentDetail,
} from '@/lib/commandIntents';

export function FeixingWorkspace() {
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [year, setYear] = useState(() => readPendingCommandYear('feixing'));

  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (mounted) setLegacyState(state);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleYearIntent(event: Event) {
      const detail = (event as CustomEvent<YearIntentDetail>).detail;
      if (detail?.target === 'feixing') {
        setYear(normalizeCommandYear(detail.year));
      }
    }
    window.addEventListener(YEAR_INTENT_EVENT, handleYearIntent);
    return () => window.removeEventListener(YEAR_INTENT_EVENT, handleYearIntent);
  }, []);

  const ready = legacyState.mode === 'ready';
  const summary = useMemo(() => (ready ? getFeixingSummary(year) : null), [ready, year]);
  const grid = useMemo(() => (ready ? getFeixingGrid(year) : null), [ready, year]);
  const starLegend = useMemo<LegendItem[]>(
    () => [
      { label: '一白 / 水', color: '#264653', description: '偏向流动、信息与文昌语义。' },
      { label: '三碧四绿 / 木', color: '#2a9d8f', description: '偏向生发、变动与学习语义。' },
      { label: '二黑五黄八白 / 土', color: '#e9c46a', description: '偏向中宫、稳定与病符风险提示。' },
      { label: '六白七赤 / 金', color: '#e5e5e5', description: '偏向秩序、权柄与肃杀语义。' },
      { label: '九紫 / 火', color: '#e76f51', description: '偏向喜庆、显化与未来运语义。' },
    ],
    [],
  );

  const contextPayload = useMemo(
    () => ({
      module: 'feixing',
      mode: 'legacy-canvas-react-shell',
      year,
      centerStar: summary ?? null,
      source: 'visual/js/fengshui.js (renderFlyingStars) + visual/js/core.js',
    }),
    [year, summary],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">流年飞星</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              输入年份，查看流年九宫飞星分布与中宫星摘要。
            </p>
          </div>
          <CopyContextButton commandScope="feixing" title="流年飞星 React 迁移上下文" payload={contextPayload} />
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <ControlField
            label="年份"
            hint="1900-2100"
            type="number"
            min={1900}
            max={2100}
            inputMode="numeric"
            value={year}
            onChange={(event) => setYear(normalizeCommandYear(event.target.value))}
          />

          <InterpretationCard
            title="中宫飞星"
            badge="React 解读卡"
            subtitle="中宫飞星与方位吉凶参考。"
            items={summary ? [
              { label: '星号', value: summary.centerStar },
              { label: '星名', value: summary.starName },
              { label: '五行', value: summary.wuxing },
              { label: '吉凶', value: summary.luck },
            ] : []}
          >
            {!summary && <span className="text-jade-100/45">等待旧引擎加载。</span>}
          </InterpretationCard>

          <LegendPanel
            title="九星五行图例"
            description="九星五行配色与方位吉凶参考。"
            items={starLegend}
          />

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
            飞星布局仅作传统文化学习与方位参考，不构成风水操作或决策建议。
          </p>

          <KnowledgeReferencePanel
            initialTerm={summary?.starName ?? "五黄"}
            terms={Array.from(new Set([summary?.starName ?? "廉贞", "一白", "二黑", "五黄", "九紫", "病符", "文昌"]))}
            description="点击中宫星、九星名或飞星术语，查看流年飞星映射与古籍索引线索。"
          />
        </aside>

        <section className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-jade-50">九宫飞星图</h3>
              <p className="mt-1 text-sm leading-6 text-jade-100/55">
                九宫飞星图：3×3 洛书九宫，每格宫位名+飞星编号星名，中心格高亮。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-fit rounded-full border border-jade-500/25 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">
              </span>
              <DataModeBadge mode="local-approx" ready={ready} />
            </div>
          </div>
          <div className="canvas-stage overflow-x-auto rounded-[20px] border border-jade-500/18 bg-ink-950/92 p-3">
            {grid ? (
              <ZoomableSvg title="九宫飞星图">
                <NinePalaceGrid grid={grid} year={year} />
              </ZoomableSvg>
            ) : (
              <LoadingSkeleton label="正在加载飞星引擎" />
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
