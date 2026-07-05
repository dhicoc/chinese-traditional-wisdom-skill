import { useEffect, useMemo, useState } from 'react';
import { CanvasPanel } from '@/components/shared/CanvasPanel';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { KnowledgeReferencePanel } from '@/components/shared/KnowledgeReferencePanel';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { renderLegacyCompass } from '@/legacy/canvasRenderers';
import type { LegacyState } from '@/legacy/legacyGlobals';

const COMPASS_CONTEXT = {
  module: 'fengshui',
  mode: 'legacy-canvas-react-shell',
  source: 'visual/js/fengshui.js (renderCompass)',
  notes: [
    '二十四山与八卦方位来自旧版风水 renderer。',
    '当前页面聚焦罗盘本体，不带坐向输入。',
  ],
};

export function FengshuiWorkspace() {
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
  const contextPayload = useMemo(() => COMPASS_CONTEXT, []);

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-100">风水罗盘</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
              复用旧 fengshui.js 的二十四山罗盘 renderer。React 只负责工作区结构、上下文复制和后续扩展入口。
            </p>
          </div>
          <CopyContextButton commandScope="fengshui" title="风水罗盘 React 迁移上下文" payload={contextPayload} />
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <div className="rounded-card border border-white/8 bg-white/[0.035] p-4">
            <p className="text-sm font-semibold text-zinc-100">当前视图</p>
            <p className="mt-2 text-sm text-zinc-400">二十四山、八卦与四正方位静态罗盘。</p>
          </div>
          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-zinc-400">
            罗盘展示仅作传统文化学习与方位认知参考，不构成实地勘测或布局建议。
          </p>

          <KnowledgeReferencePanel
            initialTerm="坎"
            terms={["坎", "离", "二十四山", "壬", "子", "癸", "反弓煞"]}
            description="点击罗盘术语或输入山名，查看二十四山、形煞与古籍索引引用。"
          />
        </aside>

        <CanvasPanel
          title="二十四山罗盘"
          description="与旧 visual/index.html 的 renderCompass 对齐，调用同一个 fengshui renderer。"
          data={null}
          width={500}
          height={500}
          ready={ready}
          render={(canvasId) => renderLegacyCompass(canvasId)}
        />
      </div>
    </section>
  );
}
