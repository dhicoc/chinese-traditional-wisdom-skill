import { useMemo } from 'react';
import { getSolarEntry } from '@/legacy/solarEntry';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { HuangjiGuaCircle } from '@/components/shared/HuangjiGuaCircle';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { useBirth } from '@/lib/birthContext';
import { calcHuangjiEnveloped, type HuangjiData } from '@/legacy/huangjiEngine';
import { toFourLayer, type LayerReport, type ReadingLike } from '@/legacy/reportLayers';
import type { ToolEnvelope } from '@/legacy/baseTypes';

/**
 * 皇极经世工作区。
 * 元会运世周期定位 + 九卦配置（正/运/世/旬/年/月/日/时/分卦）+ 动爻 + 四层报告。
 * 文字卡片呈现，长期宏观推演视角。
 */

/** 九卦展示配置 */
const NINE_GUA: Array<{ key: keyof HuangjiData['gua']; label: string; hint: string }> = [
  { key: 'zheng', label: '正卦', hint: '主一运（360年）大势' },
  { key: 'yun', label: '运卦', hint: '一运之内流变' },
  { key: 'shi', label: '世卦', hint: '主一世（30年）气数' },
  { key: 'xun', label: '旬卦', hint: '应十年一旬之机' },
  { key: 'year', label: '年卦', hint: '本年具体应象' },
  { key: 'month', label: '月卦', hint: '当月卦象' },
  { key: 'day', label: '日卦', hint: '当日卦象' },
  { key: 'hour', label: '时卦', hint: '当时卦象' },
  { key: 'minute', label: '分卦', hint: '分刻卦象' },
];

