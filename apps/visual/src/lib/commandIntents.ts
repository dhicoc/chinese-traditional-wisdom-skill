export const COPY_CONTEXT_INTENT = 'ctw:copy-context';
export const YEAR_INTENT_EVENT = 'ctw:set-year';
export const YEAR_INTENT_STORAGE_KEY = 'ctw.pendingYear';

export type YearIntentTarget = 'feixing' | 'yunqi';

export interface CopyContextIntentDetail {
  scope: string;
}

export interface YearIntentDetail {
  target: YearIntentTarget;
  year: number;
}

export function normalizeCommandYear(value: number | string, fallback = 2026): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(2100, Math.max(1900, Math.trunc(parsed)));
}

export function extractCommandYear(query: string): number | null {
  const match = query.match(/(?:^|\D)((?:19|20)\d{2}|2100)(?:\D|$)/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  if (year < 1900 || year > 2100) return null;
  return year;
}

function pendingYearKey(target: YearIntentTarget): string {
  return YEAR_INTENT_STORAGE_KEY + '.' + target;
}

export function dispatchCopyContextIntent(scope: string): void {
  window.dispatchEvent(new CustomEvent<CopyContextIntentDetail>(COPY_CONTEXT_INTENT, { detail: { scope } }));
}

export function dispatchYearIntent(target: YearIntentTarget, yearValue: number): void {
  const year = normalizeCommandYear(yearValue);
  try {
    window.sessionStorage.setItem(YEAR_INTENT_STORAGE_KEY, String(year));
    window.sessionStorage.setItem(pendingYearKey(target), String(year));
  } catch {
    // sessionStorage 可能在隐私模式或 file:// 受限环境不可用；事件仍可完成当前页跳转。
  }
  window.dispatchEvent(new CustomEvent<YearIntentDetail>(YEAR_INTENT_EVENT, { detail: { target, year } }));
}

export function readPendingCommandYear(target: YearIntentTarget, fallback = 2026): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.sessionStorage.getItem(pendingYearKey(target)) ?? window.sessionStorage.getItem(YEAR_INTENT_STORAGE_KEY);
    if (!raw) return fallback;
    return normalizeCommandYear(raw, fallback);
  } catch {
    return fallback;
  }
}
