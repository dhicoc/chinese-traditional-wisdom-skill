import { useMemo, useState } from 'react';
import { CanvasPanel } from '@/components/shared/CanvasPanel';
import { ControlField } from '@/components/shared/ControlField';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { MEIHUA_TRIGRAMS, renderLegacyMeihua, type MeihuaData } from '@/legacy/canvasRenderers';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import type { LegacyState } from '@/legacy/legacyGlobals';
import { useEffect } from 'react';

const NAME_MAP: Record<string, string> = {
  乾: '天',
  兑: '泽',
  离: '火',
  震: '雷',
  巽: '风',
  坎: '水',
  艮: '山',
  坤: '地',
};

const RELATION_OPTIONS = ['生', '克', '比和'] as const;

function trigramDisplay(name: string) {
  const found = MEIHUA_TRIGRAMS.find((item) => item.value === name);
  return {
    name,
    symbol: found?.symbol ?? '',
    nature: found?.nature ?? '',
  };
}

export function MeihuaWorkspace() {
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [upper, setUpper] = useState('坤');
  const [lower, setLower] = useState('乾');
  const [movingLine, setMovingLine] = useState(3);
  const [relation, setRelation] = useState<(typeof RELATION_OPTIONS)[number]>('生');

  useEffect(() => {
    let mounted = true;
    loadLegacyScripts().then((state) => {
      if (mounted) setLegacyState(state);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const data = useMemo<MeihuaData>(
    () => ({
      upperTrigram: trigramDisplay(upper),
      lowerTrigram: trigramDisplay(lower),
      changingLine: movingLine,
      mutualUpper: trigramDisplay('兑'),
      mutualLower: trigramDisplay('震'),
      bodyTrigram: lower,
      useTrigram: upper,
      bodyUseRelation: relation,
      hexagramName: `${NAME_MAP[upper]}${NAME_MAP[lower]}`,
      changingHexagramName: `${NAME_MAP[upper]}${NAME_MAP[lower]}（变）`,
    }),
    [upper, lower, movingLine, relation],
  );

  const contextPayload = useMemo(
    () => ({
      module: 'meihua',
      mode: 'legacy-canvas-react-shell',
      data,
      source: 'visual/js/divination.js (renderMeihua)',
    }),
    [data],
  );

  const ready = legacyState.mode === 'ready';

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">梅花易数</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              先复用旧 divination renderer，React 负责上下卦、动爻和体用关系输入，作为后续接入本地时间起卦与数字起卦规则的外壳。
            </p>
          </div>
          <CopyContextButton commandScope="meihua" title="梅花易数 React 迁移上下文" payload={contextPayload} />
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <ControlField label="上卦">
            <select
              value={upper}
              onChange={(event) => setUpper(event.target.value)}
              className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            >
              {MEIHUA_TRIGRAMS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </ControlField>

          <ControlField label="下卦">
            <select
              value={lower}
              onChange={(event) => setLower(event.target.value)}
              className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            >
              {MEIHUA_TRIGRAMS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </ControlField>

          <ControlField label="动爻">
            <select
              value={movingLine}
              onChange={(event) => setMovingLine(Number.parseInt(event.target.value, 10) || 3)}
              className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            >
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </ControlField>

          <ControlField label="体用关系">
            <select
              value={relation}
              onChange={(event) => setRelation(event.target.value as (typeof RELATION_OPTIONS)[number])}
              className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            >
              {RELATION_OPTIONS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </ControlField>
        </aside>

        <CanvasPanel
          title="本卦 · 互卦 · 变卦"
          description="与旧 visual/index.html 的 renderMeihua 对齐，调用同一个 divination renderer。"
          data={data}
          width={500}
          height={450}
          ready={ready}
          render={renderLegacyMeihua}
        />
      </div>
    </section>
  );
}
