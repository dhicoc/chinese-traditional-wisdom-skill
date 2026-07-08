import { useEffect, useMemo, useState } from 'react';
import { ControlField } from '@/components/shared/ControlField';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { HexagramChart } from '@/components/shared/HexagramChart';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import type { LiuyaoData } from '@/legacy/canvasRenderers';
import type { LiuyaoLine } from '@/legacy/divinationTypes';
import { calculateWithLegacyAdapter } from '@/legacy/engineAdapters';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import type { LegacyState } from '@/legacy/legacyGlobals';
import { useBirth } from '@/lib/birthContext';
import { LIUYAO_INTENT_EVENT, type LiuyaoIntentDetail } from '@/lib/commandIntents';

type CastMethod = 'coin' | 'time' | 'manual';

interface LiuyaoResult extends LiuyaoData {
  palace?: string;
  palaceElement?: string;
  palaceIndex?: number;
  upperTrigram?: string;
  lowerTrigram?: string;
  dayStem?: string;
  changingYao?: number[];
  changingHexagramName?: string;
  changingHexagramNumber?: number;
  engineName?: string;
  mode?: string;
  confidenceNote?: string;
  lines: (LiuyaoLine & { stem?: string; branchElement?: string })[];
}

const METHOD_OPTIONS: { value: CastMethod; label: string; hint: string }[] = [
  { value: 'coin', label: '铜钱法', hint: '三枚铜钱摇六次，确定性 RNG' },
  { value: 'time', label: '时间起卦', hint: '按年月日时取数定卦与动爻' },
  { value: 'manual', label: '手动爻值', hint: '6 位 6-9 字符串(初→上)' },
];

const DEFAULT_FALLBACK: LiuyaoResult = {
  lines: [
    { yin: false, changing: false, branch: '子', relation: '子孙', god: '青龙', stem: '甲', branchElement: '水' },
    { yin: true, changing: false, branch: '寅', relation: '妻财', god: '朱雀', stem: '甲', branchElement: '木' },
    { yin: false, changing: true, branch: '辰', relation: '父母', god: '勾陈', stem: '甲', branchElement: '土' },
    { yin: true, changing: false, branch: '午', relation: '官鬼', god: '螣蛇', stem: '壬', branchElement: '火' },
    { yin: false, changing: false, branch: '申', relation: '兄弟', god: '白虎', stem: '壬', branchElement: '金' },
    { yin: true, changing: true, branch: '戌', relation: '父母', god: '玄武', stem: '壬', branchElement: '土' },
  ],
  hexagramName: '乾为天',
  hexagramNumber: 1,
  isOriginal: true,
  yongShen: '妻财',
  shiYao: 6,
  yingYao: 3,
  palace: '乾宫',
  palaceElement: '金',
  dayStem: '甲',
  changingYao: [3, 6],
  changingHexagramName: '坤为地',
  engineName: 'fallback',
  mode: 'fallback-demo',
  confidenceNote: '旧引擎未就绪时的降级演示结构，不作真实排盘结论。',
};

function isValidYaoValues(v: string) {
  return /^[6-9]{6}$/.test(v.replace(/\s/g, ''));
}

