import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { TermExplanationPanel } from '@/components/shared/TermExplanationPanel';
import { calculateWithLegacyAdapter } from '@/legacy/engineAdapters';
import { calculateQimen as calculateQimenPure } from '@/legacy/qimenEngine';
import { loadLegacyScripts } from '@/legacy/loadLegacyScripts';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import type { LegacyState } from '@/legacy/legacyGlobals';
import { useBirth } from '@/lib/birthContext';

/**
 * 奇门遁甲工作区
 * 3meta v2.6.0 真实时家奇门排盘：三奇六仪、九星、八门、八神、
 * 值符值使、空亡、马星、旺相休囚、十二长生、吉凶格局自动检测。
 * 3meta 未加载时回退简化排盘。文化学习参考。
 */

interface QimenPalace {
  position: number;
  trigram: string;
  palace: string;
  palaceNum: number;
  gate: string;
  gateLuck: string;
  star: string;
  starLuck: string;
  deity: string;
  godLuck: string;
  heavenlyStem: string;
  earthlyStem: string;
  earthBranch: string;
  fiveElements: string;
  status: { star: string; gate: string } | null;
  innerOuter: string;
  voidness: { hasVoidness: boolean; voidInPalace: string[] } | null;
  isZhiFu: boolean;
  isZhiShi: boolean;
  horse: boolean;
  auspiciousPatterns: string[];
  inauspiciousPatterns: string[];
  tenStemResponse: { heavenlyToEarthly: string; timeToDay: string } | null;
}

