import { useMemo, useState } from 'react';
import { ControlField } from '@/components/shared/ControlField';
import { FiveElementsChart } from '@/components/shared/FiveElementsChart';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { analyzeName, type NameAnalysis } from '@/legacy/nameWuxing';

/**
 * 姓名五行工作区
 * 基于康熙字典笔画 + 五格剖象法 + 三才配置吉凶。
 * 民俗文化参考，不构成命名建议。
 */

const LUCK_COLOR: Record<string, string> = {
  吉: 'border-jade-500/30 bg-jade-500/10 text-jade-400',
  大吉: 'border-jade-500/40 bg-jade-500/15 text-jade-300',
  凶: 'border-cinnabar-500/30 bg-cinnabar-500/10 text-cinnabar-400',
  半吉半凶: 'border-gold-500/30 bg-gold-500/10 text-gold-400',
};

export function NamewuxingWorkspace() {
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [analysis, setAnalysis] = useState<NameAnalysis | null>(null);

  const handleAnalyze = () => {
    const s = surname.trim();
    const g = givenName.trim();
    if (s && g) setAnalysis(analyzeName(s, g));
  };

  const wuxingStats = useMemo(() => {
    if (!analysis) return { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    return analysis.wuxingBalance as { 木: number; 火: number; 土: number; 金: number; 水: number };
  }, [analysis]);

  return (
    <div className="space-y-6" data-testid="workspace-namewuxing">
      {/* 头部说明 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">姓名五行</h2>
            <p className="text-sm text-jade-100/55">康熙笔画 · 五格剖象法 · 文化参考</p>
          </div>
          <span className="rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">
            民俗参考
          </span>
        </div>
      </div>

      {/* 输入区 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="grid gap-4 md:grid-cols-2">
          <ControlField label="姓氏" hint="支持复姓">
            <input
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="如：张 / 司马"
              maxLength={2}
              className="w-full min-w-0 rounded-lg border border-jade-500/20 bg-ink-900/80 px-3 py-2 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
            />
          </ControlField>
          <ControlField label="名字" hint="单字或双字">
            <input
              type="text"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              placeholder="如：伟 / 子涵"
              maxLength={2}
              className="w-full min-w-0 rounded-lg border border-jade-500/20 bg-ink-900/80 px-3 py-2 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
            />
          </ControlField>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!surname.trim() || !givenName.trim()}
          className="mt-4 rounded-lg bg-jade-500/20 px-4 py-2 text-sm font-medium text-jade-400 transition-colors hover:bg-jade-500/30 disabled:opacity-50"
        >
          分析五行
        </button>
      </div>

      {/* 分析结果 */}
      {analysis && (
        <div className="space-y-4">
          {/* 未收录提示 */}
          {analysis.hasUnrecorded && (
            <div className="rounded-card border border-gold-500/30 bg-gold-500/10 p-3 text-xs leading-5 text-gold-400">
              ⚠ 部分汉字未收录在内置康熙笔画表中，对应笔画为估算值（见下方字元列表标注）。如需精确结果，建议使用常见汉字或补充笔画数据。
            </div>
          )}

          {/* 字元笔画明细 */}
          <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-jade-50">字元笔画</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-xs text-jade-100/45">姓氏（{analysis.surnameChars.length} 字）</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.surnameChars.map((c, i) => (
                    <div key={i} className="rounded-card border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
                      <div className="font-serif text-lg text-jade-100/80">{c.char}</div>
                      <div className="mt-0.5 text-xs text-jade-100/55">
                        {c.strokes} 画 · 笔{c.wuxing}
                      </div>
                      {c.meaningWuxing && (
                        <div className="text-[10px] text-jade-300/70">字义{c.meaningWuxing}</div>
                      )}
                      {c.estimated && <div className="text-[10px] text-gold-400">估算</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-jade-100/45">名字（{analysis.givenChars.length} 字）</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.givenChars.map((c, i) => (
                    <div key={i} className="rounded-card border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
                      <div className="font-serif text-lg text-jade-100/80">{c.char}</div>
                      <div className="mt-0.5 text-xs text-jade-100/55">
                        {c.strokes} 画 · 笔{c.wuxing}
                      </div>
                      {c.meaningWuxing && (
                        <div className="text-[10px] text-jade-300/70">字义{c.meaningWuxing}</div>
                      )}
                      {c.estimated && <div className="text-[10px] text-gold-400">估算</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-between border-t border-white/5 pt-2 text-sm">
              <span className="text-jade-100/45">总笔画</span>
              <span className="font-semibold text-jade-100/80">{analysis.totalStrokes} 画</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* 五格数理 */}
            <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <h3 className="mb-3 text-base font-semibold text-jade-50">五格数理</h3>
              <div className="space-y-2">
                {analysis.wuGeEntries.map((e) => (
                  <div key={e.name} className="flex items-center justify-between rounded-card border border-white/5 bg-white/[0.02] px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="w-10 text-sm font-semibold text-jade-100/70">{e.name}</span>
                      <span className="font-mono text-lg text-jade-100/80">{e.value}</span>
                      <span className="text-xs text-jade-100/45">{e.wuxing}</span>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${LUCK_COLOR[e.luck] ?? ''}`}>
                      {e.luck}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-jade-100/35">
                天格=姓笔画+1；人格=姓末字+名首字；地格=名笔画和（单名+1）；外格=总格-人格+1；总格=全名笔画和。
              </p>
            </div>

            {/* 三才配置 */}
            <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <h3 className="mb-3 text-base font-semibold text-jade-50">三才配置</h3>
              <div className="grid grid-cols-3 gap-2">
                {['天格', '人格', '地格'].map((label, i) => {
                  const wx = analysis.sanCai.config[i];
                  return (
                    <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center">
                      <div className="mb-1 text-xs text-jade-100/45">{label}</div>
                      <div className="font-serif text-2xl text-jade-300">{wx}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 rounded-card border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-jade-100/45">配置吉凶</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${LUCK_COLOR[analysis.sanCai.luck] ?? 'text-jade-100/55'}`}>
                    {analysis.sanCai.luck}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-jade-100/55">{analysis.sanCai.desc}</p>
              </div>
            </div>
          </div>

          {/* 五行平衡（复用 FiveElementsChart） */}
          <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-jade-50">五行平衡</h3>
            <ZoomableSvg title="姓名五行平衡">
              <FiveElementsChart stats={wuxingStats} />
            </ZoomableSvg>
            <p className="mt-2 text-center text-[11px] text-jade-100/35">
              统计姓名各字五行分布；相生相克图供参考。
            </p>
          </div>
        </div>
      )}

      {/* 边界说明 */}
      <InterpretationCard title="使用说明" subtitle="文化参考">
        {analysis?.confidenceNote || '基于康熙字典笔画与五格剖象法推算；姓名学为传统文化参考，不构成命名决策依据。'}
      </InterpretationCard>
    </div>
  );
}
