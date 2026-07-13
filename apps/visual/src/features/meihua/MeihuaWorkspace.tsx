import { useEffect, useMemo, useState } from 'react';
import { ControlField } from '@/components/shared/ControlField';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { MeihuaChart } from '@/components/shared/MeihuaChart';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { MEIHUA_TRIGRAMS, type MeihuaData } from '@/legacy/canvasRenderers';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import type { LegacyState } from '@/legacy/legacyGlobals';
import { MEIHUA_INTENT_EVENT, type MeihuaIntentDetail } from '@/lib/commandIntents';

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

  useEffect(() => {
    function handleMeihuaIntent(event: Event) {
      const detail = (event as CustomEvent<MeihuaIntentDetail>).detail;
      if (!detail) return;

      if (detail.upper && MEIHUA_TRIGRAMS.some((item) => item.value === detail.upper)) {
        setUpper(detail.upper);
      }
      if (detail.lower && MEIHUA_TRIGRAMS.some((item) => item.value === detail.lower)) {
        setLower(detail.lower);
      }
      if (typeof detail.movingLine === 'number') {
        setMovingLine(Math.min(6, Math.max(1, Math.trunc(detail.movingLine))));
      }
      if (detail.relation && (RELATION_OPTIONS as readonly string[]).includes(detail.relation)) {
        setRelation(detail.relation);
      }
    }

    window.addEventListener(MEIHUA_INTENT_EVENT, handleMeihuaIntent);
    return () => window.removeEventListener(MEIHUA_INTENT_EVENT, handleMeihuaIntent);
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
      fortuneLevel: relation === '生' ? '大吉' : relation === '克' ? '大凶' : '平顺',
      fortuneDetail: relation === '生' ? '用生体，事可成' : relation === '克' ? '用克体，受阻' : '比和，平顺',
      strategy: relation === '生' ? '进——有利可图，宜主动出击' : relation === '克' ? '守——受制之象，宜静观待变' : '顺——和顺之象，稳步推进',
      bodyGuaDe: '顺（柔顺承载）',
      useGuaDe: '健（刚健不息）',
      cuoTrigram: { upper: '坤', lower: '乾', name: '地天' },
      zongTrigram: { upper: '乾', lower: '坤', name: '天地' },
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
              选择上下卦、动爻和体用关系，查看本卦、互卦、变卦与体用生克。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="meihua" title="梅花易数 React 迁移上下文" payload={contextPayload} />
            <ExportReportButton module="梅花易数" />
          </div>
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧加载失败：{legacyState.error}
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <ControlField label="上卦">
            <select
              value={upper}
              onChange={(event) => setUpper(event.target.value)}
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900/60 backdrop-blur-md px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
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
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900/60 backdrop-blur-md px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
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
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900/60 backdrop-blur-md px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
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
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900/60 backdrop-blur-md px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            >
              {RELATION_OPTIONS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </ControlField>
        </aside>

        <section className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-jade-50">本卦 · 互卦 · 变卦</h3>
              <p className="mt-1 text-sm leading-6 text-jade-100/55">
                本卦·互卦·变卦：上下卦爻象、动爻标记、体用生克关系。
              </p>
            </div>
          </div>
          <div className="canvas-stage overflow-x-auto rounded-[20px] border border-jade-500/18 bg-ink-950/92 p-3">
            {ready ? (
              <ZoomableSvg title="梅花易数 本卦·互卦·变卦">
                <MeihuaChart data={data} />
              </ZoomableSvg>
            ) : (
              <LoadingSkeleton label="正在排盘" />
            )}
          </div>

          {/* 梅花增强：吉凶分级 + 策略 + 卦德 + 错卦综卦 */}
          {data.fortuneLevel && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className={`rounded-card border p-3 ${
                data.fortuneLevel === '大吉' ? 'border-jade-500/30 bg-jade-500/8' :
                data.fortuneLevel === '大凶' ? 'border-cinnabar-500/30 bg-cinnabar-500/8' :
                'border-white/8 bg-white/[0.02]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-jade-100/70">吉凶判断</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    data.fortuneLevel === '大吉' ? 'border-jade-500/40 text-jade-300' :
                    data.fortuneLevel === '大凶' ? 'border-cinnabar-500/40 text-cinnabar-300' :
                    data.fortuneLevel === '可成' ? 'border-jade-500/30 text-jade-400' :
                    data.fortuneLevel === '不利' ? 'border-gold-500/30 text-gold-400' :
                    'border-white/10 text-jade-100/55'
                  }`}>{data.fortuneLevel}</span>
                </div>
                {data.fortuneDetail && <p className="mt-1.5 text-xs leading-5 text-jade-100/55">{data.fortuneDetail}</p>}
                {data.strategy && (
                  <p className="mt-1.5 text-xs leading-5 text-jade-400">
                    策略：{data.strategy}
                  </p>
                )}
              </div>

              <div className="rounded-card border border-white/8 bg-white/[0.02] p-3">
                <span className="text-sm font-semibold text-jade-100/70">卦德</span>
                <div className="mt-1.5 space-y-1 text-xs">
                  {data.bodyGuaDe && <div><span className="text-jade-400">体卦</span><span className="ml-2 text-jade-100/55">{data.bodyGuaDe}</span></div>}
                  {data.useGuaDe && <div><span className="text-jade-400">用卦</span><span className="ml-2 text-jade-100/55">{data.useGuaDe}</span></div>}
                </div>
                {data.cuoTrigram?.name && (
                  <div className="mt-2 border-t border-white/5 pt-1.5 text-xs">
                    <span className="text-jade-100/45">错卦：</span>
                    <span className="text-jade-100/70">{data.cuoTrigram.name}</span>
                    <span className="ml-1 text-[10px] text-jade-100/35">（阴阳互换，事物的对立面）</span>
                  </div>
                )}
                {data.zongTrigram?.name && (
                  <div className="mt-0.5 text-xs">
                    <span className="text-jade-100/45">综卦：</span>
                    <span className="text-jade-100/70">{data.zongTrigram.name}</span>
                    <span className="ml-1 text-[10px] text-jade-100/35">（上下颠倒，另一角度）</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