interface QimenResult {
  engineName: string;
  mode: string;
  confidenceNote: string;
  birthInfo: { year: number; month: number; day: number; hour: number };
  timeInfo: { yearGZ: string; monthGZ: string; dayGZ: string; hourGZ: string } | null;
  dun: string;
  ju: string;
  yuan: string;
  season: string;
  monthElement: string;
  zhiFu: { star: string; position: number; heavenlyStem?: string } | null;
  zhiShi: { gate: string; position: number } | null;
  palaces: QimenPalace[];
  auspiciousPatterns: string[];
  inauspiciousPatterns: string[];
  summary: string;
  _is3meta: boolean;
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
    // 优先用纯 TS 引擎（ESM 3meta，架构重构后推荐路径），失败回退旧 adapter
    try {
      return calculateQimenPure({ birth }) as unknown as QimenResult;
    } catch {
      return calculateWithLegacyAdapter<{ birth: typeof birth }, QimenResult>('qimen', { birth });
    }
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
      auspiciousPatterns: result?.auspiciousPatterns,
      inauspiciousPatterns: result?.inauspiciousPatterns,
      source: '3meta v2.6.0 + visual/js/engines/qimen-engine.js',
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
              3meta v2.6.0 时家奇门排盘（拆补法）：三奇六仪、九星、八门、八神、值符值使、空亡马星、旺相休囚、十二长生、吉凶格局自动检测。文化学习参考。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="qimen" title="奇门遁甲上下文" payload={contextPayload} />
            <ExportReportButton module="命盘" />
          </div>
        </div>
        {legacyState.mode === 'error' && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            引擎加载失败：{legacyState.error}
          </p>
        )}
      </div>

      {!ready && (
        <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-4 text-sm text-jade-100/55">
          <LoadingSkeleton label="正在加载奇门引擎" />
        </p>
      )}

      {result && (
        <div className="space-y-4">
          {/* 排盘概要 */}
          <div className="grid gap-4 md:grid-cols-2">
            <InterpretationCard
              title="排盘概要"
              badge={result.mode === 'local-exact' ? '3meta 真实排盘' : '简化排盘'}
              items={[
                { label: '阴阳遁', value: result.dun },
                { label: '局数', value: result.ju },
                ...(result.yuan ? [{ label: '元', value: result.yuan }] : []),
                ...(result.season ? [{ label: '季节', value: result.season }] : []),
                ...(result.monthElement ? [{ label: '月令五行', value: result.monthElement }] : []),
                ...(result.timeInfo ? [
                  { label: '年柱', value: result.timeInfo.yearGZ },
                  { label: '月柱', value: result.timeInfo.monthGZ },
                  { label: '日柱', value: result.timeInfo.dayGZ },
                  { label: '时柱', value: result.timeInfo.hourGZ },
                ] : []),
                { label: '值符', value: result.zhiFu ? `${result.zhiFu.star}（落${result.zhiFu.position}宫）` : '—' },
                { label: '值使', value: result.zhiShi ? `${result.zhiShi.gate}（落${result.zhiShi.position}宫）` : '—' },
                { label: '概要', value: result.summary },
              ]}
            />
            <InterpretationCard
              title="吉凶格局"
              badge={`${result.auspiciousPatterns.length + result.inauspiciousPatterns.length} 格局`}
              items={[
                ...(result.auspiciousPatterns.length > 0
                  ? [{ label: '吉格', value: result.auspiciousPatterns.join('、') }]
                  : [{ label: '吉格', value: '无' }]),
                ...(result.inauspiciousPatterns.length > 0
                  ? [{ label: '凶格', value: result.inauspiciousPatterns.join('、') }]
                  : [{ label: '凶格', value: '无' }]),
                { label: '说明', value: result.confidenceNote },
              ]}
            />
          </div>

          {/* 九宫排盘 */}
          <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-jade-50">九宫排盘</h3>
            <div className="grid grid-cols-3 gap-2">
              {result.palaces.map((p) => (
                <div
                  key={p.position}
                  className={`rounded-card border p-3 ${
                    p.isZhiFu
                      ? 'border-jade-500/40 bg-jade-500/8'
                      : p.isZhiShi
                        ? 'border-gold-500/30 bg-gold-500/6'
                        : 'border-white/8 bg-white/[0.02]'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-serif text-sm text-jade-100/70">{p.trigram}({p.position})</span>
                    <div className="flex gap-1">
                      {p.isZhiFu && <span className="rounded-full border border-jade-500/30 px-1.5 py-0.5 text-[9px] text-jade-400">符</span>}
                      {p.isZhiShi && <span className="rounded-full border border-gold-500/30 px-1.5 py-0.5 text-[9px] text-gold-400">使</span>}
                      {p.horse && <span className="rounded-full border border-cinnabar-500/30 px-1.5 py-0.5 text-[9px] text-cinnabar-400">马</span>}
                      {p.voidness?.hasVoidness && <span className="rounded-full border border-white/20 px-1.5 py-0.5 text-[9px] text-jade-100/55">空</span>}
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-jade-100/45">门：</span>
                      <span className={LUCK_COLOR[p.gateLuck] ?? 'text-jade-100/70'}>{p.gate}</span>
                    </div>
                    <div>
                      <span className="text-jade-100/45">星：</span>
                      <span className={LUCK_COLOR[p.starLuck] ?? 'text-jade-100/70'}>{p.star}</span>
                    </div>
                    <div>
                      <span className="text-jade-100/45">神：</span>
                      <span className={LUCK_COLOR[p.godLuck] ?? 'text-jade-100/70'}>{p.deity}</span>
                    </div>
                    {p.heavenlyStem && (
                      <div>
                        <span className="text-jade-100/45">天盘：</span>
                        <span className="text-jade-300/70">{p.heavenlyStem}</span>
                      </div>
                    )}
                    {p.earthlyStem && (
                      <div>
                        <span className="text-jade-100/45">地盘：</span>
                        <span className="text-jade-100/55">{p.earthlyStem}</span>
                      </div>
                    )}
                    {p.fiveElements && (
                      <div className="text-[10px] text-jade-100/55">
                        {p.fiveElements}
                        {p.status ? ` · 星${p.status.star} 门${p.status.gate}` : ''}
                        {p.innerOuter ? ` · ${p.innerOuter}` : ''}
                      </div>
                    )}
                    {p.tenStemResponse && (p.tenStemResponse.heavenlyToEarthly || p.tenStemResponse.timeToDay) && (
                      <div className="mt-1 border-t border-white/5 pt-1 text-[10px] leading-4 text-jade-100/55">
                        {p.tenStemResponse.heavenlyToEarthly && <div>{p.tenStemResponse.heavenlyToEarthly}</div>}
                        {p.tenStemResponse.timeToDay && <div>{p.tenStemResponse.timeToDay}</div>}
                      </div>
                    )}
                    {(p.auspiciousPatterns.length > 0 || p.inauspiciousPatterns.length > 0) && (
                      <div className="mt-1 border-t border-white/5 pt-1">
                        {p.auspiciousPatterns.map((pat, i) => (
                          <span key={`a${i}`} className="mr-1 text-[10px] text-jade-400">★{pat}</span>
                        ))}
                        {p.inauspiciousPatterns.map((pat, i) => (
                          <span key={`i${i}`} className="mr-1 text-[10px] text-cinnabar-400">✗{pat}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-jade-100/55">
              九宫按洛书序排布（坎1/坤2/震3/巽4/中5/乾6/兑7/艮8/离9）。
              <span className="text-jade-400"> 符</span>=值符所在宫，
              <span className="text-gold-400"> 使</span>=值使所在宫，
              <span className="text-cinnabar-400"> 马</span>=马星，
              <span className="text-jade-100/55"> 空</span>=空亡。
              天盘/地盘为三奇六仪天干；★吉格 ✗凶格为本宫检测到的格局。
            </p>
          </div>
        </div>
      )}

      {ready && (
        <TermExplanationPanel
          ready={ready}
          initialTerm="值符"
          terms={["值符","值使","八门","九星","八神","三奇六仪","休门","生门","伤门","杜门","景门","死门","惊门","开门","天蓬","天任","天冲","天辅","天英","天芮","天柱","天心","天禽","直符","腾蛇","太阴","六合","白虎","玄武","九地","九天","阳遁","阴遁","局数","空亡","马星"]}
          description="点击术语查看奇门遁甲通俗解释。"
        />
      )}
    </section>
  );
}
