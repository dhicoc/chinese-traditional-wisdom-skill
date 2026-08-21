/* Local opt-in history. Nothing is persisted until add() is called explicitly. */
import type { SafeResultBundle } from './resultBundle';
import { cloneCanonicalBundle, verifyPortableResultBundle } from './resultBundleIntegrity';

export const HISTORY_SCHEMA_VERSION = 3;
export type HistoryRetentionDays = 7 | 30 | 90 | null;
export interface HistorySettings { retentionDays: HistoryRetentionDays }
export interface HistoryVerifiedFact { label: string; value: string; tool: string }
export interface HistoryEntry {
  id: string; module: string; title: string; summary: string; tags: string[]; mode: string; createdAt: string;
  expiresAt: string | null; favorite: boolean; schemaVersion: number; reportVersion: string; capabilityMode: string;
  inputSummary: string; verifiedFacts: HistoryVerifiedFact[]; resultBundle?: SafeResultBundle;
}

const HISTORY_KEY = 'FORTUNE_HISTORY';
const FAVORITES_KEY = 'FORTUNE_FAVORITES';
const SETTINGS_KEY = 'FORTUNE_HISTORY_SETTINGS';
const MAX_HISTORY = 30;
const DEFAULT_SETTINGS: HistorySettings = { retentionDays: 30 };

function safeParse(json: string | null): Partial<HistoryEntry>[] {
  try { const value: unknown = JSON.parse(json || '[]'); return Array.isArray(value) ? value.filter((entry): entry is Partial<HistoryEntry> => Boolean(entry) && typeof entry === 'object') : []; } catch { return []; }
}
function generateId(): string { return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function redactSensitiveText(value: string): string {
  return value.replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, '****').replace(/\d{4}年\d{1,2}月\d{1,2}日/g, '****')
    .replace(/(?:姓名|名字|称呼)\s*[:：]\s*[\u4e00-\u9fff]{2,4}/g, (match) => match.replace(/[\u4e00-\u9fff]{2,4}$/, '已脱敏'))
    .replace(/(?:出生)?地点\s*[:：]\s*[^，。；、\n]{2,40}/g, (match) => match.replace(/[:：].*$/, '：已脱敏'))
    .replace(/(?:[\u4e00-\u9fff]{2,}(?:省|自治区|特别行政区))?[\u4e00-\u9fff]{2,}市[\u4e00-\u9fff]{2,}(?:区|县|镇|乡|街道)/g, '地点已脱敏');
}
function settings(): HistorySettings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try { const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); return { retentionDays: [7, 30, 90, null].includes(value.retentionDays) ? value.retentionDays : 30 }; } catch { return DEFAULT_SETTINGS; }
}
function expiry(createdAt: string, days: HistoryRetentionDays): string | null { if (days === null) return null; return new Date(new Date(createdAt).getTime() + days * 86_400_000).toISOString(); }
function sanitizeFacts(value: unknown): HistoryVerifiedFact[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).filter((item) => item && typeof item === 'object').map((item) => {
    const fact = item as Record<string, unknown>;
    return { label: redactSensitiveText(String(fact.label ?? fact.kind ?? '结构化事实').slice(0, 80)), value: redactSensitiveText(String(fact.value ?? '').slice(0, 180)), tool: String(fact.tool ?? 'unknown').slice(0, 50) };
  });
}
function safeBundle(value: unknown): SafeResultBundle | undefined {
  if (!verifyPortableResultBundle(value).valid) return undefined;
  const bundle = value as SafeResultBundle;
  if (bundle.inputIncluded !== false || bundle.replayable !== false) return undefined;
  return cloneCanonicalBundle(bundle);
}
function sanitize(entry: Partial<HistoryEntry>, isNew = false): HistoryEntry {
  const mode = String(entry.mode || 'unknown').slice(0, 20);
  const createdAt = Number.isFinite(new Date(entry.createdAt || '').getTime()) ? String(entry.createdAt) : new Date().toISOString();
  const expiresAt = entry.expiresAt === null ? null : entry.expiresAt && Number.isFinite(new Date(entry.expiresAt).getTime()) ? entry.expiresAt : isNew ? expiry(createdAt, settings().retentionDays) : null;
  return { id: entry.id || generateId(), module: String(entry.module || 'unknown').slice(0, 30), title: redactSensitiveText(String(entry.title || '').slice(0, 120)), summary: redactSensitiveText(String(entry.summary || '').slice(0, 500)), tags: Array.isArray(entry.tags) ? entry.tags.slice(0, 10).map((tag) => redactSensitiveText(String(tag).slice(0, 30))) : [], mode, createdAt, expiresAt, favorite: entry.favorite === true, schemaVersion: HISTORY_SCHEMA_VERSION, reportVersion: String(entry.reportVersion || 'unknown').slice(0, 20), capabilityMode: redactSensitiveText(String(entry.capabilityMode || mode).slice(0, 80)), inputSummary: redactSensitiveText(String(entry.inputSummary || '未提供').slice(0, 120)), verifiedFacts: sanitizeFacts(entry.verifiedFacts), ...(safeBundle(entry.resultBundle) ? { resultBundle: safeBundle(entry.resultBundle) } : {}) };
}
function setEntries(key: string, entries: HistoryEntry[]): void { try { localStorage.setItem(key, JSON.stringify(entries.map((e) => sanitize(e)))); } catch {} }
function getEntries(key: string): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  let raw: Partial<HistoryEntry>[]; try { raw = safeParse(localStorage.getItem(key)); } catch { return []; }
  const now = Date.now(); const clean = raw.map((entry) => sanitize(entry)).filter((entry) => entry.expiresAt === null || new Date(entry.expiresAt).getTime() > now);
  if (JSON.stringify(raw) !== JSON.stringify(clean)) setEntries(key, clean); return clean;
}
function getHistory() { return getEntries(HISTORY_KEY); }
function setHistory(entries: HistoryEntry[]) { setEntries(HISTORY_KEY, entries); }
function getFavorites() { return getEntries(FAVORITES_KEY); }
function setFavorites(entries: HistoryEntry[]) { setEntries(FAVORITES_KEY, entries); }
function syncFavorites(history: HistoryEntry[]) { const old = new Map(getFavorites().map((e) => [e.id, e])); setFavorites(history.filter((e) => e.favorite).map((e) => ({ ...old.get(e.id), ...e, favorite: true }))); }

