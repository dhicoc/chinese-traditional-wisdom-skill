/**
 * historyStore — 本地历史与收藏（纯 TS localStorage，不依赖 visual/js/history-store.js）
 */

export interface HistoryEntry {
  id: string;
  module: string;
  title: string;
  summary: string;
  tags: string[];
  mode: string;
  createdAt: string;
  favorite: boolean;
}

const HISTORY_KEY = 'FORTUNE_HISTORY';
const FAVORITES_KEY = 'FORTUNE_FAVORITES';
const MAX_HISTORY = 30;

function safeParse(json: string | null): HistoryEntry[] {
  try {
    return JSON.parse(json || '[]') as HistoryEntry[];
  } catch {
    return [];
  }
}

function getHistory(): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse(localStorage.getItem(HISTORY_KEY));
}

function setHistory(arr: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
  } catch {
    /* quota */
  }
}

function getFavorites(): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse(localStorage.getItem(FAVORITES_KEY));
}

function setFavorites(arr: HistoryEntry[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr));
  } catch {
    /* quota */
  }
}

function generateId(): string {
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitize(entry: Partial<HistoryEntry>): HistoryEntry {
  const clean: HistoryEntry = {
    id: entry.id || generateId(),
    module: String(entry.module || 'unknown').slice(0, 30),
    title: String(entry.title || '').slice(0, 120),
    summary: String(entry.summary || '').slice(0, 500),
    tags: Array.isArray(entry.tags) ? entry.tags.slice(0, 10).map((t) => String(t).slice(0, 30)) : [],
    mode: String(entry.mode || 'unknown').slice(0, 20),
    createdAt: entry.createdAt || new Date().toISOString(),
    favorite: entry.favorite === true,
  };
  clean.summary = clean.summary.replace(/\d{4}-\d{2}-\d{2}/g, '****');
  clean.title = clean.title.replace(/\d{4}-\d{2}-\d{2}/g, '****');
  return clean;
}

export const HistoryStore = {
  add(entry: Partial<HistoryEntry>): HistoryEntry | null {
    if (!entry?.module) return null;
    const clean = sanitize(entry);
    let history = getHistory();
    const existingIdx = history.findIndex((h) => h.module === clean.module && h.title === clean.title);
    if (existingIdx >= 0) {
      clean.favorite = history[existingIdx].favorite;
      history.splice(existingIdx, 1);
    }
    history.unshift(clean);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    setHistory(history);
    if (clean.favorite) {
      const favs = getFavorites().filter((f) => !(f.module === clean.module && f.title === clean.title));
      favs.unshift(clean);
      setFavorites(favs);
    }
    return clean;
  },
  list(): HistoryEntry[] {
    return getHistory();
  },
  listFavorites(): HistoryEntry[] {
    return getFavorites();
  },
  toggleFavorite(id: string): boolean {
    const history = getHistory();
    const item = history.find((h) => h.id === id);
    if (!item) return false;
    item.favorite = !item.favorite;
    setHistory(history);
    let favs = getFavorites();
    if (item.favorite) {
      favs = favs.filter((f) => f.id !== id);
      favs.unshift(item);
    } else {
      favs = favs.filter((f) => f.id !== id);
    }
    setFavorites(favs);
    return item.favorite;
  },
  remove(id: string): void {
    setHistory(getHistory().filter((h) => h.id !== id));
    setFavorites(getFavorites().filter((f) => f.id !== id));
  },
  clear(): void {
    setHistory([]);
  },
  clearFavorites(): void {
    setFavorites([]);
    setHistory(getHistory().map((h) => ({ ...h, favorite: false })));
  },
  getCount(): number {
    return getHistory().length;
  },
};

// 暴露到 window，供 e2e 测试与 commandIntents 命令历史记录使用。
// React 迁移后原 visual/ 旧桥已移除，window.HistoryStore 不再由别处设置；
// 此处显式挂上，恢复「命令历史/收藏」的真实写入能力（此前 commandIntents 读不到该全局，记录为死代码）。
if (typeof window !== 'undefined') {
  (window as unknown as { HistoryStore: typeof HistoryStore }).HistoryStore = HistoryStore;
}
