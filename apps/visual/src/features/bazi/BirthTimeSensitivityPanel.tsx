import { useMemo, useState } from 'react';
import { analyzeBaziTimeSensitivity } from '@/engine-api/bazi';
import { getSolarEntry } from '@/engine-api/calendar';
import { useBirth } from '@/lib/birthContext';

export function BirthTimeSensitivityPanel() {
  const { baziTimeStatus } = useBirth();
  const civilBirth = baziTimeStatus.status === 'true-solar-verified' ? baziTimeStatus.resolution.civilBirth : baziTimeStatus.civilBirth;
  const [open, setOpen] = useState(false);
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(23);
  const result = useMemo(() => {
    if (!open) return null;
    const { hour: _hour, minute: _minute, ...birth } = civilBirth;
    return analyzeBaziTimeSensitivity({ birth, startHour, endHour, solar: getSolarEntry() });
  }, [civilBirth, endHour, open, startHour]);

  return (
    <section data-testid="bazi-time-sensitivity" className="rounded-panel border border-gold-500/20 bg-gold-500/5 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-jade-50">出生时辰不确定性比较</h3>
          <p className="mt-1 text-xs leading-5 text-jade-100/55">比较候选时辰下稳定与变化的结构化字段；不校时、不反推，也不选择唯一出生时辰。</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="scroll-mt-48 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-xs font-semibold text-gold-300">{open ? '收起比较' : '开始比较'}</button>
      </div>
      {open && result && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-jade-100/60">起始小时（0-23）<input aria-label="候选起始小时" type="number" min={0} max={23} value={startHour} onChange={(event) => setStartHour(Math.min(23, Math.max(0, Number(event.target.value) || 0)))} className="mt-1 w-full rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-jade-100" /></label>
            <label className="text-xs text-jade-100/60">结束小时（0-23）<input aria-label="候选结束小时" type="number" min={0} max={23} value={endHour} onChange={(event) => setEndHour(Math.min(23, Math.max(0, Number(event.target.value) || 0)))} className="mt-1 w-full rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-jade-100" /></label>
          </div>
          <div>
            <p className="text-xs font-semibold text-jade-300">候选时辰（{result.candidates.length}）</p>
            <div className="mt-2 flex flex-wrap gap-2">{result.candidates.map((item) => <span key={item.shichen} className="rounded-full border border-white/10 px-3 py-1 text-xs text-jade-100/70">{item.shichen}时 · {item.hour}:00 · {item.pillars.hour}</span>)}</div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-card border border-jade-500/20 bg-jade-500/5 p-3"><p className="text-xs font-semibold text-jade-300">跨候选稳定</p><ul className="mt-2 space-y-1 text-xs text-jade-100/65">{result.stableFacts.map((fact) => <li key={fact.field}>{fact.label}：{fact.value}</li>)}</ul></div>
            <div className="rounded-card border border-gold-500/20 bg-gold-500/5 p-3"><p className="text-xs font-semibold text-gold-300">随时辰变化</p><ul className="mt-2 space-y-1 text-xs text-jade-100/65">{result.variableFacts.map((fact) => <li key={fact.field}>{fact.label}：{fact.values.length} 种结果</li>)}</ul></div>
          </div>
          <p className="text-xs leading-5 text-jade-100/45">{result.limitations[1]}</p>
        </div>
      )}
    </section>
  );
}
