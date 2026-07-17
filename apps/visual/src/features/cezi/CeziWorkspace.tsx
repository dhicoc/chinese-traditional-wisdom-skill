import { useMemo, useState } from 'react';
import { getSolarEntry } from '@/legacy/solarEntry';
import { useBirth } from '@/lib/birthContext';
import { calcCezi, type CeziResult } from '@/legacy/ceziEngine';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { toFourLayer, type ReadingLike } from '@/legacy/reportLayers';

type CeziAspect = '事业' | '感情' | '财利' | '健康' | '综合';

/**
 * 测字工作区 — 输入一个字，分析笔画数理/字义五行/字形结构/偏旁象义/八字用神补益。
 * 民间最常用占卜方式，象数 + 字义结合。
 */
export function CeziWorkspace() {
  const { solarBirth } = useBirth();
  const [char, setChar] = useState('明');
  const [aspect, setAspect] = useState<CeziAspect>('综合');
  const [useBazi, setUseBazi] = useState(true);

  const result = useMemo<{ data: CeziResult | null; fourLayer: ReturnType<typeof toFourLayer> | null }>(() => {
    if (!char.trim()) return { data: null, fourLayer: null };
    try {
      const solar = getSolarEntry() ?? null;
      const data = calcCezi({
        char,
        aspect,
        birth: useBazi ? { year: solarBirth.year, month: solarBirth.month, day: solarBirth.day, hour: solarBirth.hour, minute: solarBirth.minute, gender: solarBirth.gender } : undefined,
        solar,
      });
      return { data, fourLayer: toFourLayer(data.export_snapshot as ReadingLike) };
    } catch {
      return { data: null, fourLayer: null };
    }
  }, [char, aspect, useBazi, solarBirth]);

  const r = result.data;
  const toneColor = r?.tone === '吉' ? 'text-jade-300' : r?.tone === '凶' ? 'text-red-300' : 'text-amber-300';

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">测字 · 字占</h2>
            <p className="text-sm text-jade-100/55">一笔一画皆有象 · 象数 + 字义占卜</p>
          </div>
          <span className="rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">民间占卜</span>
        </div>
        <p className="mt-3 text-xs leading-5 text-jade-100/45">
          输入一个字，看笔画数理、字义五行、字形结构与偏旁象义。可选结合八字用神，判断该字对事业/感情的影响与起名建议。仅供文化参考。
        </p>
      </div>

      {/* 输入区 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3">
          <p className="text-sm font-semibold text-jade-100">输入</p>
        </div>
        <div className="mt-3 space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-jade-100/55">所测之字（取首字）</span>
            <input
              type="text"
              value={char}
              onChange={(e) => setChar(e.target.value.slice(0, 4))}
              placeholder="输入一个汉字"
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-lg text-jade-100 outline-none transition focus:border-jade-500/45"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-jade-100/55">问题方向</span>
            <select
              value={aspect}
              onChange={(e) => setAspect(e.target.value as CeziAspect)}
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            >
              {(['综合', '事业', '感情', '财利', '健康'] as CeziAspect[]).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-jade-100/70">
            <input type="checkbox" checked={useBazi} onChange={(e) => setUseBazi(e.target.checked)} className="rounded border-white/20 bg-ink-900" />
            <span>结合八字用神（当前生辰：{solarBirth.year}-{String(solarBirth.month).padStart(2, '0')}-{String(solarBirth.day).padStart(2, '0')}）</span>
          </label>
        </div>
      </div>

      {/* 结果 */}
      {r && result.fourLayer && (
        <div className="space-y-4 ct-animate-fade-in">
          <InterpretationCard
            title={`测「${r.char}」字 · ${r.tone === '吉' ? '吉' : r.tone === '凶' ? '凶' : '中'}`}
            subtitle={`康熙${r.strokes}画 · 数理${r.shuli.lucky}（${r.shuli.skyNine}）${r.charWuxing ? ` · 属${r.charWuxing}` : ''} · ${r.structure.structure}`}
          >
            <div className="space-y-3">
              {/* 大字 + 定调 */}
              <div className="flex items-center gap-4 rounded-card border border-white/8 bg-ink-900/40 px-4 py-3">
                <span className="font-serif text-5xl text-jade-100">{r.char}</span>
                <div className="flex-1">
                  <p className={`text-lg font-bold ${toneColor}`}>{r.tone === '吉' ? '吉' : r.tone === '凶' ? '凶' : '中平'}</p>
                  <p className="text-xs text-jade-100/55">{r.shuli.skyNine} · {r.shuli.comment}</p>
                </div>
              </div>

              {/* 笔画数理 + 五行 + 结构 三栏 */}
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-xs">
                  <p className="font-semibold text-jade-300">笔画数理</p>
                  <p className="mt-1 text-jade-100/60">康熙 {r.strokes} 画{r.strokesEstimated ? '（估算）' : ''}</p>
                  <p className="text-jade-100/55">数理{r.shuli.lucky}</p>
                </div>
                <div className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-xs">
                  <p className="font-semibold text-jade-300">字义五行</p>
                  <p className="mt-1 text-jade-100/60">{r.charWuxing ? `属${r.charWuxing}` : '未收录'}</p>
                  <p className="text-jade-100/45 line-clamp-2">{r.meaning ? r.meaning.slice(0, 40) + (r.meaning.length > 40 ? '…' : '') : '字义未录'}</p>
                </div>
                <div className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-xs">
                  <p className="font-semibold text-jade-300">字形结构</p>
                  <p className="mt-1 text-jade-100/60">{r.structure.structure}</p>
                  <p className="text-jade-100/45">{r.structure.symbolism.split('，')[0]}</p>
                </div>
              </div>

              {/* 八字用神补益 */}
              {r.baziComplement && (
                <div className="rounded-card border border-jade-500/20 bg-jade-500/5 px-3 py-2 text-xs">
                  <p className="font-semibold text-jade-300">八字用神补益</p>
                  <p className="mt-1 text-jade-100/60">日主{r.baziComplement.dayMaster} · 用神{r.baziComplement.xiyongShen} · <span className={r.baziComplement.complement === '补用神' ? 'text-jade-300' : r.baziComplement.complement === '克耗' ? 'text-red-300' : 'text-amber-300'}>{r.baziComplement.complement}</span>（补益度{r.baziComplement.score}）</p>
                  <p className="text-jade-100/55">{r.baziComplement.detail}</p>
                </div>
              )}

              {/* 事业/感情/改字建议 */}
              <div className="space-y-1.5 text-xs">
                <p className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-jade-100/60"><span className="text-jade-300">事业影响：</span>{r.careerAdvice}</p>
                <p className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-jade-100/60"><span className="text-jade-300">感情影响：</span>{r.loveAdvice}</p>
                <p className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-jade-100/60"><span className="text-jade-300">改字/起名建议：</span>{r.nameAdvice}</p>
              </div>

              <div className="flex justify-end gap-2">
                <CopyContextButton
                  commandScope="cezi"
                  title="测字上下文"
                  payload={{
                    char: r.char,
                    strokes: r.strokes,
                    shuli: r.shuli,
                    charWuxing: r.charWuxing,
                    structure: r.structure.structure,
                    baziComplement: r.baziComplement,
                    synthesis: r.synthesis,
                  }}
                />
                <ExportReportButton module="测字" />
              </div>
            </div>
          </InterpretationCard>

          <FourLayerReport report={result.fourLayer} title={`测「${r.char}」字 · 四层报告`} />
        </div>
      )}
    </div>
  );
}
