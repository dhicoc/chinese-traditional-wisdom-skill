import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { calculateWithLegacyAdapter } from '@/legacy/engineAdapters';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import type { LegacyState } from '@/legacy/legacyGlobals';
import { useBirth } from '@/lib/birthContext';

/**
 * 奇门遁甲工作区
 * 简化时家奇门排盘：按年月日时定局，九宫排布八门、九星、八神。
 * 文化学习参考，非专业奇门排盘。
 */

interface QimenResult {
  engineName: string;
  mode: string;
  confidenceNote: string;
  birthInfo: { year: number; month: number; day: number; hour: number };
  timeGanZhi: string;
  dun: string;
  ju: string;
  palaces: {
    palace: string;
    palaceNum: number;
    door: string;
    doorLuck: string;
    star: string;
    starLuck: string;
    god: string;
    godLuck: string;
  }[];
  zhiFu: string;
  zhiShi: string;
  summary: string;
}

const LUCK_COLOR: Record<string, string> = {
  大吉: 'text-jade-300',
  吉: 'text-jade-400',
  中平: 'text-jade-100/55',
  凶: 'text-cinnabar-400',
  大凶: 'text-cinnabar-300',
};

export function QimenWorkspace() {
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
  const result = useMemo<QimenResult | null>(() => {
    if (!ready) return null;
    return calculateWithLegacyAdapter<{ birth: typeof birth }, QimenResult>('qimen', { birth });
  }, [ready, birth]);

  const contextPayload = useMemo(
    () => ({
      module: 'qimen',
      mode: result?.mode ?? 'loading',
      engineName: result?.engineName,
      birth,
      dun: result?.dun,
      ju: result?.ju,
      zhiFu: result?.zhiFu,
      zhiShi: result?.zhiShi,
      source: 'visual/js/engines/qimen-engine.js',
    }),
    [result, birth],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">奇门遁甲</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              简化时家奇门排盘：按年月日时取数定局，阴阳遁按月份近似，九宫排布八门、九星、八神，输出值符值使与吉凶方位。
            </p>
          </div>
          <CopyContextButton commandScope="qimen" title="奇门遁甲上下文" payload={contextPayload} />
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            旧引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      {!ready && (
        <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-4 text-sm text-jade-100/55">
          正在加载奇门引擎。
        </p>
      )}

      {result && (
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <InterpretationCard
              title="排盘概要"
              badge={result.mode}
              items={[
                { label: '阴阳遁', value: result.dun },
                { label: '局数', value: result.ju },
                { label: '时辰干支', value: result.timeGanZhi },
                { label: '值符', value: result.zhiFu },
                { label: '值使', value: result.zhiShi },
                { label: '概要', value: result.summary },
                { label: '说明', value: result.confidenceNote },
              ]}
            />
          </aside>

          <div className="space-y-4">
            <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <h3 className="mb-3 text-base font-semibold text-jade-50">九宫排盘</h3>
              <div className="grid grid-cols-3 gap-2">
                {result.palaces.map((p) => (
                  <div
                    key={p.palaceNum}
                    className="rounded-card border border-white/8 bg-white/[0.02] p-3"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-serif text-sm text-jade-100/70">{p.palace}({p.palaceNum})</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="text-jade-100/45">门：</span>
                        <span className={LUCK_COLOR[p.doorLuck] ?? 'text-jade-100/70'}>{p.door}</span>
                      </div>
                      <div>
                        <span className="text-jade-100/45">星：</span>
                        <span className={LUCK_COLOR[p.starLuck] ?? 'text-jade-100/70'}>{p.star}</span>
                      </div>
                      <div>
                        <span className="text-jade-100/45">神：</span>
                        <span className={LUCK_COLOR[p.godLuck] ?? 'text-jade-100/70'}>{p.god}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-jade-100/35">
                九宫按洛书序排布（坎1/坤2/震3/巽4/中5/乾6/兑7/艮8/离9）；门/星/神吉凶按传统口径标注。简化排盘非专业奇门，仅作文化参考。
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
