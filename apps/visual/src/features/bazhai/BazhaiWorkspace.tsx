import { useEffect, useMemo, useState } from 'react';
import { ControlField } from '@/components/shared/ControlField';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { EightMansionsChart } from '@/components/shared/EightMansionsChart';
import { KnowledgeReferencePanel } from '@/components/shared/KnowledgeReferencePanel';
import { TermExplanationPanel } from '@/components/shared/TermExplanationPanel';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import {
  getBazhaiGrid,
  getBazhaiSummary,
  getFeixingGrid,
} from '@/legacy/canvasRenderers';
import {
  checkMingZhaiCompatibility,
  combineBazhaiFeixing,
  getHouseGua,
  getPersonalDirections,
  getSectorAnalysis,
  SHAPE_SHA,
  FACING_OPTIONS,
} from '@/legacy/bazhaiHouse';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { calcTaisui } from '@/legacy/taisuiEngine';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import type { LegacyState } from '@/legacy/legacyGlobals';

export function BazhaiWorkspace() {
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [year, setYear] = useState(1990);
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [facing, setFacing] = useState<string>('南');
  const [flowYear, setFlowYear] = useState(2026);

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
  const summary = useMemo(
    () => (ready ? getBazhaiSummary(year, gender) : null),
    [ready, year, gender],
  );
  const grid = useMemo(
    () => (ready ? getBazhaiGrid(year, gender) : null),
    [ready, year, gender],
  );
  const feixingGrid = useMemo(
    () => (ready ? getFeixingGrid(flowYear) : null),
    [ready, flowYear],
  );
  const combo = useMemo(
    () => (summary ? combineBazhaiFeixing(summary.trigram, feixingGrid) : null),
    [summary, feixingGrid],
  );
  const houseGua = useMemo(() => getHouseGua(facing), [facing]);
  const compatibility = useMemo(
    () => (summary && houseGua ? checkMingZhaiCompatibility(summary.trigram, houseGua) : null),
    [summary, houseGua],
  );
  const personalDirs = useMemo(
    () => (summary ? getPersonalDirections(summary.trigram) : null),
    [summary],
  );
  const sectorAnalysis = useMemo(
    () => (summary ? getSectorAnalysis(summary.trigram) : null),
    [summary],
  );

  const contextPayload = useMemo(
    () => ({
      module: 'bazhai',
      mode: 'legacy-canvas-react-shell',
      year,
      gender,
      facing,
      flowYear,
      mingGua: summary ?? null,
      houseGua: houseGua ?? null,
      compatibility: compatibility ?? null,
      combo: combo ?? null,
      source: 'visual/js/fengshui.js + visual/js/core.js + bazhaiHouse.ts + flyingStarRemedies.ts',
    }),
    [year, gender, facing, flowYear, summary, houseGua, compatibility, combo],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">八宅大游年</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              输入出生年与性别，查看命卦与八方位游年星吉凶。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="bazhai" title="八宅大游年 React 迁移上下文" payload={contextPayload} />
            <ExportReportButton module="八宅大游年" />
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
            label="出生年"
            hint="1900-2100"
            type="number"
            min={1900}
            max={2100}
            inputMode="numeric"
            value={year}
            onChange={(event) => setYear(Number.parseInt(event.target.value, 10) || 1990)}
          />

          <ControlField label="性别">
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value as '男' | '女')}
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </ControlField>

          <ControlField label="房屋朝向" hint="按朝向方定宅卦">
            <select
              value={facing}
              onChange={(event) => setFacing(event.target.value)}
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            >
              {FACING_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}方</option>
              ))}
            </select>
          </ControlField>

          <div className="rounded-card border border-white/8 bg-white/[0.035] p-4">
            <p className="text-sm font-semibold text-jade-100">命卦</p>
            {summary ? (
              <dl className="mt-3 space-y-2 text-sm text-jade-100/55">
                <div className="flex justify-between gap-3"><dt>卦象</dt><dd className="text-jade-100">{summary.trigram}卦</dd></div>
                <div className="flex justify-between gap-3"><dt>分组</dt><dd className="text-jade-100">{summary.group}</dd></div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-jade-100/45">等待旧引擎加载。</p>
            )}
          </div>

          {houseGua && (
            <div className="rounded-card border border-white/8 bg-white/[0.035] p-4">
              <p className="text-sm font-semibold text-jade-100">宅卦</p>
              <dl className="mt-3 space-y-2 text-sm text-jade-100/55">
                <div className="flex justify-between gap-3"><dt>宅卦</dt><dd className="text-jade-100">{houseGua.name}</dd></div>
                <div className="flex justify-between gap-3"><dt>分组</dt><dd className="text-jade-100">{houseGua.group}</dd></div>
              </dl>
            </div>
          )}

          {compatibility && (
            <div className={`rounded-card border p-4 ${compatibility.level === '相配' ? 'border-jade-500/30 bg-jade-500/8' : 'border-cinnabar-500/30 bg-cinnabar-500/8'}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-jade-100">命宅相配</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${compatibility.level === '相配' ? 'border border-jade-500/40 text-jade-400' : 'border border-cinnabar-500/40 text-cinnabar-400'}`}>
                  {compatibility.level}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-jade-100/65">{compatibility.detail}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-jade-100/45">
                <span>命卦五行：{compatibility.mingWuxing}</span>
                <span>宅卦五行：{compatibility.houseWuxing}</span>
                {compatibility.wuxingRelation && <span>生克：{compatibility.wuxingRelation}</span>}
              </div>
            </div>
          )}

          {personalDirs && (
            <div className="rounded-card border border-white/8 bg-white/[0.035] p-4">
              <p className="text-sm font-semibold text-jade-100">个人吉凶方位速查</p>
              <p className="mt-1 text-[11px] text-jade-100/45">四吉方（宜床位/书桌/财位）</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-xs">
                {personalDirs.auspicious.map((d) => (
                  <div key={d.star} className="flex justify-between rounded bg-jade-500/8 px-2 py-1">
                    <span className="text-jade-300">{d.star}</span>
                    <span className="text-jade-100/70">{d.direction}方</span>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[11px] text-jade-100/45">四凶方（宜置厕所/储物化解）</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-xs">
                {personalDirs.inauspicious.map((d) => (
                  <div key={d.star} className="flex justify-between rounded bg-cinnabar-500/8 px-2 py-1">
                    <span className="text-cinnabar-300">{d.star}</span>
                    <span className="text-jade-100/70">{d.direction}方</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sectorAnalysis && (
            <div className="rounded-card border border-white/8 bg-white/[0.035] p-4">
              <p className="text-sm font-semibold text-jade-100">方位用途宜忌</p>
              <p className="mt-1 text-[11px] text-jade-100/45">八星古典主象 + 房间布局建议（《八宅明镜》《阳宅三要》）</p>
              <div className="mt-2.5 space-y-2">
                {sectorAnalysis.map((s) => {
                  const isJi = s.use.quality === '大吉' || s.use.quality === '吉';
                  const isXiong = s.use.quality === '大凶' || s.use.quality === '凶' || s.use.quality === '次凶';
                  return (
                    <div key={s.direction} className="rounded border border-white/5 bg-black/30 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-jade-100">{s.direction}方 · {s.use.star}</span>
                        <span className={`text-[10px] ${isJi ? 'text-jade-400' : isXiong ? 'text-cinnabar-400' : 'text-jade-100/55'}`}>
                          {s.use.classicalName} · {s.use.quality}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-jade-100/55">{s.use.meaning}</p>
                      <p className="mt-0.5 text-[11px] leading-4 text-jade-300/70">{s.use.advice}</p>
                      {s.use.remedy && (
                        <p className="mt-0.5 text-[11px] leading-4 text-cinnabar-300/70">
                          <span className="text-cinnabar-400">化解：</span>{s.use.remedy}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {combo && (
            <div className="rounded-card border border-gold-500/25 bg-gold-500/6 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-jade-100">八宅 + 飞星合参</p>
                <label className="flex items-center gap-1 text-[11px] text-gold-400">
                  流年
                  <input
                    type="number"
                    min={1900}
                    max={2100}
                    inputMode="numeric"
                    value={flowYear}
                    onChange={(event) => setFlowYear(Number.parseInt(event.target.value, 10) || 2026)}
                    className="w-20 rounded border border-gold-500/25 bg-ink-900/70 px-2 py-0.5 text-xs text-gold-200 outline-none focus:border-gold-500/50"
                  />
                </label>
              </div>
              <p className="mt-1 text-[11px] text-jade-100/45">个人命卦方位（静态）与流年飞星方位（动态）交叉分析 · 流年仅影响本卡片，不改命卦命盘</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                <div className="flex justify-between rounded bg-jade-500/8 px-2 py-1"><span className="text-jade-300">个人生气位</span><span className="text-jade-100/80">{combo.shengqiDirection}方</span></div>
                <div className="flex justify-between rounded bg-jade-500/8 px-2 py-1"><span className="text-jade-300">流年财位</span><span className="text-jade-100/80">{combo.caiweiDirection}方</span></div>
                <div className="flex justify-between rounded bg-cinnabar-500/8 px-2 py-1"><span className="text-cinnabar-300">五黄煞</span><span className="text-jade-100/80">{combo.wuhuangDirection}方</span></div>
                <div className="flex justify-between rounded bg-cinnabar-500/8 px-2 py-1"><span className="text-cinnabar-300">二黑病符</span><span className="text-jade-100/80">{combo.erheiDirection}方</span></div>
              </div>
              {combo.doubleWealth && (
                <p className="mt-2 rounded bg-gold-500/15 px-2 py-1.5 text-[11px] leading-4 text-gold-300">
                  ★ 双重旺财：{combo.doubleWealthDirection}方本年财气最旺
                </p>
              )}
              <div className="mt-2 space-y-1.5">
                {combo.suggestions.map((s, i) => (
                  <div key={i} className={`rounded border px-2.5 py-1.5 text-[11px] leading-4 ${s.tone === '吉' ? 'border-jade-500/20 bg-jade-500/6 text-jade-100/70' : s.tone === '凶' ? 'border-cinnabar-500/20 bg-cinnabar-500/6 text-jade-100/70' : 'border-white/8 bg-black/20 text-jade-100/70'}`}>
                    <span className={`font-semibold ${s.tone === '吉' ? 'text-jade-400' : s.tone === '凶' ? 'text-cinnabar-400' : 'text-jade-100/55'}`}>{s.label}：</span>{s.value}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 太岁流年神煞 */}
          {(() => {
            const taisui = calcTaisui(flowYear);
            return (
              <div className="rounded-card border border-cinnabar-500/20 bg-cinnabar-500/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-jade-100">太岁流年神煞</p>
                  <span className="text-[10px] text-cinnabar-400">{flowYear}年 · {taisui.yearZhi}年</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                  <div className="flex justify-between rounded bg-cinnabar-500/8 px-2 py-1"><span className="text-cinnabar-300">太岁</span><span className="text-jade-100/80">{taisui.taisui.direction}</span></div>
                  <div className="flex justify-between rounded bg-cinnabar-500/8 px-2 py-1"><span className="text-cinnabar-300">岁破</span><span className="text-jade-100/80">{taisui.suiPo.direction}</span></div>
                  <div className="flex justify-between rounded bg-cinnabar-500/8 px-2 py-1"><span className="text-cinnabar-300">三煞</span><span className="text-jade-100/80">{taisui.sanSha.zhiList.join('、')}</span></div>
                  <div className="flex justify-between rounded bg-cinnabar-500/8 px-2 py-1"><span className="text-cinnabar-300">五黄</span><span className="text-jade-100/80">{taisui.fiveYellow.direction}</span></div>
                </div>
                <div className="mt-2 space-y-1.5">
                  {taisui.recommendations.map((r, i) => (
                    <div key={i} className="rounded border border-cinnabar-500/15 bg-black/20 px-2.5 py-1.5 text-[11px] leading-4 text-jade-100/70">
                      <span className="font-semibold text-cinnabar-400">{r.label}：</span>{r.value}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {SHAPE_SHA.length > 0 && (
            <div className="rounded-card border border-white/8 bg-white/[0.035] p-4">
              <p className="text-sm font-semibold text-jade-100">形煞化解参考</p>
              <p className="mt-1 text-[11px] text-jade-100/45">常见外部形煞与内部形煞的形成、影响与化解法（综合各典）</p>
              <div className="mt-2.5 space-y-2">
                {SHAPE_SHA.map((sha) => (
                  <div key={sha.name} className="rounded border border-white/5 bg-black/30 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-jade-100">{sha.name}</span>
                      <span className={`text-[10px] ${sha.category === '外部形煞' ? 'text-gold-400' : 'text-purple-400'}`}>{sha.category}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-jade-100/55">{sha.form}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-cinnabar-300/70"><span className="text-cinnabar-400">影响：</span>{sha.effect}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-jade-300/70"><span className="text-jade-400">化解：</span>{sha.remedy}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
            八宅游年仅作传统文化学习与方位参考，不构成风水操作或决策建议。
          </p>

          <KnowledgeReferencePanel
            initialTerm={summary?.trigram ?? "生气"}
            terms={[summary?.trigram ?? "坎", "东四命", "西四命", "东四宅", "西四宅", "宅卦", "命宅相配", "生气", "天医", "延年", "伏位", "绝命", "五鬼", "六煞", "祸害"]}
            description="点击命卦、命组或游年星，查看八宅映射表与古籍索引线索。"
          />

          <TermExplanationPanel
            ready={ready}
            initialTerm={summary ? `${summary.trigram}卦` : "生气"}
            terms={[
              summary?.trigram ?? "坎", "东四命", "西四命", "东四宅", "西四宅", "宅卦", "命宅相配",
              "生气", "天医", "延年", "伏位", "绝命", "五鬼", "六煞", "祸害",
              "贪狼木星", "巨门土星", "武曲金星", "辅弼木星", "廉贞火星", "文曲水星", "破军金星",
              "路冲煞", "天斩煞", "壁刀煞", "镰刀煞", "镜煞", "梁压煞", "穿堂煞", "反弓煞",
              "八宅明镜", "阳宅三要",
            ]}
            description="点击术语查看八宅、九星古典名、形煞与典籍的通俗解释。"
          />
        </aside>

        <section className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-jade-50">八宅命盘</h3>
              <p className="mt-1 text-sm leading-6 text-jade-100/55">
                八宅命盘：八方向扇区，每扇区显示游年星、吉凶与含义，中心为命卦。
              </p>
            </div>
          </div>
          <div className="canvas-stage overflow-x-auto rounded-[20px] border border-jade-500/18 bg-ink-950/92 p-3">
            {grid ? (
              <ZoomableSvg title="八宅命盘">
                <EightMansionsChart grid={grid} year={year} gender={gender} />
              </ZoomableSvg>
            ) : (
              <LoadingSkeleton label="正在排盘" />
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
