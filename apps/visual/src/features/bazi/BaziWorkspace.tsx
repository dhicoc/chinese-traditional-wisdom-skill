import { useMemo, useState } from 'react';
import { getSolarEntry } from '@/legacy/solarEntry';
import { BaziPillarsChart } from '@/components/shared/BaziPillarsChart';
import { CopyContextButton } from '@/components/shared/CopyContextButton';

import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { FiveElementsChart } from '@/components/shared/FiveElementsChart';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { TermExplanationPanel } from '@/components/shared/TermExplanationPanel';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { calculateBazi as calculateBaziPure, calcBaziEnveloped, getBaziMonthDaySnapshot, getBaziTransitSnapshot } from '@/legacy/baziEngine';
import type { TrineSource } from '@/legacy/shensha';
import { toFourLayer, type LayerReport, type ReadingLike } from '@/legacy/reportLayers';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { type BaziPillars, type WuxingStats } from '@/legacy/canvasRenderers';
import type { ShenShaItem } from '@/legacy/shensha';
import { calcXiYong } from '@/legacy/xiyong';
import type { SolarBirth } from '@/legacy/birthBridge';
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
  木: 'var(--c-jade)',
  火: 'var(--wz-fire)',
  土: 'var(--wz-earth)',
  金: 'var(--wz-metal)',
  水: 'var(--wz-water)',
};

interface BaziResult {
  pillars?: unknown;
  elements?: Partial<WuxingStats>;
  dayMaster?: string;
  dayMasterWuxing?: string;
  engineName?: string;
  mode?: string;
  confidenceNote?: string;
  shenSha?: ShenShaItem[];
  shenShaTrineSource?: TrineSource;
}

function calculateBazi(solarBirth: SolarBirth, ready: boolean, trineSource: TrineSource) {
  if (!ready) {
    return { result: null, pillars: { ...DEFAULT_PILLARS, gender: solarBirth.gender }, wuxing: DEFAULT_WUXING, envelope: null };
  }
  try {
    const solarEntry = getSolarEntry();
    const env = calcBaziEnveloped({ birth: solarBirth, solar: solarEntry, shenShaTrineSource: trineSource });
    const pure = calculateBaziPure({ birth: solarBirth, solar: solarEntry, shenShaTrineSource: trineSource });
    const pillars: BaziPillars = {
      year: { stem: pure.pillars.year.stem, branch: pure.pillars.year.branch, hidden: pure.hiddenStems.year },
      month: { stem: pure.pillars.month.stem, branch: pure.pillars.month.branch, hidden: pure.hiddenStems.month },
      day: { stem: pure.pillars.day.stem, branch: pure.pillars.day.branch, hidden: pure.hiddenStems.day },
      hour: { stem: pure.pillars.hour.stem, branch: pure.pillars.hour.branch, hidden: pure.hiddenStems.hour },
      dayMaster: pure.dayMaster,
      gender: pure.gender,
    };
    return { result: pure as unknown as BaziResult, pillars, wuxing: { ...DEFAULT_WUXING, ...pure.elements }, envelope: env };
  } catch {
    return {
      result: null,
      pillars: { ...DEFAULT_PILLARS, gender: solarBirth.gender },
      wuxing: DEFAULT_WUXING,
      envelope: null,
    };
  }
}

function birthSummary(solarBirth: SolarBirth) {
  return solarBirth.year + '-' + String(solarBirth.month).padStart(2, '0') + '-' + String(solarBirth.day).padStart(2, '0') + ' ' + String(solarBirth.hour).padStart(2, '0') + ':00';
}

function getTodayDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function BaziWorkspace() {
  const { birth, solarBirth } = useBirth();
  const [trineSource, setTrineSource] = useState<TrineSource>('year');
  const [activeShenShaPillar, setActiveShenShaPillar] = useState<'年' | '月' | '日' | '时' | null>(null);
  const [transitYear, setTransitYear] = useState(() => String(new Date().getFullYear()));
  const [transitDate, setTransitDate] = useState(getTodayDate);

  const ready = true;
  const { result, pillars, wuxing, envelope } = useMemo(() => calculateBazi(solarBirth, ready, trineSource), [solarBirth, ready, trineSource]);
  const transit = useMemo(() => getBaziTransitSnapshot(solarBirth, Number(transitYear), getSolarEntry()), [solarBirth, transitYear]);
  const monthDayTransit = useMemo(() => getBaziMonthDaySnapshot(solarBirth, transitDate, getSolarEntry()), [solarBirth, transitDate]);
  const shenSha = result?.shenSha ?? [];
  const firstShenShaPillar = (['年', '月', '日', '时'] as const).find((pillar) => shenSha.some((item) => item.pillar === pillar)) ?? null;
  const selectedShenShaPillar = activeShenShaPillar && shenSha.some((item) => item.pillar === activeShenShaPillar)
    ? activeShenShaPillar
    : firstShenShaPillar;
  const selectedShenShaItems = selectedShenShaPillar
    ? shenSha.filter((item) => item.pillar === selectedShenShaPillar)
    : [];
  const fourLayer = useMemo<LayerReport | null>(() => {
    if (!envelope) return null;
    return toFourLayer(envelope.data.export_snapshot as ReadingLike);
  }, [envelope]);
  const pillarRows = [
    ['年柱', pillars.year],
    ['月柱', pillars.month],
    ['日柱', pillars.day],
    ['时柱', pillars.hour],
  ] as const;
  const maxWuxing = Math.max(1, ...Object.values(wuxing));
  const xiyong = useMemo(() => {
    const dmWx = result?.dayMasterWuxing;
    if (!dmWx) return null;
    return calcXiYong(dmWx, wuxing);
  }, [result?.dayMasterWuxing, wuxing]);
  const contextPayload = useMemo(
    () => ({
      module: 'bazi',
      mode: result?.mode ?? 'fallback-demo',
      engineName: result?.engineName ?? 'BaziEngine',
      solarBirth,
      pillars,
      wuxing,
      source: 'apps/visual/src/legacy/baziEngine.ts + lunar-javascript',
    }),
    [solarBirth, pillars, result, wuxing],
  );

  return (
    <section className="space-y-5">
      <div className="console-panel rounded-panel border border-jade-500/20 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-400">Bazi Plate</p>
            <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[0.08em] text-jade-50">八字排盘工作台</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              读取顶部全局生辰，生成四柱、五行与喜用神分析。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="bazi" title="八字命盘 React 迁移上下文" payload={contextPayload} />
            <ExportReportButton module="八字命盘" />
          </div>
        </div>
      </div>

      <div className="bazi-console-grid grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <InterpretationCard
            title="排盘信息"
            badge={ready ? '已接入' : '加载中'}
            items={[
              { label: '生辰', value: birthSummary(solarBirth) },
              { label: '历法', value: (birth.isLunar ? '农历' : '公历') + ' · ' + (solarBirth.useExactCalendar ? '精确' : '近似') },
              { label: '性别', value: solarBirth.gender },
            ]}
          />
          <InterpretationCard
            title="推算边界"
            items={[
              { label: '日主', value: (result?.dayMaster ?? pillars.dayMaster ?? '?') + ' · ' + (result?.dayMasterWuxing ?? '?') },
              ...(xiyong ? [
                { label: '日主强弱', value: `${xiyong.qiangRuo}（同类${xiyong.similarPoint} / 异类${xiyong.heterogeneousPoint}）` },
                { label: '喜用神', value: xiyong.shen + '（' + (xiyong.qiangRuo === '身弱' ? '补同类最弱' : xiyong.qiangRuo === '身强' ? '补异类最弱' : '补全局最弱') + '）' },
                { label: '同类', value: xiyong.similar.join('、') },
                { label: '异类', value: xiyong.heterogeneous.join('、') },
              ] : []),
            ]}
          />
          <div className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2">
            <p className="mb-1.5 text-xs font-semibold text-jade-100/70">桃花·驿马·华盖·将星 查法</p>
            <div className="flex flex-wrap gap-1.5">
              {([['year', '按年支查（传统主流）'], ['day', '按日支查（流派之一）']] as Array<[TrineSource, string]>).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTrineSource(id)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    id === trineSource
                      ? 'border border-jade-500/50 bg-jade-500/20 text-jade-100'
                      : 'border border-white/10 bg-ink-900/60 text-jade-100/55 hover:border-jade-500/30 hover:text-jade-100/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-jade-100/45">
              {trineSource === 'year' ? '以年支所在三合局查取，多数子平书采用此法。' : '以日支所在三合局查取，部分流派采用。'} 切换后主盘神煞印章与柱位明细会相应更新。
            </p>
          </div>
          <TermExplanationPanel
            ready={ready}
            initialTerm="日主"
            terms={["日主","十神","正印","偏印","正官","七杀","正财","偏财","比肩","劫财","食神","伤官","喜用神","五行","纳音"]}
            description="点击术语查看通俗解释与命理含义。"
          />
          {fourLayer && (
            <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <FourLayerReport report={fourLayer} title="四层报告（总结·亮点·详析·建议）" />
            </div>
          )}
        </aside>

        <div className="space-y-4">
          <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-jade-50">四柱主盘</h3>
                <p className="mt-1 text-sm leading-6 text-jade-100/55">
                  四柱主盘：年/月/日/时天干地支，按五行配色，日柱高亮。
                </p>
              </div>
            </div>
            <div className="canvas-stage overflow-x-auto rounded-card border border-jade-500/18 bg-ink-950/92 p-3">
              {ready ? (
                <ZoomableSvg title="四柱主盘">
                  <BaziPillarsChart
                    pillars={pillars}
                    shenSha={shenSha}
                    activeShenShaPillar={selectedShenShaPillar}
                    onSelectShenShaPillar={setActiveShenShaPillar}
                  />
                </ZoomableSvg>
              ) : (
                <LoadingSkeleton label="正在排盘" />
              )}
            </div>
            {selectedShenShaPillar && selectedShenShaItems.length > 0 && (
              <section className="mt-4 border-t border-jade-500/16 pt-4" aria-labelledby="pillar-shensha-title">
                <div className="mb-3 flex items-center justify-between">
                  <h4 id="pillar-shensha-title" className="text-sm font-semibold text-jade-100">
                    {selectedShenShaPillar}柱神煞
                  </h4>
                  <span className="rounded-full border border-cinnabar-500/25 bg-cinnabar-500/10 px-2 py-0.5 text-[11px] text-cinnabar-500">
                    {selectedShenShaItems.length} 项
                  </span>
                </div>
                <ul className="space-y-2">
                  {selectedShenShaItems.map((item) => (
                    <li key={`${item.name}-${item.branch}-${item.pillar}`} className="rounded-card border border-white/8 bg-white/[0.025] px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-jade-50">{item.name}</span>
                        <span className="text-xs text-cinnabar-500/85">{item.category}</span>
                        <span className="text-xs text-jade-100/50">临{item.branch}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-jade-100/60">{item.meaning}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>
          {transit.available && (
            <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument" aria-labelledby="bazi-transit-title">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 id="bazi-transit-title" className="text-lg font-semibold text-jade-50">大运 · 流年</h3>
                  <p className="mt-1 text-sm leading-6 text-jade-100/55">大运与流年独立于本命四柱显示；当前按周岁定位大运。</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-jade-100/65">
                  目标年份
                  <input
                    type="number"
                    value={transitYear}
                    min="1900"
                    max="2100"
                    onChange={(event) => setTransitYear(event.target.value)}
                    className="w-24 rounded border border-white/10 bg-black/30 px-2 py-1 text-sm text-jade-50 outline-none focus:border-jade-500/60"
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <section className="rounded-card border border-jade-500/20 bg-jade-500/10 px-3 py-2.5">
                  <p className="text-xs font-semibold text-jade-100/70">当前大运</p>
                  <p className="mt-1 text-sm text-jade-50">
                    {transit.currentLuck
                      ? `${transit.luckDirection} · ${transit.currentLuck.ageStart}岁起 · ${transit.currentLuck.stem}${transit.currentLuck.branch}`
                      : `${transit.luckDirection} · 尚未起运`}
                  </p>
                  <p className="mt-1 text-xs text-jade-100/55">
                    {transit.luckStartSolar
                      ? `精确起运：${transit.luckStartSolar}`
                      : transit.currentLuck?.startYear && transit.currentLuck.endYear
                        ? `${transit.currentLuck.startYear}–${transit.currentLuck.endYear}`
                        : '起运年龄按当前排盘口径'}
                  </p>
                </section>
                <section className="rounded-card border border-cinnabar-500/20 bg-cinnabar-500/10 px-3 py-2.5">
                  <p className="text-xs font-semibold text-jade-100/70">流年</p>
                  <p className="mt-1 text-sm text-jade-50">{transit.targetYear}年 · {transit.yearly.stem}{transit.yearly.branch}</p>
                  <p className="mt-1 text-xs text-jade-100/55">流年天干{transit.yearly.stem}为{transit.yearly.stemShiShen} · 五行{transit.yearly.stemWuxing}</p>
                </section>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {transit.luck.map((luck) => {
                  const isCurrent = transit.currentLuck?.ageStart === luck.ageStart;
                  return (
                    <section
                      key={`${luck.ageStart}-${luck.stem}${luck.branch}`}
                      className={`rounded-card border px-3 py-2.5 ${isCurrent ? 'border-jade-500/55 bg-jade-500/15' : 'border-white/8 bg-white/[0.025]'}`}
                    >
                      <p className="text-xs font-semibold text-jade-100/70">{luck.ageStart}岁起</p>
                      <p className="mt-1 text-lg text-jade-50">{luck.stem}{luck.branch}</p>
                      <p className="mt-1 text-xs text-jade-100/55">{luck.stemWuxing}{luck.startYear && luck.endYear ? ` · ${luck.startYear}–${luck.endYear}` : ''}</p>
                    </section>
                  );
                })}
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                <section className="rounded-card border border-white/8 bg-white/[0.025] px-3 py-2.5">
                  <p className="text-xs font-semibold text-jade-100/70">流年与原局</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {transit.natalRelations.length > 0
                      ? transit.natalRelations.map((item) => (
                        <span key={`${item.pillar}-${item.ganZhi}`} className="rounded-full border border-cinnabar-500/25 bg-cinnabar-500/10 px-2 py-0.5 text-xs text-cinnabar-400">
                          {item.pillar}{item.ganZhi} · {item.relations.join('、')}
                        </span>
                      ))
                      : <span className="text-xs text-jade-100/50">未见冲、合、刑、害关系</span>}
                  </div>
                </section>
                <section className="rounded-card border border-white/8 bg-white/[0.025] px-3 py-2.5">
                  <p className="text-xs font-semibold text-jade-100/70">流年与当前大运</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {transit.currentLuck && transit.luckRelations.length > 0
                      ? <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2 py-0.5 text-xs text-jade-100/80">{transit.currentLuck.stem}{transit.currentLuck.branch} · {transit.luckRelations.join('、')}</span>
                      : <span className="text-xs text-jade-100/50">未见冲、合、刑、害关系</span>}
                  </div>
                </section>
              </div>
            </section>
          )}
          {monthDayTransit.available && (
            <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument" aria-labelledby="bazi-month-day-title">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 id="bazi-month-day-title" className="text-lg font-semibold text-jade-50">流月 · 流日</h3>
                  <p className="mt-1 text-sm leading-6 text-jade-100/55">流月按节气月干支、流日按精确日干支推算，与本命、大运分层显示。</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-jade-100/65">
                  目标日期
                  <input
                    type="date"
                    value={transitDate}
                    onChange={(event) => setTransitDate(event.target.value)}
                    className="rounded border border-white/10 bg-black/30 px-2 py-1 text-sm text-jade-50 outline-none focus:border-jade-500/60"
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {([['流月', monthDayTransit.monthly], ['流日', monthDayTransit.daily]] as const).map(([label, pillar]) => (
                  <section key={label} className="rounded-card border border-white/8 bg-white/[0.025] px-3 py-2.5">
                    <p className="text-xs font-semibold text-jade-100/70">{label}</p>
                    <p className="mt-1 text-lg text-jade-50">{pillar.stem}{pillar.branch}</p>
                    <p className="mt-1 text-xs text-jade-100/55">天干{pillar.stem}为{pillar.stemShiShen} · 五行{pillar.stemWuxing}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {pillar.natalRelations.length > 0
                        ? pillar.natalRelations.map((item) => (
                          <span key={`${label}-${item.pillar}-${item.ganZhi}`} className="rounded-full border border-cinnabar-500/25 bg-cinnabar-500/10 px-2 py-0.5 text-xs text-cinnabar-400">
                            原局{item.pillar}{item.ganZhi} · {item.relations.join('、')}
                          </span>
                        ))
                        : <span className="text-xs text-jade-100/50">与原局未见冲、合、刑、害关系</span>}
                      {monthDayTransit.currentLuck && pillar.luckRelations.length > 0 && (
                        <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2 py-0.5 text-xs text-jade-100/80">
                          大运{monthDayTransit.currentLuck.stem}{monthDayTransit.currentLuck.branch} · {pillar.luckRelations.join('、')}
                        </span>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          )}
          <div className="console-panel rounded-panel border border-jade-500/20 bg-ink-950/90 p-4">
            <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="text-lg font-semibold text-jade-50">八字明细</h3>
              <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] text-jade-100/45">四柱</span>
            </div>
            <div className="grid grid-cols-4 overflow-hidden rounded-card border border-white/10 text-center text-sm">
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
          <section className="console-panel rounded-panel border border-jade-500/20 bg-ink-950/90 p-4 shadow-instrument">
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
                      <span className="font-mono text-jade-100/55">{value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full" style={{ width: Math.max(8, (value / maxWuxing) * 100) + '%', backgroundColor: WUXING_COLORS[key] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-jade-50">五行平衡</h3>
                <p className="mt-1 text-sm leading-6 text-jade-100/55">
                  五行相生相克图，统计姓名各字五行分布。
                </p>
              </div>
            </div>
            <div className="canvas-stage overflow-x-auto rounded-card border border-jade-500/18 bg-ink-950/92 p-3">
              {ready ? (
                <ZoomableSvg title="五行平衡">
                  <FiveElementsChart stats={wuxing} />
                </ZoomableSvg>
              ) : (
                <LoadingSkeleton label="正在排盘" />
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
