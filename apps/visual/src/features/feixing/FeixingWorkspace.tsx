import { useEffect, useMemo, useState } from 'react';
import { CanvasPanel } from '@/components/shared/CanvasPanel';
import { ControlField } from '@/components/shared/ControlField';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import {
  getFeixingSummary,
  renderLegacyFlyingStars,
  type FlyingStarsData,
} from '@/legacy/canvasRenderers';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import type { LegacyState } from '@/legacy/legacyGlobals';

export function FeixingWorkspace() {
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [year, setYear] = useState(2026);

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
  const data = useMemo<FlyingStarsData>(() => ({ year }), [year]);
  const summary = useMemo(() => (ready ? getFeixingSummary(year) : null), [ready, year]);

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
            <h2 className="font-serif text-2xl font-semibold text-zinc-100">流年飞星</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
              复用旧 fengshui.js 的九宫飞星 renderer，React 负责年份输入与中宫星摘要，与旧 visual/index.html 的 updateFlyingStars() 规则一致。
            </p>
          </div>
          <CopyContextButton title="流年飞星 React 迁移上下文" payload={contextPayload} />
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
            onChange={(event) => setYear(Number.parseInt(event.target.value, 10) || 2026)}
          />

          <div className="rounded-card border border-white/8 bg-white/[0.035] p-4">
            <p className="text-sm font-semibold text-zinc-100">中宫飞星</p>
            {summary ? (
              <dl className="mt-3 space-y-2 text-sm text-zinc-400">
                <div className="flex justify-between gap-3"><dt>星号</dt><dd className="text-zinc-100">{summary.centerStar}</dd></div>
                <div className="flex justify-between gap-3"><dt>星名</dt><dd className="text-zinc-100">{summary.starName}</dd></div>
                <div className="flex justify-between gap-3"><dt>五行</dt><dd className="text-zinc-100">{summary.wuxing}</dd></div>
                <div className="flex justify-between gap-3"><dt>吉凶</dt><dd className="text-zinc-100">{summary.luck}</dd></div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">等待旧引擎加载。</p>
            )}
          </div>

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-zinc-400">
            飞星布局仅作传统文化学习与方位参考，不构成风水操作或决策建议。
          </p>
        </aside>

        <CanvasPanel
          title="九宫飞星图"
          description="与旧 visual/index.html 的 renderFlyingStars 对齐，调用同一个 fengshui renderer。"
          data={data}
          width={350}
          height={350}
          ready={ready}
          render={renderLegacyFlyingStars}
        />
      </div>
    </section>
  );
}
