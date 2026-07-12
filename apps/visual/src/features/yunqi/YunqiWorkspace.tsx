import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { ControlField } from '@/components/shared/ControlField';
import { YunqiChart } from '@/components/shared/YunqiChart';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { calculateLegacyYunqi, type YunqiData } from '@/legacy/canvasRenderers';
import { calcYunqiEnveloped } from '@/legacy/yunqiEngine';
import { toFourLayer, type LayerReport, type ReadingLike } from '@/legacy/reportLayers';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { TermExplanationPanel } from '@/components/shared/TermExplanationPanel';
import type { LegacyState } from '@/legacy/legacyGlobals';
import {
  YEAR_INTENT_EVENT,
  normalizeCommandYear,
  readPendingCommandYear,
  type YearIntentDetail,
} from '@/lib/commandIntents';

export function YunqiWorkspace() {
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [year, setYear] = useState(() => readPendingCommandYear('yunqi'));
  const [data, setData] = useState<YunqiData | null>(null);

  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (!mounted) return;
      setLegacyState(state);
      if (state.mode === 'ready') {
        setData(calculateLegacyYunqi(year));
      }
    });
    return () => {
      mounted = false;
    };
  }, [year]);

  useEffect(() => {
    if (legacyState.mode !== 'ready') return;
    setData(calculateLegacyYunqi(year));
  }, [legacyState.mode, year]);

  useEffect(() => {
    function handleYearIntent(event: Event) {
      const detail = (event as CustomEvent<YearIntentDetail>).detail;
      if (detail?.target === 'yunqi') {
        setYear(normalizeCommandYear(detail.year));
      }
    }
    window.addEventListener(YEAR_INTENT_EVENT, handleYearIntent);
    return () => window.removeEventListener(YEAR_INTENT_EVENT, handleYearIntent);
  }, []);

  const ready = legacyState.mode === 'ready' && !!data;
  const fourLayer = useMemo<LayerReport | null>(() => {
    if (!year) return null;
    try {
      const solarEntry = typeof window !== 'undefined' ? (window as unknown as { Solar?: unknown }).Solar : undefined;
      const env = calcYunqiEnveloped({ year, solar: solarEntry ?? null, currentMonth: new Date().getMonth() + 1 });
      return toFourLayer(env.data.export_snapshot as ReadingLike);
    } catch {
      return null;
    }
  }, [year]);
  const contextPayload = useMemo(
    () => ({
      module: 'yunqi',
      mode: 'legacy-engine-and-canvas-react-shell',
      year,
      data,
      source: 'visual/js/engines/yunqi-engine.js + visual/js/health.js',
      medicalBoundary: '文化参考，不替代医疗诊断或治疗建议。',
    }),
    [year, data],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">五运六气</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              按大寒定年推算岁运、司天在泉与客气六步，结合客主加临看气候与疾病倾向。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="yunqi" title="五运六气 React 迁移上下文" payload={contextPayload} />
            <ExportReportButton module="五运六气" />
          </div>
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧加载失败：{legacyState.error}
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

          <div className="rounded-card border border-white/8 bg-white/[0.035] p-4">
            <p className="text-sm font-semibold text-jade-100">当前推算</p>
            {data ? (
              <dl className="mt-3 space-y-2 text-sm text-jade-100/55">
                <div className="flex justify-between gap-3"><dt>干支</dt><dd className="text-jade-100">{data.tiangan}{data.dizhi}</dd></div>
                <div className="flex justify-between gap-3"><dt>岁运</dt><dd className="text-jade-100">{data.wuyun.dayun}</dd></div>
                <div className="flex justify-between gap-3"><dt>司天</dt><dd className="text-jade-100">{data.liuqi.sitian}</dd></div>
                <div className="flex justify-between gap-3"><dt>在泉</dt><dd className="text-jade-100">{data.liuqi.zaiquan}</dd></div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-jade-100/45">等待旧引擎加载。</p>
            )}
          </div>

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
            五运六气输出仅作传统文化和气候病机理论学习参考，不替代医学诊断。
          </p>
        </aside>

        <section className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-jade-50">岁运 · 司天 · 在泉</h3>
              <p className="mt-1 text-sm leading-6 text-jade-100/55">
                岁运·司天·在泉·客气六步·病势倾向·五行图例综合展示。
              </p>
            </div>
          </div>
          <div className="canvas-stage overflow-x-auto rounded-[20px] border border-jade-500/18 bg-ink-950/92 p-3">
            {ready && data ? (
              <ZoomableSvg title="岁运 · 司天 · 在泉">
                <YunqiChart data={data} />
              </ZoomableSvg>
            ) : (
              <LoadingSkeleton label="正在排盘" />
            )}
          </div>
        </section>
      </div>

      {ready && (
        <TermExplanationPanel
          ready={ready}
          initialTerm="岁运"
          terms={["岁运","司天","在泉","客气","主气","六气","客主加临","厥阴风木","少阴君火","少阳相火","太阴湿土","阳明燥金","太阳寒水","初之气","二之气","三之气","四之气","五之气","六之气","大寒","节气","太过","不及"]}
          description="点击术语查看五运六气通俗解释。"
        />
      )}
      {fourLayer && (
        <div className="console-panel mt-4 rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <FourLayerReport report={fourLayer} title="四层报告（总结·亮点·详析·建议）" />
        </div>
      )}
    </section>
  );
}
