import { useMemo, useState } from 'react';
import { getSolarEntry } from '@/legacy/solarEntry';
import { useBirth } from '@/lib/birthContext';
import { calcChenguz, type ChenguzResult } from '@/legacy/chenguzEngine';
import { CHENGUZ_VERSIONS, DEFAULT_CHENGUZ_VERSION, type ChenguzVersionId } from '@/legacy/chenguzVersions';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { toFourLayer, type ReadingLike } from '@/legacy/reportLayers';

/**
 * 袁天罡称骨算命工作区 — 用全局生辰直接算四柱骨重 + 称骨歌。
 * 支持多版本切换（称骨法无唯一正本，三版民间传抄本供选择）。
 */
export function ChenguzWorkspace() {
  const { solarBirth } = useBirth();
  const [versionId, setVersionId] = useState<ChenguzVersionId>(DEFAULT_CHENGUZ_VERSION);

  const result = useMemo<{ data: ChenguzResult | null; fourLayer: ReturnType<typeof toFourLayer> | null }>(() => {
    try {
      const solar = getSolarEntry() ?? null;
      const env = calcChenguz({
        birth: { year: solarBirth.year, month: solarBirth.month, day: solarBirth.day, hour: solarBirth.hour, minute: solarBirth.minute, gender: solarBirth.gender },
        solar,
        version: versionId,
      });
      return { data: env.data, fourLayer: toFourLayer(env.data.export_snapshot as ReadingLike) };
    } catch {
      return { data: null, fourLayer: null };
    }
  }, [solarBirth, versionId]);

  const r = result.data;
  const toneColor = r?.tone === '吉' ? 'text-jade-300' : r?.tone === '凶' ? 'text-red-300' : 'text-amber-300';
  const activeVersion = CHENGUZ_VERSIONS.find((v) => v.id === versionId) ?? CHENGUZ_VERSIONS[0];

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">袁天罡称骨算命</h2>
            <p className="text-sm text-jade-100/55">按出生年月日时查骨重 · 称骨歌定命格</p>
          </div>
          <span className="rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">民间算命</span>
        </div>
        <p className="mt-3 text-xs leading-5 text-jade-100/45">
          袁天罡称骨法：按农历年月日时查四柱骨重（两+钱），总重对应称骨歌一段，定命格轻重。骨越重命越贵，骨轻则多劳。用顶部全局生辰即可，无需额外输入。仅供文化参考。
        </p>

        {/* 版本选择器 */}
        <div className="mt-3 rounded-card border border-white/8 bg-ink-900/40 px-3 py-2">
          <p className="mb-1.5 text-xs font-semibold text-jade-100/70">称骨歌版本（无唯一正本，三版民间传抄本供选择）</p>
          <div className="flex flex-wrap gap-1.5">
            {CHENGUZ_VERSIONS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVersionId(v.id)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  v.id === versionId
                    ? 'border border-jade-500/50 bg-jade-500/20 text-jade-100'
                    : 'border border-white/10 bg-ink-900/60 text-jade-100/55 hover:border-jade-500/30 hover:text-jade-100/80'
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-jade-100/45">
            {activeVersion.note}
          </p>
        </div>
      </div>

      {/* 结果 */}
      {r && result.fourLayer && (
        <div className="space-y-4 ct-animate-fade-in">
          <InterpretationCard
            title={`称骨 · 总重${r.totalText}`}
            subtitle={`${r.tone === '吉' ? '骨重厚实' : r.tone === '凶' ? '骨轻多劳' : '中等'} · ${r.yearBone.branch}年 ${r.hourBone.branch}时 · ${r.versionName}`}
          >
            <div className="space-y-3">
              {/* 总重大字 */}
              <div className="flex items-center gap-4 rounded-card border border-white/8 bg-ink-900/40 px-4 py-4">
                <span className={`font-serif text-4xl font-bold ${toneColor}`}>{r.totalText}</span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${toneColor}`}>{r.tone === '吉' ? '福禄丰盈' : r.tone === '凶' ? '宜积德行善' : '先难后易'}</p>
                  <p className="text-xs text-jade-100/55">{r.interpretation}</p>
                </div>
              </div>

              {/* 四柱骨重 */}
              <div>
                <p className="mb-1 text-xs font-semibold text-jade-100/70">四柱骨重</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: `年（${r.yearBone.branch}）`, w: r.yearBone.weight },
                    { label: `月（农历${r.monthBone.lunarMonth}月）`, w: r.monthBone.weight },
                    { label: `日（农历${r.dayBone.lunarDay}）`, w: r.dayBone.weight },
                    { label: `时（${r.hourBone.branch}）`, w: r.hourBone.weight },
                  ].map((b) => (
                    <div key={b.label} className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-xs">
                      <p className="text-jade-300">{b.label}</p>
                      <p className="mt-1 font-mono text-lg text-jade-100">{b.w.liang}两{b.w.qian > 0 ? `${b.w.qian}钱` : ''}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-center text-xs text-jade-100/45">
                  {r.yearBone.weight.liang}两{r.yearBone.weight.qian}钱 + {r.monthBone.weight.liang}两{r.monthBone.weight.qian}钱 + {r.dayBone.weight.liang}两{r.dayBone.weight.qian}钱 + {r.hourBone.weight.liang}两{r.hourBone.weight.qian}钱 = <span className="font-bold text-jade-200">{r.totalText}</span>
                </p>
              </div>

              {/* 称骨歌 */}
              <div className="rounded-card border border-jade-500/20 bg-jade-500/5 px-4 py-3">
                <p className="text-xs font-semibold text-jade-300">称骨歌 · {r.totalText}</p>
                <p className="mt-2 font-serif text-sm leading-7 text-jade-100/80">{r.song}</p>
              </div>

              <div className="flex justify-end gap-2">
                <CopyContextButton
                  commandScope="chenguz"
                  title="称骨上下文"
                  payload={{
                    total: r.total,
                    totalText: r.totalText,
                    song: r.song,
                    interpretation: r.interpretation,
                    yearBone: r.yearBone,
                    monthBone: r.monthBone,
                    dayBone: r.dayBone,
                    hourBone: r.hourBone,
                    versionId: r.versionId,
                    versionName: r.versionName,
                    versionNote: r.versionNote,
                  }}
                />
                <ExportReportButton module="称骨" />
              </div>
            </div>
          </InterpretationCard>

          <FourLayerReport report={result.fourLayer} title={`称骨 · ${r.totalText} · 四层报告`} />
        </div>
      )}
    </div>
  );
}
