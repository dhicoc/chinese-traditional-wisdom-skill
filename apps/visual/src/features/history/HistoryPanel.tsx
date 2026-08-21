import { useCallback, useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { HistoryStore, type HistoryEntry, type HistoryRetentionDays } from '@/legacy/historyStore';
import type { SafeResultBundle } from '@/legacy/resultBundle';
import { canonicalStringify } from '@/legacy/provenance';
import { verifyPortableResultBundle } from '@/legacy/resultBundleIntegrity';

/* ── 工具 ─────────────────────────────────────────────── */

const MODULE_LABELS: Record<string, string> = {
  bazi: '八字命盘',
  yunqi: '五运六气',
  meihua: '梅花易数',
  ziwei: '紫微斗数',
  liuyao: '六爻占卜',
  fengshui: '风水罗盘',
  feixing: '流年飞星',
  bazhai: '八宅大游年',
  tizhi: '体质辨识',
};

const MODE_COLORS: Record<string, { color: string; border: string }> = {
  'local-exact': { color: 'var(--wz-water)', border: 'rgb(var(--water) / 0.2)' },
  'local': { color: 'var(--wz-wood)', border: 'rgb(var(--wood) / 0.2)' },
  'local-approx': { color: 'var(--wz-wood)', border: 'rgb(var(--wood) / 0.2)' },
  'demo': { color: 'var(--wz-fire)', border: 'rgb(var(--cinnabar) / 0.2)' },
  'knowledge': { color: 'var(--wz-earth)', border: 'rgb(var(--earth) / 0.2)' },
  'derived': { color: 'var(--chart-text-faint)', border: 'var(--chart-text-faint)' },
};

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day} ${hour}:${min}`;
}

/* ── 单条历史卡片 ─────────────────────────────────────── */

function EntryCard({
  entry,
  onToggleFav,
  onRemove,
  onExportBundle,
}: {
  entry: HistoryEntry;
  onToggleFav: (id: string) => void;
  onRemove: (id: string) => void;
  onExportBundle: (entry: HistoryEntry) => void;
}) {
  const modeStyle = MODE_COLORS[entry.mode] ?? { color: 'var(--chart-text-faint)', border: 'var(--chart-text-faint)' };
  const moduleLabel = MODULE_LABELS[entry.module] ?? entry.module;

  return (
    <article className="rounded-card border border-white/8 bg-white/[0.035] p-4 transition hover:border-white/16">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleFav(entry.id)}
              className="text-lg leading-none transition hover:scale-110"
              title={entry.favorite ? '取消收藏' : '收藏'}
            >
              {entry.favorite ? '★' : '☆'}
            </button>
            <h3 className="truncate text-sm font-semibold text-jade-100">{entry.title}</h3>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-jade-100/55">{entry.summary}</p>
          <div className="mt-2 rounded border border-jade-500/15 bg-jade-500/[0.035] px-2 py-1.5 text-[10px] leading-4 text-jade-100/45">
            <p>本次分析说明：{entry.inputSummary}</p>
            <p>报告版本：{entry.reportVersion}</p>
            <p>结果状态：{entry.capabilityMode}</p>
          </div>
          {entry.verifiedFacts.length > 0 && (
            <p className="mt-2 text-[11px] text-jade-100/50">已核验结构化事实：{entry.verifiedFacts.length} 项</p>
          )}
          {entry.resultBundle && (
            <button type="button" onClick={() => onExportBundle(entry)} className="mt-2 rounded border border-jade-500/20 px-2 py-1 text-[10px] text-jade-300">导出可复核结果包</button>
          )}
          {entry.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.tags.slice(0, 6).map((tag, i) => (
                <span key={i} className="rounded-full bg-black/24 px-2 py-0.5 text-[10px] text-jade-100/45">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            style={{ borderColor: modeStyle.border, color: modeStyle.color }}
          >
            {moduleLabel}
          </span>
          <span className="text-[10px] text-jade-100/55">{formatTime(entry.createdAt)}</span>
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="text-[10px] text-jade-100/55 transition hover:text-cinnabar-500"
          >
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── 主组件 ───────────────────────────────────────────── */

export function HistoryWorkspace() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<HistoryEntry[]>([]);
  const [tab, setTab] = useState<'history' | 'favorites'>('history');
  const [retentionDays, setRetentionDays] = useState<HistoryRetentionDays>(() => HistoryStore.getSettings().retentionDays);
  const [importPreview, setImportPreview] = useState<HistoryEntry | null>(null);
  const [importError, setImportError] = useState('');
  const store = HistoryStore;

  const refresh = useCallback(() => {
    setEntries(store.list());
    setFavorites(store.listFavorites());
  }, [store]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggleFav = useCallback(
    (id: string) => {
      store?.toggleFavorite(id);
      refresh();
    },
    [store, refresh],
  );

  const handleRemove = useCallback(
    (id: string) => {
      store?.remove(id);
      refresh();
    },
    [store, refresh],
  );

  const handleClearHistory = useCallback(() => {
    if (confirm('确定清空全部历史记录？收藏不会删除。')) {
      store?.clear();
      refresh();
    }
  }, [store, refresh]);

  const handleClearFavorites = useCallback(() => {
    if (confirm('确定清空全部收藏？')) {
      store?.clearFavorites();
      refresh();
    }
  }, [store, refresh]);

  const handleRetention = useCallback((value: string) => {
    const days: HistoryRetentionDays = value === 'never' ? null : Number(value) as 7 | 30 | 90;
    store.setRetentionDays(days); setRetentionDays(days); refresh();
  }, [store, refresh]);

  const handleImportBundle = useCallback(async (file: File | undefined) => {
    setImportError(''); setImportPreview(null); if (!file) return;
    try {
      const bundle = JSON.parse(await file.text()) as SafeResultBundle;
      if (!verifyPortableResultBundle(bundle).valid || bundle.inputIncluded !== false || bundle.replayable !== false) throw new Error('结果包完整性校验失败。');
      const facts = bundle.verifiedFacts.map((claim) => {
        const record = claim && typeof claim === 'object' ? claim as Record<string, unknown> : {};
        return { label: String(record.kind ?? '结构化事实'), value: canonicalStringify(record.value ?? claim), tool: bundle.tool };
      });
      setImportPreview(store.preview({ module: bundle.tool, title: `可复核结果包 · ${bundle.tool}`, summary: `已验证完整性，包含 ${facts.length} 项已核验结构化事实。`, tags: ['结果包', bundle.tool], mode: 'verified-bundle', reportVersion: bundle.resultVersion, capabilityMode: '已核验本地结果包', inputSummary: '不包含原始输入，不能 replay。', verifiedFacts: facts, resultBundle: bundle }));
    } catch (error) { setImportError(error instanceof Error ? error.message : '无法读取结果包。'); }
  }, [store]);

  const handleExportBundle = useCallback((entry: HistoryEntry) => {
    if (!entry.resultBundle || !verifyPortableResultBundle(entry.resultBundle).valid) return;
    const blob = new Blob([`${canonicalStringify(entry.resultBundle)}
`], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${entry.resultBundle.tool}-verified-bundle.json`; link.click(); URL.revokeObjectURL(url);
  }, []);

  const displayList = tab === 'history' ? entries : favorites;
  const contextPayload = useMemo(
    () => ({
      module: 'history',
      mode: 'history-panel',
      historyCount: entries.length,
      favoritesCount: favorites.length,
      maxHistory: 30,
    }),
    [entries.length, favorites.length],
  );

  return (
    <section className="space-y-4">
      {/* 标题区 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">本地历史与收藏</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              默认不保存。每次操作后仅在您确认“保存脱敏摘要”时写入本机；保存前会显示预览，不保存完整姓名、完整出生日期、具体地点或原始问题。
            </p>
          </div>
          <CopyContextButton commandScope="history" title="历史记录摘要" payload={contextPayload} />
        </div>
        {!store && (
          <p className="mt-3 rounded-card border border-cinnabar-500/30 bg-cinnabar-500/10 p-3 text-sm text-red-200">
            暂无历史记录。排盘后可导出或复制摘要。
          </p>
        )}
      </div>

      <section className="rounded-panel border border-white/8 bg-white/[0.025] p-4" aria-label="本地历史隐私设置">
        <div className="grid gap-3 md:grid-cols-3 md:items-end">
          <label className="text-xs text-jade-100/60">自动过期<select aria-label="历史自动过期" value={retentionDays === null ? 'never' : String(retentionDays)} onChange={(event) => handleRetention(event.target.value)} className="mt-1 w-full rounded border border-white/10 bg-ink-900 px-3 py-2"><option value="7">7 天</option><option value="30">30 天</option><option value="90">90 天</option><option value="never">永不过期</option></select></label>
          <label className="rounded border border-jade-500/20 px-3 py-2 text-center text-xs text-jade-300">导入可复核结果包<input aria-label="导入可复核结果包" type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void handleImportBundle(event.target.files?.[0])} /></label>
          <button type="button" onClick={() => { if (confirm('确定清空全部历史与收藏？')) { store.clearAll(); refresh(); } }} className="rounded border border-cinnabar-500/25 px-3 py-2 text-xs text-cinnabar-300">一键清空全部</button>
        </div>
        {importError && <p role="alert" className="mt-3 text-xs text-cinnabar-300">{importError}</p>}
        {importPreview && <div data-testid="bundle-import-preview" className="mt-3 rounded border border-gold-500/25 bg-gold-500/5 p-3"><p className="text-xs font-semibold text-gold-300">导入前预览</p><p className="mt-1 text-sm text-jade-100">{importPreview.title}</p><p className="mt-1 text-xs text-jade-100/55">{importPreview.summary}</p><div className="mt-2 flex gap-2"><button onClick={() => setImportPreview(null)} className="text-xs">取消</button><button onClick={() => { store.add(importPreview); setImportPreview(null); refresh(); }} className="rounded bg-jade-500/15 px-3 py-1 text-xs">保存到本地历史</button></div></div>}
      </section>

      {/* 摘要仪表盘 */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-jade-500">{entries.length}</p>
          <p className="mt-1 text-sm text-jade-100/55">历史记录</p>
        </div>
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-amber-400">{favorites.length}</p>
          <p className="mt-1 text-sm text-jade-100/55">收藏</p>
        </div>
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-jade-100">30</p>
          <p className="mt-1 text-sm text-jade-100/55">最大保留数</p>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('history')}
          className={[
            'rounded-full border px-4 py-2 text-xs font-medium transition',
            tab === 'history'
              ? 'border-jade-500/40 bg-jade-500/12 text-jade-50'
              : 'border-white/10 bg-white/[0.035] text-jade-100/55 hover:text-jade-100',
          ].join(' ')}
        >
          历史 ({entries.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('favorites')}
          className={[
            'rounded-full border px-4 py-2 text-xs font-medium transition',
            tab === 'favorites'
              ? 'border-amber-500/40 bg-amber-500/12 text-jade-50'
              : 'border-white/10 bg-white/[0.035] text-jade-100/55 hover:text-jade-100',
          ].join(' ')}
        >
          收藏 ({favorites.length})
        </button>
        <div className="flex-1" />
        {tab === 'history' && entries.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="rounded-full border border-white/10 px-3 py-2 text-xs text-jade-100/45 transition hover:border-cinnabar-500/30 hover:text-cinnabar-500"
          >
            清空历史
          </button>
        )}
        {tab === 'favorites' && favorites.length > 0 && (
          <button
            type="button"
            onClick={handleClearFavorites}
            className="rounded-full border border-white/10 px-3 py-2 text-xs text-jade-100/45 transition hover:border-cinnabar-500/30 hover:text-cinnabar-500"
          >
            清空收藏
          </button>
        )}
      </div>

      {/* 列表 */}
      <div className="grid gap-3 md:grid-cols-2">
        {displayList.length === 0 ? (
          <div className="col-span-full rounded-card border border-white/8 bg-white/[0.025] p-8 text-center">
            <p className="text-sm text-jade-100/45">
              {tab === 'history'
                ? '暂无历史记录。操作后可在预览中主动保存脱敏摘要。'
                : '暂无收藏。点击历史记录中的 ☆ 标记可添加收藏。'}
            </p>
          </div>
        ) : (
          displayList.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onToggleFav={handleToggleFav}
              onRemove={handleRemove}
              onExportBundle={handleExportBundle}
            />
          ))
        )}
      </div>

      {/* 隐私说明 */}
      <div className="rounded-card border border-jade-500/20 bg-jade-500/8 p-3">
        <p className="text-xs leading-5 text-jade-100/55">
          隐私保护：HistoryStore 使用 <code className="text-jade-500">localStorage</code> 存储脱敏摘要，
          不保存完整姓名、完整出生日期（<code className="text-jade-500">YYYY-MM-DD</code> 格式会被自动替换为 ****）或具体地点。
          数据完全本地化，不上传任何服务器。
        </p>
      </div>
    </section>
  );
}