export function HuangjiWorkspace() {
  const { solarBirth } = useBirth();

  const result = useMemo<{ envelope: ToolEnvelope<HuangjiData> | null; loading: boolean }>(() => {
    try {
      const solarEntry = getSolarEntry();
      const env = calcHuangjiEnveloped({ birth: solarBirth, solar: solarEntry ?? null });
      return { envelope: env, loading: false };
    } catch {
      return { envelope: null, loading: false };
    }
  }, [solarBirth]);

  const fourLayer = useMemo<LayerReport | null>(() => {
    if (!result.envelope) return null;
    return toFourLayer(result.envelope.data.export_snapshot as ReadingLike);
  }, [result.envelope]);

  const data = result.envelope?.data;

  if (!data) {
    return (
      <section className="space-y-4">
        <InterpretationCard title="暂无结果" subtitle="请确认生辰">
          <p className="text-sm text-jade-100/55">皇极经世需完整生辰信息，请在顶部「全局生辰」面板填写。</p>
        </InterpretationCard>
      </section>
    );
  }

  const birthSummary = `${solarBirth.year}-${String(solarBirth.month).padStart(2, '0')}-${String(solarBirth.day).padStart(2, '0')} ${String(solarBirth.hour).padStart(2, '0')}:${String(solarBirth.minute ?? 0).padStart(2, '0')}`;
  const { cycles, ganZhi, gua, movingLines } = data;

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="console-panel rounded-panel border border-[rgb(var(--earth)/0.16)] bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">皇极经世</h2>
            <p className="text-sm text-jade-100/55">邵雍元会运世 · 宇宙周期定位 · 九卦配置</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[rgb(var(--earth)/0.30)] bg-[rgb(var(--earth)/0.10)] px-3 py-1 text-xs text-[var(--c-gold)]">长期宏观</span>
            <ExportReportButton module="皇极经世" />
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-jade-100/45">
          以「元会运世」宇宙周期（1元=129600年=12会×30运×12世×30年）定位当下时空。正卦主一运大势，世卦主当下三十年气数，年卦主本年应象。属传统象数参考。
        </p>
      </div>

      {/* 起盘信息 + 周期定位 */}
      <InterpretationCard
        title="起盘信息"
        subtitle={`${birthSummary} · ${data.mode === 'local-exact' ? '真实历法' : '近似历法'}`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-card border border-white/8 bg-white/[0.02] px-3 py-2">
            <span className="text-xs text-jade-100/45">干支</span>
            <p className="mt-1 text-sm text-jade-100/80">年{ganZhi.year} · 月{ganZhi.month}</p>
            <p className="text-sm text-jade-100/80">日{ganZhi.day} · 时{ganZhi.hour}</p>
          </div>
          <div className="rounded-card border border-[rgb(var(--earth)/0.20)] bg-[rgb(var(--earth)/0.05)] px-3 py-2">
            <span className="text-xs text-[rgb(var(--gold)/0.70)]">积年</span>
            <p className="mt-1 text-sm font-semibold text-[var(--c-gold)]">{cycles.acumYear}年</p>
          </div>
          <div className="rounded-card border border-[rgb(var(--earth)/0.20)] bg-[rgb(var(--earth)/0.05)] px-3 py-2">
            <span className="text-xs text-[rgb(var(--gold)/0.70)]">会 / 运 / 世</span>
            <p className="mt-1 text-sm font-semibold text-[var(--c-gold)]">第{cycles.hui}会 · 第{cycles.yun}运 · 第{cycles.shi}世</p>
          </div>
          <div className="rounded-card border border-white/8 bg-white/[0.02] px-3 py-2">
            <span className="text-xs text-jade-100/45">动爻</span>
            <p className="mt-1 text-xs text-jade-100/70">运{movingLines.yun}爻 · 世{movingLines.shi}爻 · 旬{movingLines.xun}爻</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-jade-100/55">{data.cyclePosition}</p>
      </InterpretationCard>

      {/* 九卦配置 */}
      <InterpretationCard
        title="九卦配置"
        subtitle="正卦为主，世卦为当下，年卦为本年"
      >
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-3">
          {NINE_GUA.map(({ key, label, hint }) => {
            const g = gua[key];
            const isMain = key === 'zheng' || key === 'shi' || key === 'year';
            return (
              <div
                key={key}
                className={`rounded-card border px-3 py-2 ${
                  isMain ? 'border-[rgb(var(--earth)/0.30)] bg-[rgb(var(--earth)/0.08)]' : 'border-white/8 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium ${isMain ? 'text-[var(--c-gold)]' : 'text-jade-100/70'}`}>{label}</span>
                  <span className="text-[10px] text-jade-100/35">{hint}</span>
                </div>
                <p className={`mt-1 font-serif text-base ${isMain ? 'text-[var(--wz-earth)]' : 'text-jade-100/85'}`}>{g}</p>
              </div>
            );
          })}
        </div>
      </InterpretationCard>

      {/* 先天六十四卦圆图 */}
      <InterpretationCard
        title="先天六十四卦圆图"
        subtitle="正卦·世卦·年卦 当前时空定位（点击卦位查看）"
      >
        <ZoomableSvg title="皇极经世先天六十四卦圆图" className="mx-auto block w-full max-w-[560px]">
          <HuangjiGuaCircle
            zhengGua={gua.zheng}
            shiGua={gua.shi}
            yearGua={gua.year}
            hui={cycles.hui}
            yun={cycles.yun}
            shi={cycles.shi}
            acumYear={cycles.acumYear}
          />
        </ZoomableSvg>
        <p className="mt-2 text-[11px] leading-5 text-jade-100/45">
          邵雍先天六十四卦圆图，64卦爻象围成一圈（乾起正上方）。金色环为正卦（主一运大势），玉色环为世卦（主当下三十年气数），朱砂环为年卦（本年应象）。鼠标悬停任一卦位显示卦名，点击在中心查看详情。
        </p>
      </InterpretationCard>

      {/* 趋势解读 */}
      <InterpretationCard title="趋势解读" subtitle="皇极经世视角">
        <p className="text-sm leading-6 text-jade-100/70">{data.interpretation}</p>
      </InterpretationCard>

      {/* 四层报告 */}
      <div className="console-panel rounded-panel border border-[rgb(var(--earth)/0.16)] bg-ink-950/90 p-4 shadow-instrument">
        <FourLayerReport report={fourLayer!} title="皇极经世 · 四层报告" />
      </div>

      {/* 复制上下文 */}
      <div className="flex justify-end">
        <CopyContextButton
          commandScope="huangji"
          title="皇极经世上下文"
          payload={{
            module: '皇极经世',
            birth: { year: solarBirth.year, month: solarBirth.month, day: solarBirth.day, hour: solarBirth.hour, gender: solarBirth.gender },
            solarDate: data.solarDate,
            ganZhi,
            cycles,
            gua,
            movingLines,
            cyclePosition: data.cyclePosition,
            interpretation: data.interpretation,
          }}
        />
      </div>
    </div>
  );
}
