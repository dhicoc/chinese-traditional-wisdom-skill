import { useEffect, useState } from 'react';
import type { RuleComparisonDomain, RuleComparisonResult, StructuredValue } from '@/engine-api/ruleComparison';
import { getSolarEntry } from '@/engine-api/calendar';
import { useBirth } from '@/lib/birthContext';

const DOMAIN_OPTIONS: Array<{ id: RuleComparisonDomain; label: string }> = [
  { id: 'bazi-shensha', label: '八字神煞' },
  { id: 'chenguz-version', label: '称骨版本' },
  { id: 'daliuren-school', label: '大六壬流派' },
  { id: 'taiyi-config', label: '太乙局式' },
  { id: 'bazi-time-basis', label: '时间基准' },
  { id: 'ziwei-dynamic-scope', label: '紫微动态口径' },
];

function renderValue(value: StructuredValue): string {
  if (Array.isArray(value)) return value.length ? value.map(renderValue).join('、') : '（空）';
  if (value && typeof value === 'object') return JSON.stringify(value);
  if (value === null) return '（无）';
  return String(value);
}

export function RuleComparisonPanel() {
  const { baziTimeStatus } = useBirth();
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState<RuleComparisonDomain>('bazi-shensha');
  const [transitYear, setTransitYear] = useState(() => new Date().getFullYear());
  const [transitMonth, setTransitMonth] = useState(() => new Date().getMonth() + 1);
  const verifiedResolution = baziTimeStatus.status === 'true-solar-verified' ? baziTimeStatus.resolution : null;
  const activeBirth = baziTimeStatus.status === 'true-solar-verified' ? baziTimeStatus.resolution.trueSolarBirth : baziTimeStatus.civilBirth;
  const [result, setResult] = useState<RuleComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!open || (domain === 'bazi-time-basis' && !verifiedResolution)) {
      setResult(null);
      setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true);
    setError(null);
    void import('@/engine-api/ruleComparison').then((api) => {
      if (cancelled) return;
      const solar = getSolarEntry();
      let next: RuleComparisonResult;
      switch (domain) {
        case 'bazi-shensha': next = api.compareBaziShenShaRules({ birth: activeBirth, solar }); break;
        case 'chenguz-version': next = api.compareChenguzVersions({ birth: activeBirth, solar }); break;
        case 'daliuren-school': next = api.compareDaliurenSchools({ birth: activeBirth, solar }); break;
        case 'taiyi-config': next = api.compareTaiyiRules({ birth: activeBirth, solar }); break;
        case 'bazi-time-basis': {
          if (!verifiedResolution) return;
          next = api.compareBaziTimeBasis({ resolution: verifiedResolution, solar });
          break;
        }
        case 'ziwei-dynamic-scope': next = api.compareZiweiDynamicScope({
          birth: { ...activeBirth, gender: activeBirth.gender === '女' ? '女' : '男' },
          transit: { year: transitYear, month: transitMonth },
        }); break;
      }
      setResult(next);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setResult(null);
      setLoading(false);
      setError('本次规则比较未能完成，请核对输入后重试。');
    });
    return () => { cancelled = true; };
  }, [activeBirth, domain, open, transitMonth, transitYear, verifiedResolution]);

  return (
    <section data-testid="bazi-rule-comparison" className="rounded-panel border border-jade-500/20 bg-jade-500/5 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-jade-50">规则差异实验室</h3>
          <p className="mt-1 text-xs leading-5 text-jade-100/55">同一份基础输入运行显式规则配置，仅对比经过校验的结构化字段与已引用的规则来源。</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="scroll-mt-48 rounded-full border border-jade-500/30 bg-jade-500/10 px-4 py-2 text-xs font-semibold text-jade-300">
          {open ? '收起实验' : '展开实验'}
        </button>
      </div>
      <p className="mt-3 rounded-card border border-gold-500/20 bg-gold-500/5 px-3 py-2 text-xs leading-5 text-gold-200/80">
        本页只显示结构化规则差异，不判断某一流派更准确。
      </p>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="规则比较领域">
            {DOMAIN_OPTIONS.map((option) => {
              const needsVerifiedTime = option.id === 'bazi-time-basis' && baziTimeStatus.status !== 'true-solar-verified';
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={domain === option.id}
                  disabled={needsVerifiedTime}
                  onClick={() => setDomain(option.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${domain === option.id ? 'border-jade-400/50 bg-jade-500/20 text-jade-200' : 'border-white/10 text-jade-100/55'} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {option.label}{needsVerifiedTime ? '（需核验）' : ''}
                </button>
              );
            })}
          </div>

          {domain === 'ziwei-dynamic-scope' && (
            <div className="grid gap-3 sm:grid-cols-2" aria-label="紫微动态目标年月">
              <label className="text-xs text-jade-100/60">目标年份<input aria-label="规则比较目标年份" type="number" min={1900} max={2100} value={transitYear} onChange={(event) => setTransitYear(Math.min(2100, Math.max(1900, Number(event.target.value) || 1900)))} className="mt-1 w-full rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-jade-100" /></label>
              <label className="text-xs text-jade-100/60">目标月份<input aria-label="规则比较目标月份" type="number" min={1} max={12} value={transitMonth} onChange={(event) => setTransitMonth(Math.min(12, Math.max(1, Number(event.target.value) || 1)))} className="mt-1 w-full rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-jade-100" /></label>
            </div>
          )}

          {baziTimeStatus.status !== 'true-solar-verified' && (
            <p className="text-xs leading-5 text-jade-100/45">时间基准比较暂不可用：需要外部核验经度、IANA 时区、出生当日 UTC 偏移和夏令时证据，并取得可复算的真太阳时结果；本页不会自行补造地点证据。</p>
          )}

          {error && <p role="alert" className="text-xs text-cinnabar-300">{error}</p>}
          {loading && <p role="status" className="text-xs text-jade-100/55">正在运行所选本地规则配置…</p>}

          {result && (
            <>
              <div className="grid gap-3 md:grid-cols-2" aria-label="规则变体">
                {result.variants.map((variant) => (
                  <article key={variant.id} className="rounded-card border border-white/10 bg-ink-950/65 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-semibold text-jade-100">{variant.label}</h4>
                      <span className={variant.factsVerified ? 'text-xs text-jade-300' : 'text-xs text-gold-300'}>{variant.factsVerified ? '结构化事实已校验' : '结构化事实未通过校验'}</span>
                    </div>
                    <p className="mt-2 break-all text-xs text-jade-100/55">配置：{JSON.stringify(variant.config)}</p>
                    <ul className="mt-2 space-y-1 text-[11px] leading-4 text-jade-100/45" aria-label={`${variant.label}规则来源`}>
                      {variant.citations.map((citation) => <li key={citation.id}>来源：{citation.title}（{citation.source}）</li>)}
                    </ul>
                  </article>
                ))}
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <section className="rounded-card border border-jade-500/20 bg-jade-500/5 p-3" aria-labelledby="rule-common-heading">
                  <h4 id="rule-common-heading" className="text-xs font-semibold text-jade-300">共同字段</h4>
                  <dl className="mt-2 space-y-2 text-xs text-jade-100/65">
                    {result.commonFacts.map((fact) => <div key={fact.field}><dt className="inline text-jade-100/45">{fact.label}：</dt><dd className="inline break-words">{renderValue(fact.value)}</dd></div>)}
                  </dl>
                </section>
                <section className="rounded-card border border-gold-500/20 bg-gold-500/5 p-3" aria-labelledby="rule-diff-heading">
                  <h4 id="rule-diff-heading" className="text-xs font-semibold text-gold-300">差异字段</h4>
                  <div className="mt-2 space-y-3 text-xs text-jade-100/65">
                    {result.differences.map((difference) => (
                      <div key={difference.field}><p className="font-semibold text-jade-100/70">{difference.label}</p><ul className="mt-1 space-y-1">{difference.values.map((item) => <li key={item.variantId} className="break-words">{item.label}：{renderValue(item.value)}</li>)}</ul></div>
                    ))}
                  </div>
                </section>
              </div>
              <ul className="space-y-1 text-xs leading-5 text-jade-100/45">{result.limitations.slice(1).map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
