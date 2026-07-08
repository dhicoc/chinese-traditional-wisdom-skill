import type { ChangeEventHandler, ReactNode } from 'react';

type ControlFieldProps = {
  label: string;
  hint?: string;
  children?: ReactNode;
  value?: string | number;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  type?: string;
  min?: number;
  max?: number;
  inputMode?: 'text' | 'numeric' | 'decimal';
};

export function ControlField({ label, hint, children, value, onChange, type = 'text', min, max, inputMode }: ControlFieldProps) {
  return (
    <label className="grid gap-1 text-xs text-jade-100/45">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {hint && <span className="text-[10px] text-jade-100/30">{hint}</span>}
      </span>
      {children ?? (
        <input
          value={value}
          onChange={onChange}
          type={type}
          min={min}
          max={max}
          inputMode={inputMode}
          className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
        />
      )}
    </label>
  );
}
