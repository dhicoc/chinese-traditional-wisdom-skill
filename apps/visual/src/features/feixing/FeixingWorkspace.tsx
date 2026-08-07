import { useEffect, useMemo, useState } from 'react';
import { calcMingGua } from '@/legacy/bazhaiHouse';
import { ControlField } from '@/components/shared/ControlField';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { LegendPanel, type LegendItem } from '@/components/shared/LegendPanel';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { KnowledgeReferencePanel } from '@/components/shared/KnowledgeReferencePanel';
import { NinePalaceGrid } from '@/components/shared/NinePalaceGrid';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import {
  getFeixingGrid,
  getFeixingSummary,
} from '@/legacy/canvasRenderers';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import {
  NINE_STAR_REMEDIES,
  getYuanYun,
  getStarStatuses,
  MING_GUA_DIRECTIONS,
  PALACE_TO_DIR,
  type NineStarRemedy,
} from '@/legacy/flyingStarRemedies';
import { useBirth } from '@/lib/birthContext';
import {
  YEAR_INTENT_EVENT,
  normalizeCommandYear,
  readPendingCommandYear,
  type YearIntentDetail,
} from '@/lib/commandIntents';

const USAGE_LABEL_COLOR: Record<string, string> = {
  '财位': 'border-gold-500/30 bg-gold-500/10 text-gold-400',
  '文昌位': 'border-jade-500/30 bg-jade-500/10 text-jade-400',
  '桃花位': 'border-cinnabar-500/30 bg-cinnabar-500/10 text-cinnabar-400',
  '喜庆位': 'border-cinnabar-500/30 bg-cinnabar-500/10 text-cinnabar-400',
  '武贵位': 'border-jade-500/30 bg-jade-500/10 text-jade-400',
  '病符位': 'border-cinnabar-500/40 bg-cinnabar-500/15 text-cinnabar-300',
  '五黄凶位': 'border-cinnabar-500/40 bg-cinnabar-500/15 text-cinnabar-300',
  '是非位': 'border-cinnabar-500/30 bg-cinnabar-500/10 text-cinnabar-400',
  '破败位': 'border-cinnabar-500/30 bg-cinnabar-500/10 text-cinnabar-400',
};

