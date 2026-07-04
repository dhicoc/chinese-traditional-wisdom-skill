import { useEffect, useMemo, useState } from 'react';
import { CanvasPanel } from '@/components/shared/CanvasPanel';
import { ControlField } from '@/components/shared/ControlField';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import {
  getBazhaiSummary,
  renderLegacyEightMansions,
  type EightMansionsData,
} from '@/legacy/canvasRenderers';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import type { LegacyState } from '@/legacy/legacyGlobals';

export function BazhaiWorkspace() {
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [year, setYear] = useState(1990);
  const [gender, setGender] = useState<'男' | '女'>('男');

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
  const data = useMemo<EightMansionsData>(() => ({ year, gender }), [year, gender]);
  const summary = useMemo(
    () => (ready ? getBazhaiSummary(year, gender) : null),
    [ready, year, gender],
  );

  const contextPayload = useMemo(
    () => ({
      module: 'bazhai',
      mode: 'legacy-canvas-react-shell',
      year,
      gender,
      mingGua: summary ?? null,
      source: 'visual/js/fengshui.js (renderEightMansions) + visual/js/core.js',
    }),
    [year, gender, summary],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-100">八宅大游年</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
              复用旧 fengshui.js 的八宅命盘 renderer，React 负责出生年与性别输入，与旧 visual/index.html 的 updateEightMansions() 规则一致。
            </p>
          </div>
          <CopyContextButton title="八宅大游年 React 迁移上下文" payload={contextPayload} />
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
              className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-jade-500/45"
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </ControlField>

          <div className="rounded-card border border-white/8 bg-white/[0.035] p-4">
            <p className="text-sm font-semibold text-zinc-100">命卦</p>
            {summary ? (
              <dl className="mt-3 space-y-2 text-sm text-zinc-400">
                <div className="flex justify-between gap-3"><dt>卦象</dt><dd className="text-zinc-100">{summary.trigram}卦</dd></div>
                <div className="flex justify-between gap-3"><dt>分组</dt><dd className="text-zinc-100">{summary.group}</dd></div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">等待旧引擎加载。</p>
            )}
          </div>

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-zinc-400">
            八宅游年仅作传统文化学习与方位参考，不构成风水操作或决策建议。
          </p>
        </aside>

        <CanvasPanel
          title="八宅命盘"
          description="与旧 visual/index.html 的 renderEightMansions 对齐，调用同一个 fengshui renderer。"
          data={data}
          width={500}
          height={500}
          ready={ready}
          render={renderLegacyEightMansions}
        />
      </div>
    </section>
  );
}
