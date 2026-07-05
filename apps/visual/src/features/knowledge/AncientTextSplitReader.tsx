import { useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';

// 构建时导入古籍原文和映射 JSON（Vite ?raw）
import bazhaiText from '@kb/fengshui/03-yang-house/八宅明镜.md?raw';
import eightMansionsJson from '@kb/fengshui/mappings/eight-mansions.json?raw';
import lifeTrigramJson from '@kb/fengshui/mappings/life-trigram.json?raw';
import twentyFourMountainsJson from '@kb/fengshui/mappings/twenty-four-mountains.json?raw';

/* ── 文本对 ───────────────────────────────────────────── */

interface TextPair {
  id: string;
  title: string;
  description: string;
  source: string;
  mappingName: string;
  mappingJson: string;
}

const TEXT_PAIRS: TextPair[] = [
  {
    id: 'bazhai-mansion',
    title: '八宅明镜 ↔ 八宅大游年映射',
    description: '清代箬冠道人《八宅明镜》原文与 eight-mansions.json 映射表对照。',
    source: bazhaiText,
    mappingName: 'eight-mansions.json',
    mappingJson: eightMansionsJson,
  },
  {
    id: 'bazhai-life-trigram',
    title: '八宅明镜 ↔ 命卦映射',
    description: '《八宅明镜》论男女生命部分与 life-trigram.json 命卦计算表对照。',
    source: bazhaiText,
    mappingName: 'life-trigram.json',
    mappingJson: lifeTrigramJson,
  },
  {
    id: 'bazhai-24mountains',
    title: '八宅明镜 ↔ 二十四山映射',
    description: '《八宅明镜》后天八卦方位部分与 twenty-four-mountains.json 对照。',
    source: bazhaiText,
    mappingName: 'twenty-four-mountains.json',
    mappingJson: twentyFourMountainsJson,
  },
];

/* ── 简易 Markdown 渲染 ───────────────────────────────── */

function renderMarkdownLite(text: string): string {
  const h1Open = '<h1 class="text-zinc-50 font-serif text-xl font-bold mt-5 mb-3">';
  const h2Open = '<h2 class="text-zinc-100 font-serif text-lg font-semibold mt-5 mb-2">';
  const h3Open = '<h3 class="text-zinc-300 font-semibold mt-4 mb-2">';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, `${h3Open}$1</h3>`)
    .replace(/^## (.+)$/gm, `${h2Open}$1</h2>`)
    .replace(/^# (.+)$/gm, `${h1Open}$1</h1>`)
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-jade-500/30 pl-3 text-zinc-400 italic my-2">$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-200">$1</strong>')
    .replace(/^---$/gm, '<hr class="border-white/8 my-3" />')
    .replace(/\n\n/g, '</p><p class="text-zinc-300 leading-7 my-1">')
    .replace(/^/, '<p class="text-zinc-300 leading-7 my-1">')
    .replace(/$/, '</p>');
}

/* ── JSON 高亮 ───────────────────────────────────────── */

function highlightJson(json: string): string {
  const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/"([^"]+)"(\s*:)/g, '<span class="text-jade-500">"$1"</span>$2')
    .replace(/:\s*"([^"]+)"/g, ': <span class="text-amber-400">"$1"</span>')
    .replace(/:\s*(\d+)/g, ': <span class="text-purple-400">$1</span>')
    .replace(/\b(true|false|null)\b/g, '<span class="text-purple-400">$1</span>');
}

/* ── 主组件 ───────────────────────────────────────────── */

export function AncientTextSplitReader() {
  const [selectedId, setSelectedId] = useState(TEXT_PAIRS[0].id);
  const [searchTerm, setSearchTerm] = useState('');

  const selected = TEXT_PAIRS.find((p) => p.id === selectedId) ?? TEXT_PAIRS[0];

  // 搜索：在原文中高亮匹配的行
  const highlightedSource = useMemo(() => {
    const html = renderMarkdownLite(selected.source);
    if (!searchTerm) return html;
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return html.replace(
      new RegExp(escaped, 'gi'),
      '<mark class="bg-amber-500/30 text-amber-100 rounded px-0.5">$&</mark>',
    );
  }, [selected, searchTerm]);

  const highlightedJson = useMemo(() => highlightJson(selected.mappingJson), [selected]);

  const contextPayload = useMemo(
    () => ({
      module: 'split-reader',
      mode: 'ancient-text-split-reader',
      selectedPair: selected.id,
      sourceLength: selected.source.length,
      mappingLength: selected.mappingJson.length,
      searchTerm,
    }),
    [selected, searchTerm],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-100">古籍 Split Reader</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
              左侧显示古籍 Markdown 原文，右侧显示映射 JSON 结构，支持关键词搜索高亮。Phase 8 雏形——先内置八宅明镜与映射表对照。
            </p>
          </div>
          <CopyContextButton commandScope="reader" title="Split Reader 上下文" payload={contextPayload} />
        </div>
      </div>

      {/* 文本对选择器 */}
      <div className="flex flex-wrap gap-2">
        {TEXT_PAIRS.map((pair) => (
          <button
            key={pair.id}
            type="button"
            onClick={() => setSelectedId(pair.id)}
            className={[
              'shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition',
              pair.id === selectedId
                ? 'border-jade-500/40 bg-jade-500/12 text-zinc-50'
                : 'border-transparent text-zinc-500 hover:border-white/10 hover:text-zinc-200',
            ].join(' ')}
          >
            {pair.title}
          </button>
        ))}
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-3 rounded-panel border border-ink-700 bg-black/24 p-3">
        <span className="font-mono text-sm text-jade-500">🔍</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索原文关键词…"
          className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            清除
          </button>
        )}
      </div>

      {/* Split View */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* 左侧：古籍原文 */}
        <div className="rounded-panel border border-ink-700 bg-ink-850/60 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2">
            <h3 className="font-serif text-sm font-semibold text-zinc-300">古籍原文</h3>
            <span className="text-[10px] text-zinc-500">{selected.source.length} 字符</span>
          </div>
          <div
            className="max-h-[60vh] overflow-y-auto pr-2 text-sm leading-7"
            dangerouslySetInnerHTML={{ __html: highlightedSource }}
          />
        </div>

        {/* 右侧：映射 JSON */}
        <div className="rounded-panel border border-ink-700 bg-ink-850/60 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2">
            <h3 className="font-serif text-sm font-semibold text-zinc-300">{selected.mappingName}</h3>
            <span className="text-[10px] text-zinc-500">{selected.mappingJson.length} 字符</span>
          </div>
          <pre className="max-h-[60vh] overflow-auto rounded-card border border-white/8 bg-black/30 p-3 text-xs leading-5">
            <code dangerouslySetInnerHTML={{ __html: highlightedJson }} />
          </pre>
        </div>
      </div>

      {/* 说明 */}
      <div className="rounded-card border border-jade-500/20 bg-jade-500/8 p-3">
        <p className="text-xs leading-5 text-zinc-400">
          Split Reader 雏形通过 Vite <code className="text-jade-500">?raw</code> 在构建时导入古籍 Markdown 和映射 JSON，
          无需运行时文件读取。后续可扩展为 manifest 驱动的多文本选择器和 AST 级高亮关联。
        </p>
      </div>
    </section>
  );
}
