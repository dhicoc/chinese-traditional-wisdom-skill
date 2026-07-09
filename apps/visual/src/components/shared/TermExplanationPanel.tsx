import { useEffect, useMemo, useState } from 'react';

/**
 * TermExplanationPanel — 通用术语解释面板（UX P2）
 *
 * 用 CORE.explain() 查通俗解释，覆盖命理/中医/风水等全部术语。
 * 替代 KnowledgeReferencePanel（仅查风水映射表）用于命理工作区。
 */

interface TermExplanationPanelProps {
  /** 初始选中术语 */
  initialTerm?: string;
  /** 可点击的术语列表 */
  terms: string[];
  /** 面板说明 */
  description?: string;
}

interface LegacyCore {
  explain?: (term: string) => string;
}

function getCore(): LegacyCore | null {
  const w = window as unknown as { LegacyCORE?: LegacyCore };
  return w.LegacyCORE ?? null;
}

export function TermExplanationPanel({ initialTerm, terms, description }: TermExplanationPanelProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [notFound, setNotFound] = useState(false);

  const core = useMemo(() => getCore(), []);

  useEffect(() => {
    if (initialTerm && core?.explain) {
      const exp = core.explain(initialTerm);
      if (exp && exp !== '暂无该术语的解释') {
        setSelected(initialTerm);
        setExplanation(exp);
        setNotFound(false);
      }
    }
  }, [initialTerm, core]);

  const lookupTerm = (term: string) => {
    setSelected(term);
    if (!core?.explain) {
      setExplanation('');
      setNotFound(true);
      return;
    }
    const exp = core.explain(term);
    if (exp && exp !== '暂无该术语的解释') {
      setExplanation(exp);
      setNotFound(false);
    } else {
      setExplanation('');
      setNotFound(true);
    }
  };

  return (
    <div className="rounded-card border border-white/8 bg-white/[0.025] p-4">
      <p className="text-sm font-semibold text-jade-100/70">术语解释</p>
      {description && <p className="mt-0.5 text-xs text-jade-100/45">{description}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {terms.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => lookupTerm(term)}
            className={`rounded-full px-2.5 py-1 text-[11px] transition ${
              selected === term
                ? 'border border-jade-500/40 bg-jade-500/12 text-jade-300'
                : 'border border-white/8 text-jade-100/45 hover:text-jade-100'
            }`}
          >
            {term}
          </button>
        ))}
      </div>
      {selected && (
        <div className="mt-3 rounded-card border border-white/5 bg-white/[0.02] p-3">
          <p className="text-xs font-semibold text-jade-300">{selected}</p>
          {notFound ? (
            <p className="mt-1.5 text-xs leading-5 text-jade-100/45">
              暂无该术语的解释。可尝试其他术语。
            </p>
          ) : (
            <p className="mt-1.5 text-xs leading-6 text-jade-100/70">{explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
