import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import {
  consumeReaderSearchIntent,
  READER_SEARCH_INTENT_EVENT,
  type ReaderSearchIntentDetail,
} from '@/lib/commandIntents';
import { createKnowledgeCitationId, findKnowledgeBaseEntry } from '@/legacy/searchEngine';

import bazhaiText from '@kb/fengshui/03-yang-house/八宅明镜.md?raw';

/* ── 文本对 ───────────────────────────────────────────── */

interface TextPair {
  id: string;
  title: string;
  description: string;
  source: string;
  mappingName: string;
}

const BAZHAI_CITATION_ID = createKnowledgeCitationId('03-yang-house/八宅明镜.md');

const TEXT_PAIRS: TextPair[] = [
  {
    id: 'bazhai-mansion',
    title: '八宅明镜 ↔ 八宅大游年映射',
    description: '清代箬冠道人《八宅明镜》原文与八宅大游年相关说明对照。',
    source: bazhaiText,
    mappingName: '八宅大游年说明',
  },
  {
    id: 'bazhai-life-trigram',
    title: '八宅明镜 ↔ 命卦映射',
    description: '《八宅明镜》论男女生命部分与命卦相关说明对照。',
    source: bazhaiText,
    mappingName: '命卦说明',
  },
  {
    id: 'bazhai-24mountains',
    title: '八宅明镜 ↔ 二十四山映射',
    description: '《八宅明镜》后天八卦方位部分与二十四山相关说明对照。',
    source: bazhaiText,
    mappingName: '二十四山说明',
  },
];

/* ── 简易 Markdown 渲染 ───────────────────────────────── */

function renderMarkdownLite(text: string): string {
  const h1Open = '<h1 class="text-jade-50 font-serif text-xl font-bold mt-5 mb-3">';
  const h2Open = '<h2 class="text-jade-100 font-serif text-lg font-semibold mt-5 mb-2">';
  const h3Open = '<h3 class="text-jade-100/70 font-semibold mt-4 mb-2">';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, `${h3Open}$1</h3>`)
    .replace(/^## (.+)$/gm, `${h2Open}$1</h2>`)
    .replace(/^# (.+)$/gm, `${h1Open}$1</h1>`)
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-jade-500/30 pl-3 text-jade-100/55 italic my-2">$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-jade-100/80">$1</strong>')
    .replace(/^---$/gm, '<hr class="border-white/8 my-3" />')
    .replace(/\n\n/g, '</p><p class="text-jade-100/70 leading-7 my-1">')
    .replace(/^/, '<p class="text-jade-100/70 leading-7 my-1">')
    .replace(/$/, '</p>');
}

/* ── 主组件 ───────────────────────────────────────────── */

export function AncientTextSplitReader() {
  const [selectedId, setSelectedId] = useState(TEXT_PAIRS[0].id);
  const [selectedCitationId, setSelectedCitationId] = useState(BAZHAI_CITATION_ID);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    function applyReaderSearchIntent(detail: ReaderSearchIntentDetail | null) {
      if (!detail?.term) return;
      setSearchTerm(detail.term);
      setSelectedCitationId(detail.citationId ?? BAZHAI_CITATION_ID);
    }

    function handleReaderSearchIntent(event: Event) {
      applyReaderSearchIntent(consumeReaderSearchIntent() ?? (event as CustomEvent<ReaderSearchIntentDetail>).detail);
    }

    applyReaderSearchIntent(consumeReaderSearchIntent());
    window.addEventListener(READER_SEARCH_INTENT_EVENT, handleReaderSearchIntent);
    return () => window.removeEventListener(READER_SEARCH_INTENT_EVENT, handleReaderSearchIntent);
  }, []);

  const selected = TEXT_PAIRS.find((p) => p.id === selectedId) ?? TEXT_PAIRS[0];
  const selectedBook = findKnowledgeBaseEntry(selectedCitationId);
  const hasEmbeddedText = selectedCitationId === BAZHAI_CITATION_ID;

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

  const contextPayload = useMemo(
    () => ({
      项目: '古籍阅读',
      当前内容: selectedBook?.title ?? selected.title,
      搜索关键词: searchTerm || '未填写',
    }),
    [selected, selectedBook, selectedCitationId, searchTerm],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">古籍阅读</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              阅读古籍原文与相关说明，支持关键词搜索与重点标记；现收录《八宅明镜》。
            </p>
            <div className="mt-3 rounded-card border border-white/10 bg-black/20 p-3 text-xs leading-5 text-jade-100/55">
              <p>当前古籍：{selectedBook?.title ?? '未识别的古籍条目'}</p>
              <p className="mt-1 text-jade-300">已关联古籍引用。</p>
              {!hasEmbeddedText && (
                <p className="mt-2 text-amber-200">该古籍已建立稳定引用，但正文尚未内嵌到阅读器。</p>
              )}
            </div>
            <p className="mt-3 rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
              古籍阅读内容仅作传统文化知识学习参考，不作为现实决策依据。
            </p>
          </div>
          <CopyContextButton commandScope="reader" title="古籍阅读摘要" payload={contextPayload} />
        </div>
      </div>

      {hasEmbeddedText ? (
        <>
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
                    ? 'border-jade-500/40 bg-jade-500/12 text-jade-50'
                    : 'border-transparent text-jade-100/45 hover:border-white/10 hover:text-jade-100/80',
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
              className="flex-1 bg-transparent text-sm text-jade-100 placeholder:text-jade-100/55 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-xs text-jade-100/45 hover:text-jade-100/70"
              >
                清除
              </button>
            )}
          </div>

          {/* Split View */}
          <div className="grid gap-4 xl:grid-cols-2">
            {/* 左侧：古籍原文 */}
            <div className="min-w-0 rounded-panel border border-ink-700 bg-ink-850/60 p-4">
              <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2">
                <h3 className="font-serif text-sm font-semibold text-jade-100/70">古籍原文</h3>
              </div>
              <div
                className="max-h-[60vh] overflow-y-auto pr-2 text-sm leading-7"
                dangerouslySetInnerHTML={{ __html: highlightedSource }}
              />
            </div>

            {/* 右侧：相关说明 */}
            <div className="min-w-0 rounded-panel border border-ink-700 bg-ink-850/60 p-4">
              <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2">
                <h3 className="font-serif text-sm font-semibold text-jade-100/70">相关说明</h3>
              </div>
              <p className="rounded-card border border-white/8 bg-black/30 p-3 text-sm leading-7 text-jade-100/65">
                本页将《八宅明镜》原文与{selected.mappingName}并列阅读，便于对照理解传统术语与方位关系。
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-panel border border-amber-300/20 bg-amber-500/5 p-4 text-sm leading-7 text-jade-100/65">
          当前古籍正文尚未收录到阅读器；相关引用已保留，待后续补充原文。
        </div>
      )}
    </section>
  );
}