export const HistoryStore = {
  preview(entry: Partial<HistoryEntry>): HistoryEntry | null { return entry?.module ? sanitize(entry, true) : null; },
  add(entry: Partial<HistoryEntry>): HistoryEntry | null { if (!entry?.module) return null; const clean = sanitize(entry, true); let history = getHistory(); const index = history.findIndex((item) => item.module === clean.module && item.title === clean.title); if (index >= 0) { clean.favorite = history[index].favorite; history.splice(index, 1); } history.unshift(clean); history = history.slice(0, MAX_HISTORY); setHistory(history); syncFavorites(history); return clean; },
  list: getHistory, listFavorites(): HistoryEntry[] { const history = getHistory(); const favorites = history.filter((e) => e.favorite); if (favorites.length || !getFavorites().length) { setFavorites(favorites); return favorites; } return getFavorites(); },
  toggleFavorite(id: string): boolean { const history = getHistory(); const item = history.find((e) => e.id === id); if (!item) return false; item.favorite = !item.favorite; setHistory(history); syncFavorites(history); return item.favorite; },
  remove(id: string): void { const history = getHistory().filter((e) => e.id !== id); setHistory(history); syncFavorites(history); },
  clear(): void { setHistory([]); }, clearFavorites(): void { const history = getHistory().map((e) => ({ ...e, favorite: false })); setHistory(history); setFavorites([]); },
  clearAll(): void { setHistory([]); setFavorites([]); }, getCount(): number { return getHistory().length; },
  getSettings: settings,
  setRetentionDays(days: HistoryRetentionDays): void { if (![7, 30, 90, null].includes(days)) return; localStorage.setItem(SETTINGS_KEY, JSON.stringify({ retentionDays: days })); const update = (entries: HistoryEntry[]) => entries.map((e) => ({ ...e, expiresAt: expiry(e.createdAt, days) })); setHistory(update(getHistory())); setFavorites(update(getFavorites())); },
};
if (typeof window !== 'undefined') (window as unknown as { HistoryStore: typeof HistoryStore }).HistoryStore = HistoryStore;
