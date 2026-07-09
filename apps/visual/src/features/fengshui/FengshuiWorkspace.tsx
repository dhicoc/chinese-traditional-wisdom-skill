import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { FengshuiCompass } from '@/components/shared/FengshuiCompass';
import { KnowledgeReferencePanel } from '@/components/shared/KnowledgeReferencePanel';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { DataModeBadge } from '@/components/shared/DataModeBadge';
import type { LegacyState } from '@/legacy/legacyGlobals';

const COMPASS_CONTEXT = {
  module: 'fengshui',
  mode: 'legacy-canvas-react-shell',
  source: 'visual/js/fengshui.js (renderCompass)',
  notes: [
    '二十四山与八卦方位静态参考。',
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
            <h2 className="font-serif text-2xl font-semibold text-jade-100">风水罗盘</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              二十四山罗盘方位参考图。
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
            <p className="text-sm font-semibold text-jade-100">当前视图</p>
            <p className="mt-2 text-sm text-jade-100/55">二十四山、八卦与四正方位静态罗盘。</p>
          </div>
          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
            罗盘展示仅作传统文化学习与方位认知参考，不构成实地勘测或布局建议。
          </p>

          <KnowledgeReferencePanel
            initialTerm="坎"
            terms={["坎", "离", "二十四山", "壬", "子", "癸", "反弓煞"]}
            description="点击罗盘术语或输入山名，查看二十四山、形煞与古籍索引引用。"
          />
        </aside>

        <section className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-jade-50">二十四山罗盘</h3>
              <p className="mt-1 text-sm leading-6 text-jade-100/55">
                三环罗盘：外环二十四山、中环八卦符号、内环八方向，中心十字定方位。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-fit rounded-full border border-jade-500/25 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">
              </span>
              <DataModeBadge mode="knowledge" ready={ready} />
            </div>
          </div>
          <div className="canvas-stage overflow-x-auto rounded-[20px] border border-jade-500/18 bg-ink-950/92 p-3">
            {ready ? (
              <ZoomableSvg title="二十四山罗盘">
                <FengshuiCompass />
              </ZoomableSvg>
            ) : (
              <LoadingSkeleton label="正在加载风水引擎" />
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
