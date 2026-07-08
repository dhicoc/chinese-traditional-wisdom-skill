import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ControlField } from '@/components/shared/ControlField';
import { RadarChart, type RadarAxis } from '@/components/shared/RadarChart';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import {
  deriveDominantConstitution,
  type ConstitutionScores,
} from '@/legacy/canvasRenderers';
import { CONSTITUTION_TYPES } from '@/legacy/baseTypes';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import type { LegacyState } from '@/legacy/legacyGlobals';

const DEFAULT_SCORES: ConstitutionScores = {
  平和质: 65,
  气虚质: 45,
  阳虚质: 30,
  阴虚质: 25,
  痰湿质: 50,
  湿热质: 35,
  血瘀质: 20,
  气郁质: 40,
  特禀质: 15,
};

export function ConstitutionWorkspace() {
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [scores, setScores] = useState<ConstitutionScores>(DEFAULT_SCORES);

  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (mounted) setLegacyState(state);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const dominant = useMemo(() => deriveDominantConstitution(scores), [scores]);
  const data = useMemo(() => ({ scores, dominant }), [scores, dominant]);
  const ready = legacyState.mode === 'ready';

  const radarAxes = useMemo<RadarAxis[]>(() => {
    return CONSTITUTION_TYPES.map((type) => ({ label: type, value: scores[type], max: 100 }));
  }, [scores]);
  const highlightIndex = useMemo(() => {
    if (!dominant) return undefined;
    const idx = CONSTITUTION_TYPES.indexOf(dominant);
    return idx >= 0 ? idx : undefined;
  }, [dominant]);
  const contextPayload = useMemo(
    () => ({
      module: 'tizhi',
      mode: 'legacy-canvas-react-shell',
      data,
      source: 'visual/js/health.js',
      medicalBoundary: '体质辨识仅作中医文化参考，不替代医疗诊断。',
    }),
    [data],
  );

  function updateScore(type: keyof ConstitutionScores, value: string) {
    setScores((current: ConstitutionScores) => ({ ...current, [type]: Number.parseInt(value, 10) || 0 }));
  }

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">体质辨识</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              复用旧 health renderer 的九种体质雷达图，用 React 状态驱动评分输入与主要体质派生。
            </p>
          </div>
          <CopyContextButton commandScope="tizhi" title="体质辨识 React 迁移上下文" payload={contextPayload} />
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <div className="rounded-card border border-jade-500/20 bg-jade-500/10 p-4">
            <p className="text-sm font-semibold text-jade-100">主要体质</p>
            <p className="mt-2 font-serif text-2xl text-jade-500">{dominant || '未识别'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CONSTITUTION_TYPES.map((type: keyof ConstitutionScores) => (
              <ControlField
                key={type}
                label={type}
                value={scores[type]}
                onChange={(event) => updateScore(type, event.target.value)}
                inputMode="numeric"
              />
            ))}
          </div>

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
            雷达图评分仅用于展示体质倾向，不构成医学判断或治疗建议。
          </p>
        </aside>

        <div className="rounded-panel border border-ink-700 bg-ink-850/60 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2">
            <h3 className="font-serif text-sm font-semibold text-jade-100/70">九种体质雷达图</h3>
            <span className="text-[10px] text-jade-100/45">Phase 10 · SVG</span>
          </div>
          <ZoomableSvg title="九种体质雷达图">
            <RadarChart
              axes={radarAxes}
              highlightIndex={highlightIndex}
              title="九种体质雷达图"
            />
          </ZoomableSvg>
          <p className="mt-3 text-center text-[10px] text-jade-100/40">
            与旧 visual/index.html 体质辨识默认评分规则对齐；金色顶点为主要体质。
          </p>
        </div>
      </div>
    </section>
  );
}