export function LiuyaoWorkspace() {
  const { birth } = useBirth();
  const [legacyState, setLegacyState] = useState<LegacyState>({ mode: 'loading' });
  const [method, setMethod] = useState<CastMethod>('coin');
  const [question, setQuestion] = useState('');
  const [yaoValues, setYaoValues] = useState('789789');
  const [castCount, setCastCount] = useState(0);

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
    function handleLiuyaoIntent(event: Event) {
      const detail = (event as CustomEvent<LiuyaoIntentDetail>).detail;
      if (!detail) return;

      if (detail.method) setMethod(detail.method);
      if (typeof detail.question === 'string') setQuestion(detail.question);
      if (detail.yaoValues && isValidYaoValues(detail.yaoValues)) {
        setYaoValues(detail.yaoValues.replace(/\s/g, ''));
        setMethod('manual');
      }
      if (detail.recast || detail.method === 'coin') {
        setCastCount((count) => count + 1);
      }
    }

    window.addEventListener(LIUYAO_INTENT_EVENT, handleLiuyaoIntent);
    return () => window.removeEventListener(LIUYAO_INTENT_EVENT, handleLiuyaoIntent);
  }, []);

  const ready = legacyState.mode === 'ready';

  const result = useMemo<LiuyaoResult>(() => {
    if (!ready) return DEFAULT_FALLBACK;
    const input: { method: CastMethod; question?: string; yaoValues?: string; seed?: number } = {
      method,
      question: question || undefined,
    };
    if (method === 'manual' && isValidYaoValues(yaoValues)) {
      input.yaoValues = yaoValues.replace(/\s/g, '');
    }
    if (method === 'coin') {
      input.seed = birth.year * 10000 + birth.month * 100 + birth.day + birth.hour + castCount * 7919;
    }
    const calculated = calculateWithLegacyAdapter<
      { birth: typeof birth; method: string; question?: string; yaoValues?: string; seed?: number },
      LiuyaoResult
    >('liuyao', { birth, ...input });
    return calculated ?? DEFAULT_FALLBACK;
  }, [ready, birth, method, question, yaoValues, castCount]);

  const changedLines = useMemo<LiuyaoData | null>(() => {
    if (!result.changingYao || result.changingYao.length === 0) return null;
    const lines = result.lines.map((l) => ({ ...l, yin: l.changing ? !l.yin : l.yin, changing: false }));
    return { ...result, lines, isOriginal: false, hexagramName: result.changingHexagramName ?? result.hexagramName };
  }, [result]);

  const isReal = result.mode === 'local-exact' || result.engineName === 'LocalLiuyaoNajiaAdapter';
  const palaceSummary = result.palace ? `${result.palace} · 五行${result.palaceElement ?? '?'}` : '—';

  const contextPayload = useMemo(
    () => ({
      module: 'liuyao',
      mode: result.mode ?? 'unknown',
      engineName: result.engineName,
      method,
      birth,
      question: question || '(未填写)',
      hexagram: result.hexagramName,
      changingHexagram: result.changingHexagramName,
      palace: result.palace,
      yongShen: result.yongShen,
      shiYao: result.shiYao,
      yingYao: result.yingYao,
      changingYao: result.changingYao,
      dayStem: result.dayStem,
      lines: result.lines,
      source: 'visual/js/engines/liuyao-engine.js + visual/js/divination.js (renderLiuyao)',
    }),
    [result, method, birth, question],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">六爻占卜</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              本地京房八宫纳甲引擎：起卦后输出纳甲(天干地支)、六亲、六神、世应、用神与变卦。
              支持铜钱法、时间起卦、手动爻值三种方式；用神依问题事项自动选取。
            </p>
          </div>
          <CopyContextButton commandScope="liuyao" title="六爻纳甲 React 上下文" payload={contextPayload} />
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
        <p className="mt-3 rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
          {result.confidenceNote ?? '六爻为传统文化占问参考，非绝对预测；同一事不宜反复起卦。'}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <ControlField label="起卦方式">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as CastMethod)}
              className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            >
              {METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.hint}
                </option>
              ))}
            </select>
          </ControlField>

          <ControlField label="占问事项（影响用神选取）" hint="可选">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="如：今日财运、能否升职、考试、病情"
              className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            />
          </ControlField>

          {method === 'manual' && (
            <ControlField label="爻值（初爻→上爻）" hint="6 位，6老阴/7少阳/8少阴/9老阳">
              <input
                value={yaoValues}
                onChange={(e) => setYaoValues(e.target.value)}
                inputMode="numeric"
                placeholder="789789"
                className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 font-mono text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
              />
            </ControlField>
          )}

          {method === 'coin' && (
            <button
              type="button"
              onClick={() => setCastCount((c) => c + 1)}
              className="w-full rounded-card border border-cinnabar-500/50 bg-cinnabar-500/20 px-4 py-2.5 text-sm font-semibold text-jade-50 transition hover:bg-cinnabar-500/30 active:scale-[0.99]"
            >
              再起一卦
            </button>
          )}

          <InterpretationCard
            title="卦象概要"
            badge={isReal ? '真实纳甲' : '降级演示'}
            items={[
              { label: '本卦', value: result.hexagramName },
              { label: '变卦', value: result.changingHexagramName ?? '—' },
              { label: '宫属', value: palaceSummary },
              { label: '世爻', value: `第${result.shiYao}爻` },
              { label: '应爻', value: `第${result.yingYao}爻` },
              { label: '用神', value: result.yongShen },
              { label: '动爻', value: result.changingYao && result.changingYao.length ? result.changingYao.join('、') : '无' },
              { label: '日干', value: result.dayStem ?? '?' },
            ]}
          />

          <p className="rounded-card border border-white/8 bg-black/24 p-3 text-xs leading-5 text-jade-100/40">
            生辰由顶部「全局生辰」统一管理。日干取自 lunar-javascript 精确历法，未加载时回退近似。用神规则：求财→妻财、求官/升职/官非/病→官鬼、考试/房屋→父母、子女/医药→子孙、合伙/朋友→兄弟。
          </p>
        </aside>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <section className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2">
                <div>
                  <h3 className="text-base font-semibold text-jade-50">本卦</h3>
                  <p className="mt-0.5 text-xs leading-5 text-jade-100/45">
                    京房纳甲：六神(左)、爻象、地支六亲(右)、世应标记。
                  </p>
                </div>
                <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2.5 py-1 text-[10px] text-jade-400">SVG · Phase 10</span>
              </div>
              <div className="canvas-stage overflow-x-auto rounded-[18px] border border-jade-500/18 bg-ink-950/92 p-3">
                {ready ? (
                  <ZoomableSvg title="本卦">
                    <HexagramChart data={result as LiuyaoData} />
                  </ZoomableSvg>
                ) : (
                  <p className="py-12 text-center text-sm text-jade-100/45">正在加载六爻引擎。</p>
                )}
              </div>
            </section>
            {changedLines ? (
              <section className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
                <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2">
                  <div>
                    <h3 className="text-base font-semibold text-jade-50">变卦</h3>
                    <p className="mt-0.5 text-xs leading-5 text-jade-100/45">动爻阴阳互变后的卦象。</p>
                  </div>
                  <span className="rounded-full border border-cinnabar-500/30 bg-cinnabar-500/10 px-2.5 py-1 text-[10px] text-cinnabar-400">变卦</span>
                </div>
                <div className="canvas-stage overflow-x-auto rounded-[18px] border border-jade-500/18 bg-ink-950/92 p-3">
                  <ZoomableSvg title="变卦">
                    <HexagramChart data={changedLines} />
                  </ZoomableSvg>
                </div>
              </section>
            ) : (
              <div className="flex min-h-[520px] items-center justify-center rounded-panel border border-dashed border-white/10 bg-black/16 p-6 text-center text-sm text-jade-100/45">
                无动爻，本卦即所占之卦。
              </div>
            )}
          </div>

          <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4">
            <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="text-base font-semibold text-jade-100">纳甲六爻明细</h3>
              <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] text-jade-100/45">
                从初爻到上爻
              </span>
            </div>
            <div className="overflow-hidden rounded-card border border-white/10">
              <div className="grid grid-cols-6 bg-white/[0.035] text-center text-[11px] text-jade-100/45">
                {['爻位', '阴阳', '纳甲(干支)', '五行', '六亲', '六神'].map((h) => (
                  <div key={h} className="border-b border-white/10 px-2 py-2">
                    {h}
                  </div>
                ))}
              </div>
              {result.lines.map((line, i) => {
                const yaoNum = i + 1;
                const isShi = result.shiYao === yaoNum;
                const isYing = result.yingYao === yaoNum;
                return (
                  <div
                    key={yaoNum}
                    className={`grid grid-cols-6 border-b border-white/8 text-center text-xs last:border-b-0 ${
                      line.changing ? 'bg-cinnabar-500/8' : 'bg-black/8'
                    }`}
                  >
                    <div className="px-2 py-2.5 text-jade-100/55">
                      {yaoNum}
                      {isShi && <span className="ml-1 text-jade-400">世</span>}
                      {isYing && <span className="ml-1 text-jade-400">应</span>}
                    </div>
                    <div className={`px-2 py-2.5 ${line.yin ? 'text-jade-100/70' : 'text-jade-400'}`}>
                      {line.yin ? '阴' : '阳'}
                      {line.changing && <span className="ml-1 text-cinnabar-500">动</span>}
                    </div>
                    <div className="px-2 py-2.5 font-mono text-jade-100">
                      {line.stem ?? '?'}
                      {line.branch}
                    </div>
                    <div className="px-2 py-2.5 text-jade-100/55">{line.branchElement ?? '?'}</div>
                    <div className="px-2 py-2.5 text-jade-100/70">{line.relation}</div>
                    <div className="px-2 py-2.5 text-jade-100/55">{line.god}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
