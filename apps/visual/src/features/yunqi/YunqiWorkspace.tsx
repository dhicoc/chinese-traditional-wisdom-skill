import { useEffect, useMemo, useState } from 'react';
import { CanvasPanel } from '@/components/shared/CanvasPanel';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ControlField } from '@/components/shared/ControlField';
import { calculateLegacyYunqi, renderLegacyYunqi, type YunqiData } from '@/legacy/canvasRenderers';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import type { LegacyState } from '@/legacy/legacyGlobals';

export function YunqiWorkspace() {
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [year, setYear] = useState(2026);
  const [data, setData] = useState<YunqiData | null>(null);

  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (!mounted) return;
      setLegacyState(state);
      if (state.mode === 'ready') {
        setData(calculateLegacyYunqi(year));
      }
    });
    return () => {
      mounted = false;
    };
  }, [year]);

  useEffect(() => {
    if (legacyState.mode !== 'ready') return;
    setData(calculateLegacyYunqi(year));
  }, [legacyState.mode, year]);

  const ready = legacyState.mode === 'ready' && !!data;
  const contextPayload = useMemo(
    () => ({
      module: 'yunqi',
      mode: 'legacy-engine-and-canvas-react-shell',
      year,
      data,
      source: 'visual/js/engines/yunqi-engine.js + visual/js/health.js',
      medicalBoundary: '文化参考，不替代医疗诊断或治疗建议。',
    }),
    [year, data],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-100">五运六气</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
              复用旧 YunqiEngine 计算链路与 health renderer，验证 React Shell 对本地规则引擎和 Canvas 图表的双重兼容。
            </p>
          </div>
          <CopyContextButton title="五运六气 React 迁移上下文" payload={contextPayload} />
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
            <p className="text-sm font-semibold text-zinc-100">当前推算</p>
            {data ? (
              <dl className="mt-3 space-y-2 text-sm text-zinc-400">
                <div className="flex justify-between gap-3"><dt>干支</dt><dd className="text-zinc-100">{data.tiangan}{data.dizhi}</dd></div>
                <div className="flex justify-between gap-3"><dt>岁运</dt><dd className="text-zinc-100">{data.wuyun.dayun}</dd></div>
                <div className="flex justify-between gap-3"><dt>司天</dt><dd className="text-zinc-100">{data.liuqi.sitian}</dd></div>
                <div className="flex justify-between gap-3"><dt>在泉</dt><dd className="text-zinc-100">{data.liuqi.zaiquan}</dd></div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">等待旧引擎加载。</p>
            )}
          </div>

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-zinc-400">
            五运六气输出仅作传统文化和气候病机理论学习参考，不替代医学诊断。
          </p>
        </aside>

        <CanvasPanel
          title="岁运 · 司天 · 在泉"
          description="与旧 visual/index.html 的五运六气 Canvas renderer 对齐。"
          data={data}
          width={550}
          height={460}
          ready={ready}
          render={(canvasId, value) => {
            if (!value) return;
            renderLegacyYunqi(canvasId, value);
          }}
        />
      </div>
    </section>
  );
}
