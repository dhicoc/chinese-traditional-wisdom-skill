import { useEffect, useMemo, useState } from 'react';
import { CanvasPanel } from '@/components/shared/CanvasPanel';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { renderDataWithLegacyAdapter, calculateWithLegacyAdapter } from '@/legacy/engineAdapters';
import { renderLegacyBazi, renderLegacyWuxing, type BaziPillars, type WuxingStats } from '@/legacy/canvasRenderers';
import type { BirthData } from '@/legacy/birthBridge';
import type { LegacyState } from '@/legacy/legacyGlobals';
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

interface BaziResult {
  pillars?: unknown;
  elements?: Partial<WuxingStats>;
  dayMaster?: string;
  dayMasterWuxing?: string;
  engineName?: string;
  mode?: string;
  confidenceNote?: string;
}

function calculateBazi(birth: BirthData, ready: boolean) {
  if (!ready) {
    return { result: null, pillars: { ...DEFAULT_PILLARS, gender: birth.gender }, wuxing: DEFAULT_WUXING };
  }
  const result = calculateWithLegacyAdapter<BirthData, BaziResult>('bazi', birth);
  const renderData = result ? renderDataWithLegacyAdapter<BirthData, BaziResult, BaziPillars>('bazi', result, birth) : null;
  return {
    result,
    pillars: renderData ?? { ...DEFAULT_PILLARS, gender: birth.gender },
    wuxing: { ...DEFAULT_WUXING, ...(result?.elements ?? {}) },
  };
}

export function BaziWorkspace() {
  const { birth } = useBirth();
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });

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
  const { result, pillars, wuxing } = useMemo(() => calculateBazi(birth, ready), [birth, ready]);
  const contextPayload = useMemo(
    () => ({
      module: 'bazi',
      mode: result?.mode ?? 'fallback-demo',
      engineName: result?.engineName ?? '等待旧引擎',
      birth,
      pillars,
      wuxing,
      source: 'visual/js/engine-adapters.js + visual/js/bazi.js',
    }),
    [birth, pillars, result, wuxing],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-100">八字命盘与五行平衡</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
              React 工作区读取顶部全局生辰，优先调用 BaziEngine / lunar-javascript Adapter 生成四柱与五行，再复用旧 Canvas renderer。
            </p>
          </div>
          <CopyContextButton commandScope="bazi" title="八字命盘 React 迁移上下文" payload={contextPayload} />
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <InterpretationCard
            title="全局生辰推算"
            items={[
              { label: '引擎', value: result?.engineName ?? '等待旧引擎'},
              { label: '模式', value: result?.mode ?? '降级展示'},
              { label: '日主', value: (result?.dayMaster ?? pillars.dayMaster ?? '?') + ' · ' + (result?.dayMasterWuxing ?? '?')},
              { label: '说明', value: result?.confidenceNote ?? '请在顶部“全局生辰”面板修改出生资料。'},
            ]}
          />
        </aside>

        <div className="space-y-4">
          <CanvasPanel
            title="八字四柱"
            description="由统一 Adapter 计算，再调用同一个 bazi renderer。"
            data={pillars}
            width={600}
            height={480}
            ready={ready}
            render={renderLegacyBazi}
          />
          <CanvasPanel
            title="五行平衡"
            description="五行统计来自同一次八字计算，避免 React 页与旧页口径分叉。"
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
