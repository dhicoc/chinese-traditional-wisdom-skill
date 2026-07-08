import type { BirthData } from '@/legacy/birthBridge';

export const COPY_CONTEXT_INTENT = 'ctw:copy-context';
export const YEAR_INTENT_EVENT = 'ctw:set-year';
export const YEAR_INTENT_STORAGE_KEY = 'ctw.pendingYear';
export const BIRTH_INTENT_EVENT = 'ctw:set-birth';
export const REFRESH_ALL_INTENT_EVENT = 'ctw:refresh-all';
export const LIUYAO_INTENT_EVENT = 'ctw:liuyao-command';
export const MEIHUA_INTENT_EVENT = 'ctw:meihua-command';
export const READER_SEARCH_INTENT_EVENT = 'ctw:reader-search';
export const COMMAND_FEEDBACK_EVENT = 'ctw:command-feedback';

export type YearIntentTarget = 'feixing' | 'yunqi';
export type LiuyaoCommandMethod = 'coin' | 'time' | 'manual';
export type MeihuaRelation = '生' | '克' | '比和';

export interface CopyContextIntentDetail {
  scope: string;
}

export interface YearIntentDetail {
  target: YearIntentTarget;
  year: number;
}

export interface BirthIntentDetail {
  patch: Partial<BirthData>;
  source: 'command-bar';
  raw: string;
}

export interface RefreshAllIntentDetail {
  source: 'command-bar';
  raw?: string;
  nonce: number;
}

export interface LiuyaoIntentDetail {
  method?: LiuyaoCommandMethod;
  question?: string;
  yaoValues?: string;
  recast?: boolean;
  raw: string;
}

export interface MeihuaIntentDetail {
  upper?: string;
  lower?: string;
  movingLine?: number;
  relation?: MeihuaRelation;
  raw: string;
}

export interface ReaderSearchIntentDetail {
  term: string;
  raw: string;
}

export interface CommandFeedbackDetail {
  title: string;
  description?: string;
  tone: 'success' | 'info';
}

const TRIGRAM_ALIASES: Record<string, string> = {
  qian: '乾',
  dui: '兑',
  li: '离',
  zhen: '震',
  xun: '巽',
  kan: '坎',
  gen: '艮',
  kun: '坤',
  乾: '乾',
  兑: '兑',
  离: '离',
  震: '震',
  巽: '巽',
  坎: '坎',
  艮: '艮',
  坤: '坤',
};

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

export function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function pendingYearKey(target: YearIntentTarget): string {
  return YEAR_INTENT_STORAGE_KEY + '.' + target;
}

function compactQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

function parseGender(query: string): BirthData['gender'] | undefined {
  const lower = query.toLowerCase();
  if (/[女]/.test(query) || /\b(female|woman|girl|f)\b/.test(lower)) return '女';
  if (/[男]/.test(query) || /\b(male|man|boy|m)\b/.test(lower)) return '男';
  return undefined;
}

function stripCommandWords(query: string, words: string[]): string {
  let result = query;
  words.forEach((word) => {
    result = result.replace(new RegExp(word, 'gi'), ' ');
  });
  return compactQuery(result);
}

export function parseBirthCommand(query: string): BirthIntentDetail | null {
  const raw = compactQuery(query);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const hasBirthKeyword = /生辰|出生|生日|birth|农历|陰曆|阴历|lunar|公历|公曆|阳历|陽曆|solar/.test(lower);
  if (!hasBirthKeyword) return null;

  const dateMatch = raw.match(/(\d{4})[-/.年\s]+(\d{1,2})[-/.月\s]+(\d{1,2})(?:日)?(?:\s+(\d{1,2}))?/);
  if (!dateMatch) return null;

  const patch: Partial<BirthData> = {
    year: clampInt(Number.parseInt(dateMatch[1], 10), 1900, 2100, 1990),
    month: clampInt(Number.parseInt(dateMatch[2], 10), 1, 12, 1),
    day: clampInt(Number.parseInt(dateMatch[3], 10), 1, 31, 1),
  };
  if (dateMatch[4]) {
    patch.hour = clampInt(Number.parseInt(dateMatch[4], 10), 0, 23, 0);
  }

  const gender = parseGender(raw);
  if (gender) patch.gender = gender;
  if (/农历|陰曆|阴历|lunar/.test(lower)) patch.isLunar = true;
  if (/公历|公曆|阳历|陽曆|solar/.test(lower)) patch.isLunar = false;

  return { patch, source: 'command-bar', raw };
}

