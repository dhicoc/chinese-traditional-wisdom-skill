import { useMemo, useState } from 'react';
import { executeBaziConsultation, type BaziConsultationResult } from '@/engine-api/consultation';
import { getSolarEntry } from '@/engine-api/calendar';
import type { ModuleId } from '@/lib/modules';
import { getModuleById } from '@/lib/modules';
import { useBirth } from '@/lib/birthContext';
import { planAgentParameters, type AgentParameterPlan, type PlannedToolCandidate } from '@/legacy/agentParameterPlanner';
import type { BaziBirth } from '@/legacy/baziEngine';
import { TOOL_WORKSPACE_MAP, WIZARD_FIELD_LABELS } from './wizardFieldRegistry';

interface ConsultationWorkspaceProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

function missingLabel(field: string): string {
  return WIZARD_FIELD_LABELS[field] ?? field;
}

function CandidateCard({ candidate, selected, onSelect }: { candidate: PlannedToolCandidate; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={`rounded-card border p-3 text-left transition ${selected ? 'border-jade-400/50 bg-jade-500/12' : 'border-white/10 bg-black/20 hover:border-jade-500/25'}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm font-semibold text-jade-100">{candidate.tool}</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-jade-100/50">{candidate.source}</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-jade-100/55">{candidate.reason}</p>
      <p className="mt-2 text-[11px] text-gold-300/75">{candidate.missingInputs.length ? `还需 ${candidate.missingInputs.length} 项输入` : '必填字段名称已齐全'}</p>
    </button>
  );
}

export function ConsultationWorkspace({ onSelectModule }: ConsultationWorkspaceProps) {
  const { solarBirth } = useBirth();
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState<AgentParameterPlan | null>(null);
  const [selectedTool, setSelectedTool] = useState<PlannedToolCandidate['tool'] | null>(null);
  const [birth, setBirth] = useState<BaziBirth>(() => ({ ...solarBirth }));
  const [civilConfirmed, setCivilConfirmed] = useState(false);
  const [result, setResult] = useState<BaziConsultationResult | null>(null);
  const [error, setError] = useState('');

  const selectedCandidate = useMemo(() => plan?.candidates.find((candidate) => candidate.tool === selectedTool) ?? null, [plan, selectedTool]);

  function createPlan() {
    setError('');
    setResult(null);
    if (!query.trim()) { setPlan(null); setSelectedTool(null); setError('请先描述希望了解的传统文化主题或计算目标。'); return; }
    const next = planAgentParameters({ query });
    setPlan(next);
    setSelectedTool(next.candidates[0]?.tool ?? null);
  }

  function reset() {
    setQuery(''); setPlan(null); setSelectedTool(null); setResult(null); setError(''); setCivilConfirmed(false); setBirth({ ...solarBirth });
  }

  function calculateBazi() {
    setError(''); setResult(null);
    if (!civilConfirmed) { setError('请先确认本次按民用出生记录计算；向导不会自行生成真太阳时。'); return; }
    try {
      setResult(executeBaziConsultation({ birth, timeBasis: 'civil-unverified', civilFallbackConfirmed: true, solar: getSolarEntry() }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '本次本地计算未能完成。');
    }
  }

  return (
    <section data-testid="consultation-wizard" className="space-y-4">
      <header className="rounded-panel border border-jade-500/20 bg-ink-850/80 p-5 shadow-instrument">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-jade-400">P4 · Guided Consultation</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-jade-50">统一咨询向导</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/60">用自然语言生成本地方案、查看缺失参数，并进入对应工具。第一阶段可在本页直接完成八字结构化事实计算，其余工具一键转交既有工作区。</p>
        <p className="mt-2 text-xs text-gold-200/70">查询和表单值只保留在当前页面内存中；不会写入历史或 localStorage。</p>
      </header>

      <section className="rounded-panel border border-white/10 bg-black/20 p-4" aria-labelledby="consult-query-heading">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="min-w-0 flex-1 text-xs text-jade-100/60" id="consult-query-heading">您想了解什么？
            <textarea data-testid="consultation-query" value={query} onChange={(event) => { setQuery(event.target.value); setPlan(null); setSelectedTool(null); setResult(null); setError(''); }} rows={3} maxLength={500} placeholder="例如：我想了解自己的事业方向" className="mt-1 w-full resize-y rounded-card border border-white/10 bg-ink-950 px-3 py-2 text-sm leading-6 text-jade-100 outline-none focus:border-jade-500/40" />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="rounded-card border border-white/10 px-4 py-2 text-xs text-jade-100/60">重置</button>
            <button type="button" onClick={createPlan} className="rounded-card border border-jade-500/40 bg-jade-500/15 px-4 py-2 text-xs font-semibold text-jade-100">生成本地方案</button>
          </div>
        </div>
      </section>

      {error && <p role="alert" className="rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 px-4 py-3 text-sm text-cinnabar-200">{error}</p>}

      {plan && (
        <>
          <section data-testid="consultation-plan" className="rounded-panel border border-white/10 bg-ink-900/55 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><p className="text-[10px] uppercase tracking-wider text-jade-100/40">路径</p><p className="mt-1 text-sm text-jade-100">{plan.routeKind}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-jade-100/40">建议深度</p><p className="mt-1 text-sm text-jade-100">{plan.suggestedDepth}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-jade-100/40">目标模块</p><p className="mt-1 text-sm text-jade-100">{plan.routeTarget.module ? getModuleById(plan.routeTarget.module).title : '待进一步说明'}</p></div>
            </div>
            <p className="mt-3 text-xs leading-5 text-jade-100/55">{plan.routeTarget.reason}</p>
            {plan.riskNotices.length > 0 && <ul className="mt-3 rounded-card border border-gold-500/20 bg-gold-500/5 p-3 text-xs leading-5 text-gold-100/75">{plan.riskNotices.map((notice) => <li key={notice}>· {notice}</li>)}</ul>}
          </section>

          {plan.candidates.length === 0 ? (
            <section className="rounded-panel border border-jade-500/20 bg-jade-500/5 p-4">
              <h3 className="text-sm font-semibold text-jade-100">本次不需要排盘工具</h3>
              <p className="mt-2 text-xs leading-5 text-jade-100/60">可进入知识模块查阅原文、术语与文化背景。</p>
              {plan.routeTarget.module && <button type="button" onClick={() => onSelectModule(plan.routeTarget.module!)} className="mt-3 rounded-card border border-jade-500/30 px-4 py-2 text-xs text-jade-200">打开{getModuleById(plan.routeTarget.module).title}</button>}
            </section>
          ) : (
            <section className="rounded-panel border border-white/10 bg-black/20 p-4">
              <h3 className="text-sm font-semibold text-jade-100">候选工具</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">{plan.candidates.map((candidate) => <CandidateCard key={candidate.tool} candidate={candidate} selected={selectedTool === candidate.tool} onSelect={() => { setSelectedTool(candidate.tool); setResult(null); setError(''); }} />)}</div>
            </section>
          )}
        </>
      )}

      {selectedCandidate && selectedCandidate.tool !== 'bazi_calculate' && (
        <section data-testid="consultation-handoff" className="rounded-panel border border-gold-500/20 bg-gold-500/5 p-4">
          <h3 className="text-sm font-semibold text-gold-200">准备转交：{selectedCandidate.tool}</h3>
          <p className="mt-2 text-xs text-jade-100/60">预计需要：{selectedCandidate.requiredInputKeys.map(missingLabel).join('、') || '无额外必填字段'}。</p>
          <button type="button" onClick={() => onSelectModule(TOOL_WORKSPACE_MAP[selectedCandidate.tool])} className="mt-3 rounded-card border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-xs font-semibold text-gold-100">打开{getModuleById(TOOL_WORKSPACE_MAP[selectedCandidate.tool]).title}</button>
        </section>
      )}

      {selectedCandidate?.tool === 'bazi_calculate' && (
        <section data-testid="consultation-bazi-form" className="rounded-panel border border-jade-500/20 bg-jade-500/5 p-4">
          <h3 className="text-sm font-semibold text-jade-100">补齐八字输入</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ['year', '出生年', 1900, 2100], ['month', '出生月', 1, 12], ['day', '出生日', 1, 31], ['hour', '出生小时', 0, 23], ['minute', '出生分钟', 0, 59],
            ] as const).map(([field, label, min, max]) => <label key={field} className="text-xs text-jade-100/60">{label}<input aria-label={`向导${label}`} type="number" min={min} max={max} value={birth[field] ?? 0} onChange={(event) => setBirth((current) => ({ ...current, [field]: Math.min(max, Math.max(min, Number(event.target.value) || min)) }))} className="mt-1 w-full rounded-card border border-white/10 bg-ink-950 px-3 py-2 text-jade-100" /></label>)}
            <label className="text-xs text-jade-100/60">性别<select aria-label="向导性别" value={birth.gender === '女' ? '女' : '男'} onChange={(event) => setBirth((current) => ({ ...current, gender: event.target.value }))} className="mt-1 w-full rounded-card border border-white/10 bg-ink-950 px-3 py-2 text-jade-100"><option>男</option><option>女</option></select></label>
          </div>
          <label className="mt-4 flex items-start gap-2 rounded-card border border-gold-500/20 bg-gold-500/5 p-3 text-xs leading-5 text-jade-100/65"><input aria-label="确认使用民用时间" type="checkbox" checked={civilConfirmed} onChange={(event) => setCivilConfirmed(event.target.checked)} className="mt-1" /><span>我确认本次按民用出生记录计算，并了解“未完成真太阳时复核”。向导不会自行生成经度、时区或夏令时证据。</span></label>
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={calculateBazi} className="rounded-card border border-jade-500/35 bg-jade-500/15 px-4 py-2 text-xs font-semibold text-jade-100">运行本地八字计算</button><button type="button" onClick={() => onSelectModule('bazi')} className="rounded-card border border-white/10 px-4 py-2 text-xs text-jade-100/60">需要真太阳时？打开八字工作区</button></div>
        </section>
      )}

      {result && (
        <section data-testid="consultation-result" className="rounded-panel border border-jade-500/25 bg-ink-850/85 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-serif text-lg font-semibold text-jade-50">已核验结构化结果</h3><span className="rounded-full border border-jade-500/30 px-2 py-1 text-[10px] text-jade-300">{result.mode} · facts verified</span></div>
          <p className="mt-2 text-sm leading-6 text-jade-100/75">{result.presentation.summary}</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{result.verifiedFacts.map((fact) => <div key={`${fact.label}-${fact.value}`} className="rounded-card border border-white/8 bg-black/20 px-3 py-2"><dt className="text-[10px] text-jade-100/40">{fact.label}</dt><dd className="mt-1 text-sm text-jade-100">{fact.value}</dd></div>)}</dl>
          <ul className="mt-4 space-y-1 text-xs leading-5 text-gold-100/65">{[...result.presentation.limitations, ...result.presentation.disclaimers].map((text) => <li key={text}>· {text}</li>)}</ul>
        </section>
      )}
    </section>
  );
}
