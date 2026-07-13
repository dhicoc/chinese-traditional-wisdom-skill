import { useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { useBirth } from '@/lib/birthContext';
import { toFourLayer, type LayerReport, type ReadingLike } from '@/legacy/reportLayers';
import {
  calcAnnualFortuneCombo,
  calcDecisionCombo,
  calcSpaceTimeCombo,
  calcSanshiCombo,
  calcSanshiClassicCombo,
  calcDailyWellnessCombo,
  type ComboResult,
  type DailyWellnessResult,
} from '@/legacy/comboEngine';
import { DALIUREN_SCHOOLS, type DaliurenSchool } from '@/legacy/daliurenEngine';
import { QUESTIONNAIRE } from '@/legacy/constitutionQuestionnaire';
import type { ToolEnvelope } from '@/legacy/baseTypes';

/**
 * 联合分析工作区（ROADMAP 功能层增强 Step 1 的 Dashboard 入口）。
 *
 * 跨系统联合模块：
 * - 年度综合运势 = 八字 + 五运六气 + 奇门 + 命卦方位
 * - 事件决策 = 六爻 + 梅花 + 奇门（三卜交叉验证）
 * - 空间+时间 = 飞星 + 八宅命卦 + 奇门吉方
 * - 三式互参 = 大六壬 + 奇门 + 梅花
 * - 三式合一 = 奇门 + 太乙 + 大六壬
 * - 今日养生建议 = 体质 + 24节气 + 子午流注时辰 + 太岁/飞星方位
 *
 * 用全局生辰调对应 combo 函数，结果用 FourLayerReport 四层渲染 + 子系统卡片 + 一致性徽章。
 */

type ComboType = 'annual' | 'decision' | 'space' | 'sanshi' | 'sanshi-classic' | 'wellness';

const COMBO_OPTIONS: Array<{
  key: ComboType;
  label: string;
  desc: string;
  icon: string;
}> = [
  { key: 'annual', label: '年度综合运势', desc: '八字 + 五运六气 + 奇门 + 命卦方位', icon: '运' },
  { key: 'decision', label: '事件决策', desc: '六爻 + 梅花 + 奇门 三卜交叉验证', icon: '决' },
  { key: 'space', label: '空间 + 时间', desc: '飞星 + 八宅命卦 + 奇门吉方布局', icon: '堪' },
  { key: 'sanshi', label: '三式互参', desc: '大六壬 + 奇门 + 梅花 传统三式', icon: '式' },
  { key: 'sanshi-classic', label: '三式合一', desc: '奇门 + 太乙 + 大六壬 真正传统三式', icon: '叁' },
  { key: 'wellness', label: '今日养生建议', desc: '体质 + 24节气 + 时辰经络 + 方位', icon: '养' },
];

function getSolarEntry(): unknown {
  return typeof window !== 'undefined' ? (window as unknown as { Solar?: unknown }).Solar : undefined;
}

export function ComboWorkspace() {
  const { solarBirth } = useBirth();
  const [comboType, setComboType] = useState<ComboType>('wellness');
  const [question, setQuestion] = useState('今年整体运势如何？');
  const [targetYear, setTargetYear] = useState<number>(solarBirth.year);
  const [liurenSchool, setLiurenSchool] = useState<DaliurenSchool>('classic');
  const [constitution, setConstitution] = useState<string>('');

  const result = useMemo<{ envelope: ToolEnvelope<ComboResult> | null; loading: boolean }>(() => {
    const solar = getSolarEntry() ?? null;
    const birthInput = {
      year: solarBirth.year, month: solarBirth.month, day: solarBirth.day,
      hour: solarBirth.hour, minute: solarBirth.minute, gender: solarBirth.gender,
    };
    try {
      if (comboType === 'annual') {
        return { envelope: calcAnnualFortuneCombo({ birth: birthInput, targetYear, solar, currentMonth: new Date().getMonth() + 1 }), loading: false };
      }
      if (comboType === 'decision') {
        return { envelope: calcDecisionCombo({ birth: birthInput, question, solar }), loading: false };
      }
      if (comboType === 'sanshi') {
        return { envelope: calcSanshiCombo({ birth: birthInput, question, solar, liurenSchool: liurenSchool }), loading: false };
      }
      if (comboType === 'sanshi-classic') {
        return { envelope: calcSanshiClassicCombo({ birth: birthInput, question, solar, liurenSchool: liurenSchool }), loading: false };
      }
      if (comboType === 'wellness') {
        const d = new Date();
        return {
          envelope: calcDailyWellnessCombo({
            birth: birthInput,
            now: { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours() },
            constitution: constitution || undefined,
            targetYear: d.getFullYear(),
            solar,
          }) as unknown as ToolEnvelope<ComboResult>,
          loading: false,
        };
      }
      return { envelope: calcSpaceTimeCombo({ birth: birthInput, targetYear, solar }), loading: false };
    } catch {
      return { envelope: null, loading: false };
    }
  }, [comboType, solarBirth, question, targetYear, liurenSchool, constitution]);

  const fourLayer = useMemo<LayerReport | null>(() => {
    if (!result.envelope) return null;
    return toFourLayer(result.envelope.data.export_snapshot as ReadingLike);
  }, [result.envelope]);

  const data = result.envelope?.data as (ComboResult | DailyWellnessResult) | undefined;
  const birthSummary = `${solarBirth.year}-${String(solarBirth.month).padStart(2, '0')}-${String(solarBirth.day).padStart(2, '0')} ${String(solarBirth.hour).padStart(2, '0')}:00 ${solarBirth.gender}`;

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="console-panel rounded-[22px] border border-purple-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">联合分析</h2>
            <p className="text-sm text-jade-100/55">跨系统综合分析 · 一致性检验 · 四层报告</p>
          </div>
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-400">多系统联合</span>
        </div>
        <p className="mt-3 text-xs leading-5 text-jade-100/45">
          把多个排盘结果聚合为联合分析，输出整合结论 + 各系统依据 + 一致性检验。三系统同向→置信度高，有分歧→标注权衡。
        </p>
      </div>

      {/* combo 类型选择 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COMBO_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setComboType(opt.key)}
            className={`group flex items-center gap-3 rounded-panel border p-3 text-left transition ${
              comboType === opt.key
                ? 'border-purple-500/45 bg-purple-500/10'
                : 'border-ink-700 bg-ink-850/60 hover:border-purple-500/25 hover:bg-ink-850/80'
            }`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border font-serif text-base transition ${
              comboType === opt.key
                ? 'border-purple-500/40 bg-purple-500/15 text-purple-300'
                : 'border-jade-500/25 bg-jade-500/10 text-jade-400'
            }`}>
              {opt.icon}
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${comboType === opt.key ? 'text-purple-200' : 'text-jade-100'}`}>{opt.label}</p>
              <p className="mt-0.5 truncate text-xs text-jade-100/45">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* 输入区 */}
      <div className="console-panel rounded-[22px] border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3">
          <p className="text-sm font-semibold text-jade-100">输入参数</p>
        </div>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="text-jade-100/55">生辰：<span className="font-mono text-jade-100">{birthSummary}</span></span>
          </div>
          {(comboType === 'annual' || comboType === 'space') && (
            <label className="flex items-center gap-2 text-sm text-jade-100/70">
              <span className="text-jade-100/55">欲测年份</span>
              <input
                type="number"
                min={1900}
                max={2100}
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value) || solarBirth.year)}
                className="w-24 rounded-lg border border-jade-500/20 bg-ink-900/80 px-2 py-1 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
              />
            </label>
          )}
          {(comboType === 'decision' || comboType === 'sanshi' || comboType === 'sanshi-classic') && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-jade-100/55">求测事项</span>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="如：今年适合换工作吗"
                className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
              />
            </label>
          )}
          {comboType === 'wellness' && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-jade-100/55">体质类型（可选，不填则按五运六气倾向推断）</span>
              <select
                value={constitution}
                onChange={(e) => setConstitution(e.target.value)}
                className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
              >
                <option value="">按出生年五运六气倾向推断</option>
                {QUESTIONNAIRE.map((g) => (
                  <option key={g.type} value={g.type}>{g.type}（{g.direction}）</option>
                ))}
                <option value="平和质">平和质（阴阳气血调和）</option>
              </select>
              <span className="text-[10px] text-jade-100/35">建议先到「体质辨识」完成问卷自评，得到主体质后回此选择，建议更精准。</span>
            </label>
          )}
          {(comboType === 'sanshi' || comboType === 'sanshi-classic') && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-jade-100/55">大六壬天将流派</span>
              <select
                value={liurenSchool}
                onChange={(e) => setLiurenSchool(e.target.value as DaliurenSchool)}
                className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
              >
                {(Object.keys(DALIUREN_SCHOOLS) as DaliurenSchool[]).map((s) => (
                  <option key={s} value={s}>{DALIUREN_SCHOOLS[s].name}</option>
                ))}
              </select>
              <span className="text-[10px] text-jade-100/35">{DALIUREN_SCHOOLS[liurenSchool].note}</span>
            </label>
          )}
        </div>
      </div>

      {/* 结果区 */}
      {result.loading && <LoadingSkeleton label="联合分析计算中" />}
      {!result.loading && !data && (
        <InterpretationCard title="暂无结果" subtitle="请确认生辰后重试">
          <p className="text-sm text-jade-100/55">联合分析需要完整生辰信息，请在顶部「全局生辰」面板填写。</p>
        </InterpretationCard>
      )}
      {!result.loading && data && fourLayer && (
        <div className="space-y-4">
          {/* 子系统卡片（wellness 无一致性检验，走养生维度展示） */}
          {comboType === 'wellness' ? (
            <InterpretationCard
              title="养生维度"
              subtitle="体质 · 节气 · 时辰 · 方位"
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {data.subsystems.map((s) => (
                  <div key={s.name} className="rounded-card border border-jade-500/20 bg-jade-500/5 px-3 py-2">
                    <span className="text-xs font-medium text-jade-300">{s.name}</span>
                    <p className="mt-1 text-[11px] leading-4 text-jade-100/60">{s.summary}</p>
                  </div>
                ))}
              </div>
            </InterpretationCard>
          ) : (
            <InterpretationCard
              title="子系统结果"
              badge={`置信度${(data as ComboResult).consistency.confidence}`}
              subtitle={(data as ComboResult).consistency.aligned ? '多系统方向一致' : '多系统有分歧，已标注权衡'}
            >
              <div className="grid gap-2 sm:grid-cols-3">
                {data.subsystems.map((s) => {
                  const tone = (s as { tone?: string }).tone;
                  return (
                    <div key={s.name} className={`rounded-card border px-3 py-2 ${
                      tone === '吉' ? 'border-jade-500/30 bg-jade-500/8'
                      : tone === '凶' ? 'border-cinnabar-500/30 bg-cinnabar-500/8'
                      : 'border-white/10 bg-white/5'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-jade-100/70">{s.name}</span>
                        <span className={`text-[10px] font-semibold ${
                          tone === '吉' ? 'text-jade-300' : tone === '凶' ? 'text-cinnabar-300' : 'text-jade-100/55'
                        }`}>{tone === '吉' ? '偏吉' : tone === '凶' ? '偏凶' : '平稳'}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-jade-100/55">{s.summary}</p>
                    </div>
                  );
                })}
              </div>
              {!(data as ComboResult).consistency.aligned && (data as ComboResult).consistency.conflicts.length > 0 && (
                <div className="mt-2 rounded-card border border-cinnabar-500/20 bg-cinnabar-500/8 px-3 py-2">
                  <p className="text-xs text-cinnabar-300/80">⚠️ 分歧：{(data as ComboResult).consistency.conflicts.join('；')}</p>
                </div>
              )}
            </InterpretationCard>
          )}

          {/* 四层报告 */}
          <div className="console-panel rounded-[22px] border border-purple-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <FourLayerReport report={fourLayer} title={`${data.comboName} · 四层报告`} />
          </div>

          {/* 复制上下文 */}
          <div className="flex justify-end">
            <CopyContextButton
              commandScope="combo"
              title="联合分析上下文"
              payload={{
                comboName: data.comboName,
                comboType,
                birth: { year: solarBirth.year, gender: solarBirth.gender },
                targetYear: comboType !== 'decision' ? targetYear : undefined,
                question: (comboType === 'decision' || comboType === 'sanshi' || comboType === 'sanshi-classic') ? question : undefined,
                constitution: comboType === 'wellness' ? constitution || undefined : undefined,
                synthesis: data.synthesis,
                ...(comboType === 'wellness' ? {} : { consistency: (data as ComboResult).consistency }),
                subsystems: data.subsystems.map((s) => ({
                  name: s.name,
                  tone: (s as { tone?: string }).tone,
                  summary: s.summary,
                })),
              }}
            />
            <ExportReportButton module={data.comboName} />
          </div>
        </div>
      )}
    </div>
  );
}
