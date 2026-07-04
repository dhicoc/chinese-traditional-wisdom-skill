import { useEffect, useMemo, useState } from 'react';
import { CanvasPanel } from '@/components/shared/CanvasPanel';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ControlField } from '@/components/shared/ControlField';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { renderLegacyBazi, renderLegacyWuxing, type BaziPillars, type WuxingStats } from '@/legacy/canvasRenderers';
import type { LegacyState } from '@/legacy/legacyGlobals';

const DEFAULT_PILLARS: BaziPillars = {
  year: { stem: '甲', branch: '辰' },
  month: { stem: '丙', branch: '寅' },
  day: { stem: '戊', branch: '午' },
  hour: { stem: '庚', branch: '申' },
  dayMaster: '戊',
  gender: '男',
};

const DEFAULT_WUXING: WuxingStats = { 木: 2, 火: 3, 土: 1, 金: 0, 水: 2 };
const PILLAR_FIELDS = [
  ['year', '年柱'],
  ['month', '月柱'],
  ['day', '日柱'],
  ['hour', '时柱'],
] as const;

export function BaziWorkspace() {
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [pillars, setPillars] = useState(DEFAULT_PILLARS);
  const [wuxing, setWuxing] = useState(DEFAULT_WUXING);

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
  const contextPayload = useMemo(
    () => ({
      module: 'bazi',
      mode: 'legacy-canvas-react-shell',
      pillars,
      wuxing,
      source: 'visual/js/core.js + visual/js/bazi.js',
    }),
    [pillars, wuxing],
  );

  function updatePillar(key: keyof Pick<BaziPillars, 'year' | 'month' | 'day' | 'hour'>, value: string) {
    const normalized = value.trim().slice(0, 2);
    const stem = normalized[0] || '';
    const branch = normalized[1] || '';
    setPillars((current: BaziPillars) => ({
      ...current,
      [key]: { ...current[key], stem, branch },
      dayMaster: key === 'day' && stem ? stem : current.dayMaster,
    }));
  }

  function updateWuxing(key: keyof WuxingStats, value: string) {
    setWuxing((current: WuxingStats) => ({ ...current, [key]: Number.parseInt(value, 10) || 0 }));
  }

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-100">八字命盘与五行平衡</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
              Sprint 2 先复用旧版 Canvas renderer。React 负责状态、布局和上下文导出，绘制逻辑仍来自稳定的 visual/js/bazi.js。
            </p>
          </div>
          <CopyContextButton title="八字命盘 React 迁移上下文" payload={contextPayload} />
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <div>
            <p className="text-sm font-semibold text-zinc-200">四柱输入</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {PILLAR_FIELDS.map(([key, label]) => (
                <ControlField
                  key={key}
                  label={label}
                  value={`${pillars[key].stem}${pillars[key].branch}`}
                  onChange={(event) => updatePillar(key, event.target.value)}
                />
              ))}
            </div>
          </div>

          <ControlField label="性别">
            <select
              value={pillars.gender}
              onChange={(event) => setPillars((current: BaziPillars) => ({ ...current, gender: event.target.value }))}
              className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-jade-500/45"
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </ControlField>

          <div>
            <p className="text-sm font-semibold text-zinc-200">五行评分</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {(Object.keys(wuxing) as Array<keyof WuxingStats>).map((key) => (
                <ControlField
                  key={String(key)}
                  label={String(key)}
                  value={wuxing[key]}
                  onChange={(event) => updateWuxing(key, event.target.value)}
                  inputMode="numeric"
                />
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <CanvasPanel
            title="八字四柱"
            description="与旧 visual/index.html 的默认八字输入对齐，调用同一个 bazi renderer。"
            data={pillars}
            width={600}
            height={480}
            ready={ready}
            render={renderLegacyBazi}
          />
          <CanvasPanel
            title="五行平衡"
            description="复用旧五行五芒星 renderer，用 React 状态驱动输入。"
            data={wuxing}
            width={520}
            height={460}
            ready={ready}
            render={renderLegacyWuxing}
          />
        </div>
      </div>
    </section>
  );
}