export function FeixingWorkspace() {
  const { solarBirth } = useBirth();
  const [year, setYear] = useState(() => readPendingCommandYear('feixing'));

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

  const ready = true;
  const summary = useMemo(() => (ready ? getFeixingSummary(year) : null), [ready, year]);
  const grid = useMemo(() => (ready ? getFeixingGrid(year) : null), [ready, year]);

  // Step 3: 元运标识
  const yuanYun = useMemo(() => getYuanYun(year), [year]);
  const starStatuses = useMemo(() => getStarStatuses(yuanYun), [yuanYun]);

  // Step 1+2: 九星化煞建议 + 方位用途
  const flatGrid = useMemo(() => (grid ? grid.flat() : []), [grid]);
  const gridRemedies = useMemo(() => {
    return flatGrid.map((cell) => {
      const remedy = NINE_STAR_REMEDIES[cell.starNum];
      return { cell, remedy };
    });
  }, [flatGrid]);

  // Step 2: 传统方位标签一览
  const usageSummary = useMemo(() => {
    if (flatGrid.length === 0) return null;
    const findDir = (starNum: number) => {
      const cell = flatGrid.find((c) => c.starNum === starNum);
      return cell ? PALACE_TO_DIR[cell.palace] ?? cell.palace : '';
    };
    return {
      resources: findDir(8),
      study: findDir(4),
      romance: findDir(1),
      caution: findDir(2),
      renovation: findDir(5),
    };
  }, [flatGrid]);

  // Step 4: 命卦合参
  const mingGuaResult = useMemo(() => {
    if (!ready) return null;
    const ming = calcMingGua(solarBirth.year, solarBirth.gender);
    const guaNum = ming.trigram ? trigramToGuaNum(ming.trigram) : null;
    if (!guaNum) return null;
    return MING_GUA_DIRECTIONS[guaNum] ?? null;
  }, [ready, solarBirth]);

  const starLegend = useMemo<LegendItem[]>(
    () => [
      { label: '一白 / 水', color: 'var(--wz-water)', description: '偏向流动、信息与文昌语义。' },
      { label: '三碧四绿 / 木', color: 'var(--wz-wood)', description: '偏向生发、变动与学习语义。' },
      { label: '二黑五黄八白 / 土', color: 'var(--wz-earth)', description: '偏向中宫、稳定与传统谨慎标签。' },
      { label: '六白七赤 / 金', color: 'var(--wz-metal)', description: '偏向秩序、权责与收敛语义。' },
      { label: '九紫 / 火', color: 'var(--wz-fire)', description: '偏向喜庆、显化与互动语义。' },
    ],
    [],
  );

  const contextPayload = useMemo(
    () => ({
      项目: '流年飞星',
      年份: year,
      中宫飞星: summary ?? null,
      元运: yuanYun.name,
      方位参考: usageSummary,
    }),
    [year, summary, yuanYun, usageSummary],
  );
  const exportReport = useMemo(() => ({
    summary: `${year}年流年飞星的传统方位标签参考，不用于健康、财务、施工或其他现实决策。`,
    sections: [
      { heading: '中宫与元运', body: `中宫飞星：${summary ? `${summary.centerStar} · ${summary.starName} · ${summary.wuxing} · ${summary.luck}` : '—'}\n元运：${yuanYun.name}（${yuanYun.startYear}-${yuanYun.endYear}）` },
      ...(usageSummary ? [{ heading: '传统方位标签', body: `资源主题：${usageSummary.resources}方\n学习主题：${usageSummary.study}方\n人际主题：${usageSummary.romance}方\n谨慎标签：${usageSummary.caution}方\n改造谨慎标签：${usageSummary.renovation}方` }] : []),
      ...(mingGuaResult ? [{ heading: '个人方位标签对照', body: `生气：${mingGuaResult.shengqi}方\n天医：${mingGuaResult.tianyi}方\n延年：${mingGuaResult.niannian}方\n绝命：${mingGuaResult.jueming}方。以上为传统八宅标签，不预示个人健康、关系或财务结果。` }] : []),
      { heading: '九星方位', body: gridRemedies.map(({ cell, remedy }) => `${PALACE_TO_DIR[cell.palace] ?? cell.palace}方：${remedy?.name ?? `${cell.starNum}星`} · ${remedy?.usageLabel ?? '方位参考'}`).join('\n') },
    ],
  }), [gridRemedies, mingGuaResult, summary, usageSummary, year, yuanYun]);

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">流年飞星</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              输入年份，查看流年九宫飞星分布、传统方位标签与命卦对照；内容仅作文化阅读，不用于现实决策。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="feixing" title="流年飞星摘要" payload={contextPayload} />
            <ExportReportButton module="流年飞星" report={exportReport} />
          </div>
        </div>
      </div>

      {/* Step 3: 元运标识 */}
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-gold-500/20 bg-gold-500/5 p-3">
        <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-semibold text-gold-400">
          {yuanYun.name}（{yuanYun.startYear}-{yuanYun.endYear}）
        </span>
        <span className="text-xs text-gold-400/60">当令旺星：{NINE_STAR_REMEDIES[yuanYun.wangStar]?.name}</span>
        <span className="text-xs text-jade-100/45">生气星：{NINE_STAR_REMEDIES[yuanYun.shengStar]?.name}</span>
        <span className="text-xs text-jade-100/45">退气星：{NINE_STAR_REMEDIES[yuanYun.tuiStar]?.name}</span>
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
            badge={summary?.luck ?? ''}
            items={summary ? [
              { label: '星号', value: summary.centerStar },
              { label: '星名', value: summary.starName },
              { label: '五行', value: summary.wuxing },
              { label: '吉凶', value: summary.luck },
            ] : []}
          >
            {!summary && <span className="text-jade-100/45">等待引擎加载。</span>}
          </InterpretationCard>

          {/* Step 2: 传统方位标签一览 */}
          {usageSummary && (
            <div className="rounded-card border border-white/8 bg-white/[0.025] p-4">
              <p className="text-sm font-semibold text-jade-100/70">传统方位标签</p>
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gold-400">资源主题</span><span className="text-jade-100/70">{usageSummary.resources}方</span></div>
                <div className="flex justify-between"><span className="text-jade-400">学习主题</span><span className="text-jade-100/70">{usageSummary.study}方</span></div>
                <div className="flex justify-between"><span className="text-cinnabar-400">人际主题</span><span className="text-jade-100/70">{usageSummary.romance}方</span></div>
                <div className="flex justify-between"><span className="text-cinnabar-300">谨慎标签</span><span className="text-jade-100/70">{usageSummary.caution}方</span></div>
                <div className="flex justify-between"><span className="text-cinnabar-300">改造谨慎标签</span><span className="text-jade-100/70">{usageSummary.renovation}方</span></div>
              </div>
            </div>
          )}

          {/* Step 4: 命卦标签对照 */}
          {mingGuaResult && (
            <div className="rounded-card border border-jade-500/20 bg-jade-500/5 p-4">
              <p className="text-sm font-semibold text-jade-400">命卦标签对照</p>
              <p className="mt-1 text-xs text-jade-100/45">基于出生信息的传统八宅标签，不预示个人结果</p>
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-jade-400">生气</span><span className="text-jade-100/70">{mingGuaResult.shengqi}方</span></div>
                <div className="flex justify-between"><span className="text-jade-400">天医</span><span className="text-jade-100/70">{mingGuaResult.tianyi}方</span></div>
                <div className="flex justify-between"><span className="text-jade-400">延年</span><span className="text-jade-100/70">{mingGuaResult.niannian}方</span></div>
                <div className="flex justify-between"><span className="text-cinnabar-400">绝命</span><span className="text-jade-100/70">{mingGuaResult.jueming}方</span></div>
              </div>
              {usageSummary && mingGuaResult.shengqi === usageSummary.resources && (
                <p className="mt-2 rounded-card border border-gold-500/30 bg-gold-500/10 p-2 text-[11px] text-gold-400">
                  ✦ 方位标签重合：个人生气标签与年度资源主题标签位于同一方位，仅作传统文化对照。
                </p>
              )}
            </div>
          )}

          {/* Step 1: 九星传统布置说法 */}
          {gridRemedies.length > 0 && (
            <div className="rounded-card border border-white/8 bg-white/[0.025] p-4">
              <p className="text-sm font-semibold text-jade-100/70">九星传统布置说法</p>
              <div className="mt-2 space-y-2">
                {gridRemedies.filter(({ remedy }) => remedy?.nature === '大凶' || remedy?.nature === '凶').map(({ cell, remedy }) => (
                  <div key={cell.palace} className="rounded-card border border-cinnabar-500/20 bg-cinnabar-500/5 p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-cinnabar-400">{cell.palace}·{remedy!.name}</span>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${USAGE_LABEL_COLOR[remedy!.usageLabel] ?? ''}`}>
                        {remedy!.usageLabel}
                      </span>
                    </div>
                    {remedy!.remedy && <p className="mt-1 text-[11px] leading-4 text-cinnabar-400/70">传统说法：{remedy!.remedy}</p>}
                    {remedy!.colors && <p className="mt-0.5 text-[11px] leading-4 text-jade-100/55">传统配色：{remedy!.colors}</p>}
                    {remedy!.items && <p className="mt-0.5 text-[11px] leading-4 text-jade-100/55">传统物件：{remedy!.items}</p>}
                    <p className="mt-0.5 text-[11px] leading-4 text-jade-100/45">{remedy!.health}</p>
                  </div>
                ))}
                {gridRemedies.filter(({ remedy }) => remedy?.nature === '大吉' || remedy?.nature === '吉').map(({ cell, remedy }) => (
                  <div key={cell.palace} className="rounded-card border border-jade-500/20 bg-jade-500/5 p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-jade-400">{cell.palace}·{remedy!.name}</span>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${USAGE_LABEL_COLOR[remedy!.usageLabel] ?? ''}`}>
                        {remedy!.usageLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-jade-100/55">传统空间对照：{remedy!.roomUse.join('、')}</p>
                    {remedy!.colors && <p className="mt-0.5 text-[11px] leading-4 text-jade-100/55">传统配色：{remedy!.colors}</p>}
                    {remedy!.items && <p className="mt-0.5 text-[11px] leading-4 text-jade-100/55">传统物件：{remedy!.items}</p>}
                    <p className="mt-0.5 text-[11px] leading-4 text-jade-100/45">{remedy!.career}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <LegendPanel
            title="九星五行图例"
            description="九星五行配色与传统方位标签参考。"
            items={starLegend}
          />

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
            飞星布局和传统布置说法仅作文化学习与方位阅读，不构成健康、财务、施工或其他现实决策建议。
          </p>

          <KnowledgeReferencePanel
            initialTerm={summary?.starName ?? '五黄'}
            terms={Array.from(new Set([summary?.starName ?? '廉贞', '一白', '二黑', '五黄', '九紫', '病符', '文昌']))}
            description="点击术语查看飞星映射与古籍索引。"
          />
        </aside>

        <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-jade-50">九宫飞星图</h3>
              <p className="mt-1 text-sm leading-6 text-jade-100/55">
                3×3 洛书九宫，每格宫位名+飞星编号星名+方位用途标签，中心格高亮。
              </p>
            </div>
          </div>
          <div className="canvas-stage overflow-x-auto rounded-card border border-jade-500/18 bg-ink-950/92 p-3">
            {grid ? (
              <ZoomableSvg title="九宫飞星图">
                <NinePalaceGrid grid={grid} year={year} />
              </ZoomableSvg>
            ) : (
              <LoadingSkeleton label="正在排盘" />
            )}
          </div>

          {/* Step 3: 九星旺衰状态 */}
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {starStatuses.map((s) => {
              const remedy = NINE_STAR_REMEDIES[s.star];
              return (
                <div key={s.star} className={`rounded-card border p-2 ${
                  s.status === '当令旺' ? 'border-gold-500/30 bg-gold-500/8' :
                  s.status === '生气' ? 'border-jade-500/25 bg-jade-500/6' :
                  s.status === '退气' ? 'border-white/10 bg-white/[0.02]' :
                  'border-cinnabar-500/25 bg-cinnabar-500/6'
                }`}>
                  <p className="text-xs font-semibold text-jade-100/70">{remedy?.name ?? `${s.star}星`}</p>
                  <p className={`mt-0.5 text-[10px] ${s.status === '当令旺' ? 'text-gold-400' : s.status === '生气' ? 'text-jade-400' : s.status === '退气' ? 'text-jade-100/45' : 'text-cinnabar-400'}`}>
                    {s.status}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-3 text-jade-100/40">{s.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}

/** 卦名 → 卦数映射 */
function trigramToGuaNum(trigram: string): number | null {
  const map: Record<string, number> = { '坎': 1, '坤': 2, '震': 3, '巽': 4, '乾': 6, '兑': 7, '艮': 8, '离': 9 };
  return map[trigram] ?? null;
}