export function isRefreshAllCommand(query: string): boolean {
  const raw = compactQuery(query).toLowerCase();
  return /^(刷新|刷新全部|重算|重新计算|refresh|refresh all|recalculate)$/.test(raw);
}

export function parseLiuyaoCommand(query: string): LiuyaoIntentDetail | null {
  const raw = compactQuery(query);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (!/六爻|liuyao|起卦|占卜/.test(lower)) return null;

  const detail: LiuyaoIntentDetail = { raw };
  const manualMatch = raw.match(/[6-9]{6}/);
  if (/手动|manual/.test(lower) || manualMatch) {
    detail.method = 'manual';
    if (manualMatch) detail.yaoValues = manualMatch[0];
  } else if (/时间|time/.test(lower)) {
    detail.method = 'time';
  } else {
    detail.method = 'coin';
    detail.recast = true;
  }

  const question = stripCommandWords(raw, ['六爻', 'liuyao', '起卦', '占卜', '铜钱', 'coin', '手动', 'manual', '时间', 'time', '[6-9]{6}']);
  if (question) detail.question = question;
  return detail;
}

export function parseMeihuaCommand(query: string): MeihuaIntentDetail | null {
  const raw = compactQuery(query);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (!/梅花|meihua/.test(lower)) return null;

  const detail: MeihuaIntentDetail = { raw };
  const tokens = raw.split(/\s+/);
  const trigrams: string[] = [];
  tokens.forEach((token) => {
    const matched = TRIGRAM_ALIASES[token] ?? TRIGRAM_ALIASES[token.toLowerCase()];
    if (matched) trigrams.push(matched);
  });
  if (trigrams[0]) detail.upper = trigrams[0];
  if (trigrams[1]) detail.lower = trigrams[1];

  const movingMatch = raw.match(/(?:^|\D)([1-6])(?:\D|$)/);
  if (movingMatch) detail.movingLine = Number.parseInt(movingMatch[1], 10);

  if (raw.includes('比和')) detail.relation = '比和';
  else if (raw.includes('生')) detail.relation = '生';
  else if (raw.includes('克')) detail.relation = '克';

  return detail;
}

export function parseReaderSearchCommand(query: string): ReaderSearchIntentDetail | null {
  const raw = compactQuery(query);
  if (!raw) return null;
  const match = raw.match(/^(?:古籍|reader|split|搜古籍|查古籍)\s+(.+)$/i);
  if (!match?.[1]) return null;
  return { term: match[1].trim(), raw };
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

export function dispatchBirthIntent(detail: BirthIntentDetail): void {
  window.dispatchEvent(new CustomEvent<BirthIntentDetail>(BIRTH_INTENT_EVENT, { detail }));
}

export function dispatchRefreshAllIntent(raw?: string): void {
  window.dispatchEvent(new CustomEvent<RefreshAllIntentDetail>(REFRESH_ALL_INTENT_EVENT, {
    detail: { source: 'command-bar', raw, nonce: Date.now() },
  }));
}

export function dispatchLiuyaoIntent(detail: LiuyaoIntentDetail): void {
  window.dispatchEvent(new CustomEvent<LiuyaoIntentDetail>(LIUYAO_INTENT_EVENT, { detail }));
}

export function dispatchMeihuaIntent(detail: MeihuaIntentDetail): void {
  window.dispatchEvent(new CustomEvent<MeihuaIntentDetail>(MEIHUA_INTENT_EVENT, { detail }));
}

export function dispatchReaderSearchIntent(detail: ReaderSearchIntentDetail): void {
  window.dispatchEvent(new CustomEvent<ReaderSearchIntentDetail>(READER_SEARCH_INTENT_EVENT, { detail }));
}

export function dispatchCommandFeedback(detail: CommandFeedbackDetail): void {
  window.dispatchEvent(new CustomEvent<CommandFeedbackDetail>(COMMAND_FEEDBACK_EVENT, { detail }));
}

export function buildCommandFeedback(item: { label: string; group: string; hint?: string }): CommandFeedbackDetail {
  return {
    title: '已执行：' + item.label,
    description: item.group + (item.hint ? ' · ' + item.hint : ''),
    tone: item.group === '导航' ? 'info' : 'success',
  };
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
