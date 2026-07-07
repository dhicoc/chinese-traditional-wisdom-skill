import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ModuleId } from '@/lib/modules';
import { MODULES, getModuleById } from '@/lib/modules';
import { dispatchCopyContextIntent, dispatchYearIntent, extractCommandYear } from '@/lib/commandIntents';

/* ── 类型 ─────────────────────────────────────────────── */

interface CommandItem {
  id: string;
  label: string;
  hint: string;
  group: string;
  keywords: string[];
  action: () => void;
}

interface CommandBarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

/* ── 命令面板 ─────────────────────────────────────────── */

function fuzzyMatch(query: string, item: CommandItem): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (item.label.toLowerCase().includes(q)) return true;
  if (item.hint.toLowerCase().includes(q)) return true;
  return item.keywords.some((kw) => kw.toLowerCase().includes(q));
}

function CommandPalette({
  items,
  onDismiss,
  getDynamicItems,
}: {
  items: CommandItem[];
  onDismiss: () => void;
  getDynamicItems?: (query: string) => CommandItem[];
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allItems = useMemo(
    () => [...items, ...(getDynamicItems?.(query) ?? [])],
    [items, getDynamicItems, query],
  );
  const filtered = useMemo(() => allItems.filter((item) => fuzzyMatch(query, item)), [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[selectedIndex];
        if (item) {
          item.action();
          onDismiss();
        }
      }
    },
    [filtered, selectedIndex, onDismiss],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[12vh] backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-panel border border-ink-700 bg-ink-850/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索输入 */}
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
          <span className="font-mono text-sm text-jade-400">›</span>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索工具、切换标签、输入 2026 跳转年份、复制上下文…"
            className="flex-1 bg-transparent text-sm text-jade-100 placeholder:text-jade-100/25 focus:outline-none"
          />
          <kbd className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-jade-100/35">
            ESC
          </kbd>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-jade-100/40">无匹配结果</p>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  item.action();
                  onDismiss();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={[
                  'flex w-full items-center gap-3 rounded-card border px-3 py-2.5 text-left transition',
                  index === selectedIndex
                    ? 'border-jade-500/30 bg-jade-500/10'
                    : 'border-transparent hover:bg-white/[0.04]',
                ].join(' ')}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-jade-100">{item.label}</p>
                  <p className="mt-0.5 truncate text-xs text-jade-100/35">{item.hint}</p>
                </div>
                <span className="shrink-0 rounded-full bg-black/25 px-2 py-0.5 text-[10px] text-jade-100/30">
                  {item.group}
                </span>
              </button>
            ))
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between border-t border-white/8 px-4 py-2 text-[10px] text-jade-100/25">
          <span>↑↓ 导航 · Enter 选择 · ESC 关闭</span>
          <span>{filtered.length} 项</span>
        </div>
      </div>
    </div>
  );
}

/* ── CommandBar 主组件 ────────────────────────────────── */

export function CommandBar({ activeModule, onSelectModule }: CommandBarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const active = getModuleById(activeModule);
  const inputRef = useRef<HTMLButtonElement>(null);

  // ⌘K / Ctrl+K 打开
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 构建命令列表
  const items = useMemo<CommandItem[]>(() => {
    const moduleItems: CommandItem[] = MODULES.filter((m) => m.id !== 'home').map((m) => ({
      id: `nav-${m.id}`,
      label: m.title,
      hint: `${m.group} · ${m.statusLabel} · ${m.questionTypes.join('/')}`,
      group: '导航',
      keywords: [m.id, m.shortTitle, m.title, ...m.questionTypes],
      action: () => onSelectModule(m.id),
    }));

    const actionItems: CommandItem[] = [
      {
        id: 'action-home',
        label: '回到首页',
        hint: '工作台 · 工具索引与能力边界',
        group: '操作',
        keywords: ['home', '首页', '工作台'],
        action: () => onSelectModule('home'),
      },
      {
        id: 'action-testing',
        label: '打开测试控制台',
        hint: 'Phase 9 · Node CLI / 浏览器 / 验证页',
        group: '操作',
        keywords: ['test', '测试', 'verify', 'CLI'],
        action: () => onSelectModule('testing'),
      },
      {
        id: 'action-copy-context',
        label: '复制当前模块 AI 上下文',
        hint: `${active.title} · ${active.statusLabel}`,
        group: '操作',
        keywords: ['copy', 'context', 'AI', '复制', '上下文'],
        action: () => dispatchCopyContextIntent(active.id),
      },
    ];

    return [...moduleItems, ...actionItems];
  }, [active, onSelectModule]);

  const getDynamicItems = useCallback(
    (query: string): CommandItem[] => {
      const year = extractCommandYear(query);
      if (!year) return [];
      return [
        {
          id: 'year-feixing-' + year,
          label: '查看 ' + year + ' 流年飞星',
          hint: '按年份跳转到流年飞星并更新九宫盘',
          group: '年份',
          keywords: [String(year), '流年', '飞星', '九宫', 'year', 'feixing'],
          action: () => {
            dispatchYearIntent('feixing', year);
            onSelectModule('feixing');
          },
        },
        {
          id: 'year-yunqi-' + year,
          label: '查看 ' + year + ' 五运六气',
          hint: '按年份跳转到五运六气并更新岁运、司天、在泉',
          group: '年份',
          keywords: [String(year), '五运六气', '岁运', '司天', '在泉', 'year', 'yunqi'],
          action: () => {
            dispatchYearIntent('yunqi', year);
            onSelectModule('yunqi');
          },
        },
      ];
    },
    [onSelectModule],
  );

  return (
    <>
      <header className="app-topbar sticky top-4 z-20 rounded-[24px] border border-jade-500/18 bg-ink-950/90 p-3 shadow-instrument backdrop-blur-xl">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <button
            ref={inputRef}
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex min-h-12 items-center gap-3 rounded-[18px] border border-white/10 bg-black/30 px-4 text-left text-jade-100/55 transition hover:border-jade-500/30 hover:text-jade-100 active:scale-[0.99]"
            aria-label="打开命令面板 (⌘K)"
          >
            <span className="font-mono text-jade-400">⌘K</span>
            <span className="min-w-0 flex-1 truncate text-sm">搜索工具、切换标签、输入年份、复制 AI 上下文</span>
            <span className="hidden rounded-full border border-white/10 px-2 py-1 text-[10px] text-jade-100/30 md:inline-flex">COMMAND</span>
          </button>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            {MODULES.slice(0, 6).map((module) => (
              <button
                key={module.id}
                type="button"
                onClick={() => onSelectModule(module.id)}
                className={[
                  'rounded-full border px-3.5 py-2 text-xs font-medium transition active:scale-[0.98]',
                  module.id === active.id
                    ? 'border-cinnabar-500/50 bg-cinnabar-500 text-jade-50'
                    : 'border-white/10 bg-white/[0.035] text-jade-100/60 hover:border-gold-500/25 hover:text-jade-100',
                ].join(' ')}
              >
                {module.shortTitle}
              </button>
            ))}
            <button
              type="button"
              onClick={() => dispatchCopyContextIntent(active.id)}
              className="rounded-full border border-jade-500/25 bg-jade-500/10 px-3.5 py-2 text-xs font-medium text-jade-400 transition hover:border-jade-500/40 active:scale-[0.98]"
            >
              复制上下文
            </button>
          </div>
        </div>
      </header>

      {paletteOpen && (
        <CommandPalette
          items={items}
          getDynamicItems={getDynamicItems}
          onDismiss={() => setPaletteOpen(false)}
        />
      )}
    </>
  );
}
