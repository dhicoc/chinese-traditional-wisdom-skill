import type { ReactNode } from 'react';

export interface InterpretationItem {
  label: string;
  value: ReactNode;
  description?: ReactNode;
}

interface InterpretationCardProps {
  title: string;
  badge?: string;
  subtitle?: ReactNode;
  items?: InterpretationItem[];
  children?: ReactNode;
}

export function InterpretationCard({ title, badge, subtitle, items = [], children }: InterpretationCardProps) {
  return (
    <section className="rounded-card border border-white/8 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{title}</p>
          {subtitle && <p className="mt-1 text-xs leading-5 text-zinc-500">{subtitle}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded-full border border-jade-500/25 bg-jade-500/10 px-2.5 py-1 text-[10px] font-semibold text-jade-500">
            {badge}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <dl className="mt-3 space-y-2 text-sm text-zinc-400">
          {items.map((item) => (
            <div key={item.label} className="grid gap-1 rounded-card bg-black/16 px-3 py-2 sm:grid-cols-[80px_minmax(0,1fr)]">
              <dt className="text-xs text-zinc-500">{item.label}</dt>
              <dd className="min-w-0 text-zinc-100">
                {item.value}
                {item.description && <p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {children && <div className="mt-3 text-sm leading-6 text-zinc-400">{children}</div>}
    </section>
  );
}
