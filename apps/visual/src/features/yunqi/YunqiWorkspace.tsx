import { useEffect, useMemo, useState } from 'react';
import { getSolarEntry } from '@/engine-api/calendar';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { ControlField } from '@/components/shared/ControlField';
import { YunqiChart } from '@/components/shared/YunqiChart';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { calcYunqiEnveloped, type YunqiData } from '@/engine-api/yunqi';
import type { ToolEnvelope } from '@/engine-api/types';
import { validateCalendarClaims, type CalendarPresentationClaim } from '@/legacy/claimVerification/calendarClaimVerifier';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { TermExplanationPanel } from '@/components/shared/TermExplanationPanel';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import {
  YEAR_INTENT_EVENT,
  normalizeCommandYear,
  readPendingCommandYear,
  type YearIntentDetail,
} from '@/lib/commandIntents';

const SAFE_ERROR_MESSAGE = '本次计算未能完成，请核对输入后重试。';

/** Dashboard 边界：失败信封绝不把引擎内部错误或任何结果数据带到用户界面。 */
export function sanitizeYunqiEnvelope(envelope: ToolEnvelope<YunqiData>): ToolEnvelope<YunqiData> {
  if (envelope.ok) return envelope;
  return {
    ok: false,
    tool: 'calc_yunqi',
    version: 'unknown',
    input_normalized: {},
    data: null as unknown as YunqiData,
    error: { code: 'calculation_failed', message: SAFE_ERROR_MESSAGE },
  };
}

function createYunqiFailureEnvelope(year: number): ToolEnvelope<YunqiData> {
  return sanitizeYunqiEnvelope({
    ok: false,
    tool: 'calc_yunqi',
    version: 'unknown',
    input_normalized: { year },
    data: {} as YunqiData,
    error: { code: 'calculation_exception', message: SAFE_ERROR_MESSAGE },
  });
}

/** 仅输出五运六气白名单事实；每条候选均独立与本次结果核验。 */
export function createYunqiFactChecks(data: YunqiData): StructuredFactCheck[] {
  const candidates: Array<{ claim: CalendarPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'calc_yunqi', kind: 'yunqiYear', field: 'year', value: data.year }, label: '年份', value: String(data.year) },
    { claim: { tool: 'calc_yunqi', kind: 'yunqiYear', field: 'tiangan', value: data.tiangan }, label: '天干', value: data.tiangan },
    { claim: { tool: 'calc_yunqi', kind: 'yunqiYear', field: 'dizhi', value: data.dizhi }, label: '地支', value: data.dizhi },
    { claim: { tool: 'calc_yunqi', kind: 'yunqiWuyun', field: 'dayun', value: data.wuyun.dayun }, label: '岁运', value: data.wuyun.dayun },
    { claim: { tool: 'calc_yunqi', kind: 'yunqiLiuqi', field: 'sitian', value: data.liuqi.sitian }, label: '司天', value: data.liuqi.sitian },
  ];
  return candidates.map(({ claim, label, value }) => ({
    fact: { label, value: String(value), tool: 'calc_yunqi' },
    validation: validateCalendarClaims('yunqi', data, [claim]),
  }));
}

export function YunqiWorkspace() {
  const [year, setYear] = useState(() => readPendingCommandYear('yunqi'));
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

  const envelope = useMemo(() => {
    try {
      return sanitizeYunqiEnvelope(calcYunqiEnveloped({
        year,
        solar: getSolarEntry(),
        currentMonth: new Date().getMonth() + 1,
      }));
    } catch {
      return createYunqiFailureEnvelope(year);
    }
  }, [year]);
  const data = envelope.ok ? envelope.data : null;
  const factChecks = useMemo(
    () => data ? createYunqiFactChecks(data) : [],
    [data],
  );
  const presentation = useMemo(() => toUserPresentation(envelope, {
    factChecks,
    disclaimers: ['五运六气输出仅作传统文化和气候病机理论学习参考，不替代医学诊断。'],
  }), [envelope, factChecks]);
  const exportPresentation = useMemo(() => presentation.exportReport ? ({
    report: presentation.exportReport,
    notices: presentation.notices,
    warnings: presentation.warnings,
    semanticReport: presentation.semanticReport,
  }) : null, [presentation]);
  const contextPayload = useMemo(
    () => ({
      项目: '五运六气',
      年份: year,
      解读: data,
      提示: '传统文化参考，不替代医疗诊断或治疗建议。',
    }),
    [year, data],
  );

  if (presentation.state === 'error') {
    return (
      <section className="space-y-4">
        <InterpretationCard title="计算未完成" subtitle="请核对输入">
          <p className="text-sm text-jade-100/55">{presentation.error?.message}</p>
        </InterpretationCard>
      </section>
    );
  }

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
            <CopyContextButton commandScope="yunqi" title="五运六气摘要" payload={contextPayload} />
            {exportPresentation && <ExportReportButton module="五运六气" presentation={exportPresentation} />}
          </div>
        </div>
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
              <p className="mt-2 text-sm text-jade-100/45">正在生成结果…</p>
            )}
          </div>

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
            五运六气输出仅作传统文化和气候病机理论学习参考，不替代医学诊断。
          </p>
        </aside>

        <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-jade-50">岁运 · 司天 · 在泉</h3>
              <p className="mt-1 text-sm leading-6 text-jade-100/55">
                岁运·司天·在泉·客气六步·病势倾向·五行图例综合展示。
              </p>
            </div>
          </div>
          <div className="canvas-stage overflow-x-auto rounded-card border border-jade-500/18 bg-ink-950/92 p-3">
            {data && (
              <ZoomableSvg title="岁运 · 司天 · 在泉">
                <YunqiChart data={data} />
              </ZoomableSvg>
            )}
          </div>
        </section>
      </div>

      {data && (
        <TermExplanationPanel
          ready
          initialTerm="岁运"
          terms={["岁运","司天","在泉","客气","主气","六气","客主加临","厥阴风木","少阴君火","少阳相火","太阴湿土","阳明燥金","太阳寒水","初之气","二之气","三之气","四之气","五之气","六之气","大寒","节气","太过","不及"]}
          description="点击术语查看五运六气通俗解释。"
        />
      )}
      {presentation.report && (
        <div className="console-panel mt-4 rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <FourLayerReport
            report={presentation.report}
            semanticReport={presentation.semanticReport}
            notices={presentation.notices}
            warnings={presentation.warnings}
            title="五运六气解读"
          />
        </div>
      )}
    </section>
  );
}
