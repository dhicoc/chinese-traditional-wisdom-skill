import { useEffect, useMemo, useRef, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import {
  consumeReaderSearchIntent,
  READER_SEARCH_INTENT_EVENT,
  type ReaderSearchIntentDetail,
} from '@/lib/commandIntents';
import { getCanonicalHexagram, type CanonicalHexagram } from '@/legacy/ichingTexts';
import {
  createKnowledgeCitationId,
  findKnowledgeBaseEntry,
  listKnowledgeBaseEntries,
  type KnowledgeBaseEntry,
} from '@/legacy/searchEngine';
import { renderReaderMarkdown } from './readerMarkdown';

import bazhaiText from '@kb/fengshui/03-yang-house/八宅明镜.md?raw';

const BOOK_LOADERS = import.meta.glob<string>([
  '../../../../../knowledge-base/fengshui/**/*.md',
  '!../../../../../knowledge-base/fengshui/mappings/**',
  '!../../../../../knowledge-base/fengshui/_index.md',
], { query: '?raw', import: 'default' });

interface ReadingGuide {
  id: string;
  title: string;
  description: string;
}

interface IChingReading {
  hexagram: CanonicalHexagram;
  changingHexagram: CanonicalHexagram | null;
  changingLines: number[];
}

const BAZHAI_CITATION_ID = createKnowledgeCitationId('03-yang-house/八宅明镜.md');
const COLLECTION = listKnowledgeBaseEntries();
const CATEGORIES = ['全部', ...Array.from(new Set(COLLECTION.map((entry) => entry.category)))];

const BAZHAI_GUIDES: ReadingGuide[] = [
  {
    id: 'bazhai-mansion',
    title: '大游年方位',
    description: '结合“游年歌”阅读八宅方位与九星次序，先认识歌诀中的简称，再对照正文理解其传统用法。',
  },
  {
    id: 'bazhai-life-trigram',
    title: '命卦入门',
    description: '从书中“论男女生命”等篇目入手，了解命卦、东四与西四的传统分类方式。',
  },
  {
    id: 'bazhai-24mountains',
    title: '二十四山',
    description: '阅读后天八卦、方位和二十四山相关段落，留意不同概念所处的层次，不把方位名称混为一谈。',
  },
];

const COMPLETENESS_LABELS: Record<string, string> = {
  完整: '全文收录',
  部分: '节选收录',
  目录: '目录收录',
  框架: '内容提要',
};

function completenessLabel(value: string | undefined): string {
  if (!value) return '馆藏篇目';
  return COMPLETENESS_LABELS[value] ?? value;
}

function toIChingReading(detail: ReaderSearchIntentDetail): IChingReading | null {
  if (!detail.iching) return null;
  const hexagram = getCanonicalHexagram(detail.iching.hexagramNumber);
  if (!hexagram || hexagram.name !== detail.iching.hexagramName) return null;

  const changingLines = Array.from(new Set(detail.iching.changingLines))
    .filter((line) => Number.isInteger(line) && line >= 1 && line <= 6)
    .sort((a, b) => a - b);
  const changingHexagram = changingLines.length && detail.iching.changingHexagramNumber
    ? getCanonicalHexagram(detail.iching.changingHexagramNumber)
    : null;
  if (changingHexagram && changingHexagram.name !== detail.iching.changingHexagramName) return null;
  return { hexagram, changingHexagram, changingLines };
}

function ClassicalTextCard({ title, hexagram, changingLines }: {
  title: string;
  hexagram: CanonicalHexagram;
  changingLines?: number[];
}) {
  return (
    <article className="min-w-0 rounded-panel border border-ink-700 bg-ink-850/60 p-5">
      <div className="mb-5 border-b border-white/10 pb-4">
        <p className="text-xs font-semibold tracking-[0.18em] text-jade-400/75">{title}</p>
        <h3 className="mt-2 font-serif text-2xl font-semibold text-jade-100">第{hexagram.number}卦 · {hexagram.name}</h3>
        <p className="mt-2 text-sm text-jade-100/55">上{hexagram.upperTrigram} · 下{hexagram.lowerTrigram}</p>
      </div>
      <div className="space-y-5 font-serif text-[15px] leading-8 text-jade-100/72">
        <section aria-labelledby={`${title}-${hexagram.number}-judgment`}>
          <h4 id={`${title}-${hexagram.number}-judgment`} className="font-semibold text-jade-100">卦辞</h4>
          <p className="mt-2">{hexagram.guaCi}</p>
        </section>
        {changingLines?.length ? (
          <section aria-labelledby={`${title}-${hexagram.number}-moving-lines`}>
            <h4 id={`${title}-${hexagram.number}-moving-lines`} className="font-semibold text-jade-100">本次动爻</h4>
            <div className="mt-2 space-y-3">
              {changingLines.map((line) => hexagram.yaoCi[line - 1] ? (
                <div key={line} className="rounded-card border border-cinnabar-500/20 bg-cinnabar-500/5 p-3">
                  <p className="text-xs font-semibold text-cinnabar-300">第{line}爻</p>
                  <p className="mt-1">{hexagram.yaoCi[line - 1]}</p>
                </div>
              ) : null)}
            </div>
          </section>
        ) : null}
        <details className="rounded-card border border-white/10 bg-black/20 p-3">
          <summary className="cursor-pointer font-sans text-sm font-semibold text-jade-100/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40">查看六爻全文</summary>
          <ol className="mt-3 space-y-3">
            {hexagram.yaoCi.map((text, index) => (
              <li key={text} className="border-t border-white/8 pt-3 first:border-0 first:pt-0">
                <span className="mr-2 font-sans text-xs text-jade-400">第{index + 1}爻</span>{text}
              </li>
            ))}
          </ol>
        </details>
        <section aria-labelledby={`${title}-${hexagram.number}-tuan`}>
          <h4 id={`${title}-${hexagram.number}-tuan`} className="font-semibold text-jade-100">彖传</h4>
          <p className="mt-2">{hexagram.tuanZhuan}</p>
        </section>
      </div>
    </article>
  );
}

function splitCitation(citationId: string): { bookCitationId: string; anchor: string | null; file: string | null } {
  const [bookCitationId, anchor] = citationId.split('#');
  const prefix = 'kb://fengshui/';
  return {
    bookCitationId,
    anchor: anchor || null,
    file: bookCitationId.startsWith(prefix) ? bookCitationId.slice(prefix.length) : null,
  };
}

function findBookLoader(file: string): (() => Promise<string>) | null {
  const normalized = file.replace(/\\/g, '/');
  const entry = Object.entries(BOOK_LOADERS).find(([key]) => key.replace(/\\/g, '/').endsWith(`/fengshui/${normalized}`));
  return entry?.[1] ?? null;
}

function matchesCatalog(entry: KnowledgeBaseEntry, query: string, category: string): boolean {
  if (category !== '全部' && entry.category !== category) return false;
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [entry.title, entry.author, entry.summary, ...entry.tags]
    .some((value) => value.toLowerCase().includes(normalized));
}

export function AncientTextSplitReader() {
  const [selectedGuideId, setSelectedGuideId] = useState(BAZHAI_GUIDES[0].id);
  const [selectedCitationId, setSelectedCitationId] = useState(BAZHAI_CITATION_ID);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [searchTerm, setSearchTerm] = useState('');
  const [ichingReading, setIChingReading] = useState<IChingReading | null>(null);
  const [loadedText, setLoadedText] = useState<string | null>(bazhaiText);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle');
  const sourceContainerRef = useRef<HTMLDivElement>(null);
  const readingHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    function applyReaderSearchIntent(detail: ReaderSearchIntentDetail | null) {
      if (!detail?.term) return;
      const nextIChingReading = toIChingReading(detail);
      setIChingReading(nextIChingReading);
      setSearchTerm(detail.term);
      if (!nextIChingReading) setSelectedCitationId(detail.citationId ?? BAZHAI_CITATION_ID);
    }

    function handleReaderSearchIntent(event: Event) {
      applyReaderSearchIntent(consumeReaderSearchIntent() ?? (event as CustomEvent<ReaderSearchIntentDetail>).detail);
    }

    applyReaderSearchIntent(consumeReaderSearchIntent());
    window.addEventListener(READER_SEARCH_INTENT_EVENT, handleReaderSearchIntent);
    return () => window.removeEventListener(READER_SEARCH_INTENT_EVENT, handleReaderSearchIntent);
  }, []);

  useEffect(() => {
    const { bookCitationId, file } = splitCitation(selectedCitationId);
    if (!file || bookCitationId === BAZHAI_CITATION_ID) {
      setLoadedText(bazhaiText);
      setLoadState('idle');
      return;
    }
    const loader = findBookLoader(file);
    if (!loader) {
      setLoadedText(null);
      setLoadState('error');
      return;
    }
    let cancelled = false;
    setLoadedText(null);
    setLoadState('loading');
    void loader()
      .then((source) => {
        if (!cancelled) {
          setLoadedText(source);
          setLoadState('idle');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedText(null);
          setLoadState('error');
        }
      });
    return () => { cancelled = true; };
  }, [selectedCitationId]);

  const selectedGuide = BAZHAI_GUIDES.find((guide) => guide.id === selectedGuideId) ?? BAZHAI_GUIDES[0];
  const selectedBook = findKnowledgeBaseEntry(selectedCitationId);
  const { bookCitationId, anchor: selectedAnchor } = splitCitation(selectedCitationId);
  const readerSource = useMemo(
    () => (loadedText ?? '').replace(
      /^>\s*本文件[爲为]知[識识]庫整理版，非商[業业]用途\s*$/gm,
      '> 整理说明：本页据公开版本整理，供文化阅读。',
    ),
    [loadedText],
  );
  const renderedSource = useMemo(
    () => renderReaderMarkdown(readerSource, searchTerm),
    [readerSource, searchTerm],
  );
  const filteredBooks = useMemo(
    () => COLLECTION.filter((entry) => matchesCatalog(entry, catalogQuery, category)),
    [catalogQuery, category],
  );

  useEffect(() => {
    if (!loadedText) return;
    const frame = window.requestAnimationFrame(() => {
      if (selectedAnchor) {
        sourceContainerRef.current
          ?.querySelector<HTMLElement>(`#${CSS.escape(selectedAnchor)}`)
          ?.scrollIntoView({ block: 'start' });
      } else if (searchTerm) {
        sourceContainerRef.current?.querySelector<HTMLElement>('mark')?.scrollIntoView({ block: 'center' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadedText, renderedSource.html, searchTerm, selectedAnchor]);

  const contextPayload = useMemo(() => ({
    内容: ichingReading ? `《周易》${ichingReading.hexagram.name}卦` : selectedBook?.title ?? '古籍阅读',
    作者: ichingReading ? '《周易》' : selectedBook?.author || '未详',
    阅读重点: searchTerm || '未指定',
  }), [ichingReading, searchTerm, selectedBook]);

  function selectBook(entry: KnowledgeBaseEntry) {
    setIChingReading(null);
    setSelectedCitationId(entry.citationId);
    setSearchTerm('');
    setSelectedGuideId(BAZHAI_GUIDES[0].id);
    window.requestAnimationFrame(() => readingHeadingRef.current?.focus());
  }

  function returnToLibrary() {
    setIChingReading(null);
    setSearchTerm('');
    window.requestAnimationFrame(() => readingHeadingRef.current?.focus());
  }

  if (ichingReading) {
    return (
      <section className="space-y-4" aria-labelledby="iching-reading-title">
        <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-5 shadow-instrument">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-jade-400/75">周易原文</p>
              <h2 id="iching-reading-title" className="mt-2 font-serif text-2xl font-semibold text-jade-100">本次起卦原文</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/60">
                阅读本卦、动爻与变卦的原文。这里呈现典籍内容，不替您作出现实决定。
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-jade-100/60">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">本卦 · {ichingReading.hexagram.name}</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">动爻 · {ichingReading.changingLines.length ? ichingReading.changingLines.map((line) => `第${line}爻`).join('、') : '无'}</span>
                {ichingReading.changingHexagram ? <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">变卦 · {ichingReading.changingHexagram.name}</span> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={returnToLibrary} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-jade-100/70 transition hover:border-jade-500/30 hover:text-jade-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40">
                返回典籍书库
              </button>
              <CopyContextButton commandScope="reader" label="复制阅读摘要" title="古籍阅读摘要" payload={contextPayload} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ClassicalTextCard title="本卦" hexagram={ichingReading.hexagram} changingLines={ichingReading.changingLines} />
          {ichingReading.changingHexagram ? (
            <ClassicalTextCard title="变卦" hexagram={ichingReading.changingHexagram} />
          ) : (
            <div className="rounded-panel border border-dashed border-white/10 bg-black/16 p-6 text-sm leading-7 text-jade-100/60">
              本次没有动爻，因此不另列变卦。您仍可展开本卦的六爻全文继续阅读。
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="reader-title">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-5 shadow-instrument">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-jade-400/75">本地典籍书库</p>
            <h2 id="reader-title" className="mt-2 font-serif text-2xl font-semibold text-jade-100">古籍阅读</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/60">
              从书目中选择典籍，按书名、作者或主题查找，并在原文中检索您关心的词句。当前馆藏以传统风水文献为主。
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-jade-100/60">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">馆藏 {COLLECTION.length} 篇</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">{CATEGORIES.length - 1} 类主题</span>
              <span className="rounded-full border border-jade-500/20 bg-jade-500/10 px-3 py-1.5 text-jade-300">仅在本机阅读</span>
            </div>
          </div>
          <CopyContextButton commandScope="reader" label="复制阅读摘要" title="古籍阅读摘要" payload={contextPayload} />
        </div>
        <p className="mt-4 border-t border-white/8 pt-3 text-xs leading-6 text-jade-100/50">
          古籍中的术语和判断具有历史语境，适合文化学习与文献阅读，不作为现实决策依据。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(270px,330px)_minmax(0,1fr)]">
        <aside data-testid="reader-book-catalog" aria-labelledby="reader-catalog-title" className="min-w-0 rounded-panel border border-ink-700 bg-ink-850/60 p-4 xl:sticky xl:top-4 xl:self-start">
          <div className="border-b border-white/10 pb-3">
            <h3 id="reader-catalog-title" className="font-serif text-lg font-semibold text-jade-100">典籍书目</h3>
            <p className="mt-1 text-xs leading-5 text-jade-100/50">选择一篇典籍开始阅读</p>
          </div>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-jade-100/65">
              查找典籍
              <input
                id="reader-catalog-search"
                name="reader-catalog-search"
                type="search"
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                placeholder="输入书名、作者或主题"
                className="mt-2 w-full rounded-card border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-jade-100 placeholder:text-jade-100/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40"
              />
            </label>
            <label className="block text-xs font-semibold text-jade-100/65">
              典籍分类
              <select
                id="reader-category"
                name="reader-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 w-full rounded-card border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-jade-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40"
              >
                {CATEGORIES.map((item) => <option key={item} value={item}>{item === '全部' ? '全部分类' : item}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-jade-100/45" role="status">找到 {filteredBooks.length} 篇</p>
          <ul className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto pr-1">
            {filteredBooks.map((entry) => {
              const active = selectedBook?.citationId === entry.citationId;
              return (
                <li key={entry.citationId}>
                  <button
                    type="button"
                    onClick={() => selectBook(entry)}
                    aria-current={active ? 'page' : undefined}
                    data-testid="reader-book-item"
                    className={[
                      'min-h-11 w-full rounded-card border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40',
                      active
                        ? 'border-jade-500/35 bg-jade-500/10'
                        : 'border-transparent bg-black/15 hover:border-white/10 hover:bg-white/[0.03]',
                    ].join(' ')}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-serif text-sm font-semibold text-jade-100">{entry.title}</span>
                      <span className="shrink-0 rounded-full border border-white/8 px-2 py-0.5 text-[10px] text-jade-100/45">{completenessLabel(entry.completeness)}</span>
                    </span>
                    <span className="mt-1 block text-xs text-jade-100/45">{entry.author || '作者未详'} · {entry.category}</span>
                    <span className="mt-2 line-clamp-2 block text-xs leading-5 text-jade-100/55">{entry.summary}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {!filteredBooks.length ? (
            <div className="mt-3 rounded-card border border-dashed border-white/10 p-4 text-sm leading-6 text-jade-100/55">
              没有找到相符的典籍。可以换一个书名、作者或主题试试。
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 space-y-4">
          <article className="rounded-panel border border-ink-700 bg-ink-850/60 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-jade-400/75">正在阅读</p>
                <h3 ref={readingHeadingRef} tabIndex={-1} className="mt-2 font-serif text-2xl font-semibold text-jade-100 focus:outline-none">《{selectedBook?.title ?? '所选典籍'}》</h3>
                <p className="mt-2 text-sm text-jade-100/55">{selectedBook?.author || '作者未详'} · {selectedBook?.category || '传统典籍'}</p>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-jade-100/65">{selectedBook?.summary || '选择左侧书目后，即可在这里阅读正文。'}</p>
              </div>
              <span className="self-start rounded-full border border-gold-500/25 bg-gold-500/10 px-3 py-1.5 text-xs font-semibold text-gold-400">
                {completenessLabel(selectedBook?.completeness)}
              </span>
            </div>
          </article>

          {bookCitationId === BAZHAI_CITATION_ID ? (
            <nav aria-label="八宅明镜阅读导览" className="flex gap-2 overflow-x-auto pb-1">
              {BAZHAI_GUIDES.map((guide) => (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => setSelectedGuideId(guide.id)}
                  aria-pressed={guide.id === selectedGuideId}
                  className={[
                    'min-h-10 shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40',
                    guide.id === selectedGuideId
                      ? 'border-jade-500/40 bg-jade-500/12 text-jade-50'
                      : 'border-white/8 text-jade-100/50 hover:border-white/15 hover:text-jade-100/80',
                  ].join(' ')}
                >
                  {guide.title}
                </button>
              ))}
            </nav>
          ) : null}

          <div className="rounded-panel border border-ink-700 bg-black/20 p-4">
            <label className="block text-xs font-semibold text-jade-100/65" htmlFor="reader-text-search">在本篇中查找</label>
            <div className="mt-2 flex items-center gap-3 rounded-card border border-white/10 bg-black/20 px-3 py-2.5 focus-within:ring-2 focus-within:ring-jade-500/40">
              <span aria-hidden="true" className="text-jade-400">⌕</span>
              <input
                id="reader-text-search"
                name="reader-text-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="输入原文中的词句，例如“生气”"
                className="min-w-0 flex-1 bg-transparent text-sm text-jade-100 placeholder:text-jade-100/35 focus:outline-none"
              />
              {searchTerm ? (
                <button type="button" onClick={() => setSearchTerm('')} className="shrink-0 rounded px-2 py-1 text-xs text-jade-100/55 hover:text-jade-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40">清除</button>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-jade-100/45" role="status" aria-live="polite">
              {searchTerm ? (renderedSource.matchCount ? `在本篇中找到 ${renderedSource.matchCount} 处` : '本篇中没有找到这个词句') : '输入关键词后，正文中的相同词句会被标出'}
            </p>
          </div>

          {loadState === 'loading' ? (
            <div role="status" className="rounded-panel border border-jade-500/20 bg-jade-500/5 p-6 text-sm text-jade-100/65">正在打开《{selectedBook?.title ?? '所选典籍'}》…</div>
          ) : null}

          {loadedText ? (
            <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
              <article className="min-w-0 rounded-panel border border-ink-700 bg-ink-850/60 p-5">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-serif text-lg font-semibold text-jade-100">原文</h3>
                  <span className="text-xs text-jade-100/40">{completenessLabel(selectedBook?.completeness)}</span>
                </div>
                <div
                  ref={sourceContainerRef}
                  data-testid="knowledge-book-source"
                  className="min-w-0 scroll-pt-4 overflow-x-hidden pr-1 text-sm 2xl:max-h-[72vh] 2xl:overflow-y-auto 2xl:pr-3 [overflow-wrap:anywhere]"
                  dangerouslySetInnerHTML={{ __html: renderedSource.html }}
                />
              </article>

              <aside className="min-w-0 rounded-panel border border-ink-700 bg-ink-850/60 p-5 2xl:sticky 2xl:top-4 2xl:self-start" aria-labelledby="reader-guide-title">
                <h3 id="reader-guide-title" className="font-serif text-lg font-semibold text-jade-100">阅读导览</h3>
                <div className="mt-4 rounded-card border border-white/8 bg-black/20 p-4 text-sm leading-7 text-jade-100/65">
                  {bookCitationId === BAZHAI_CITATION_ID
                    ? selectedGuide.description
                    : `《${selectedBook?.title ?? '本篇'}》属于${selectedBook?.category ?? '传统典籍'}。建议先阅读内容提要，再结合成书背景理解原文中的术语与判断。`}
                </div>
                <dl className="mt-4 space-y-3 border-t border-white/10 pt-4 text-sm">
                  <div><dt className="text-xs text-jade-100/40">作者</dt><dd className="mt-1 text-jade-100/70">{selectedBook?.author || '未详'}</dd></div>
                  <div><dt className="text-xs text-jade-100/40">主题</dt><dd className="mt-1 text-jade-100/70">{selectedBook?.category || '传统典籍'}</dd></div>
                  <div><dt className="text-xs text-jade-100/40">收录情况</dt><dd className="mt-1 text-jade-100/70">{completenessLabel(selectedBook?.completeness)}</dd></div>
                </dl>
                <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-6 text-jade-100/45">
                  阅读时请区分古籍原文与现代生活环境；涉及居住安全、建筑改造等事项，应另行咨询相应专业人士。
                </p>
              </aside>
            </div>
          ) : null}

          {loadState === 'error' ? (
            <div role="alert" className="rounded-panel border border-amber-300/20 bg-amber-500/5 p-5 text-sm leading-7 text-jade-100/65">
              <h3 className="font-serif text-lg font-semibold text-amber-200">暂时无法打开这篇典籍</h3>
              <p className="mt-2">请从左侧书目重新选择，或先阅读其他篇目。</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
