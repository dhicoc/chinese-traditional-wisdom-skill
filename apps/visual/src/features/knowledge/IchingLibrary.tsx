import { useMemo, useRef, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import {
  changeHexagramLines,
  getCanonicalHexagram,
  getHexagramRelations,
  ICHING_DATA_PROVENANCE,
  listCanonicalHexagrams,
  resolveHexagram,
  resolveHexagramLines,
  searchCanonicalHexagrams,
  TRIGRAM_ORDER,
  TRIGRAMS,
  type CanonicalHexagram,
  type YaoPolarity,
} from '@/legacy/ichingTexts';
import { HexagramGlyph, YaoBar } from './IchingHexagramGlyph';

const HEXAGRAMS = listCanonicalHexagrams();
const LINE_LABELS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

type LibraryView = 'sequence' | 'matrix' | 'lines';

interface IchingLibraryProps {
  initialNumber?: number;
  initialChangingLines?: readonly number[];
  sourceLabel?: string;
  onOpenBooks: () => void;
}

function normalizedChangingLines(lines: readonly number[]): number[] {
  return Array.from(new Set(lines))
    .filter((line) => Number.isInteger(line) && line >= 1 && line <= 6)
    .sort((a, b) => a - b);
}

function HexagramIndexButton({ hexagram, active, onSelect }: {
  hexagram: CanonicalHexagram;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      className={[
        'min-h-24 rounded-card border p-2 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/50',
        active
          ? 'border-jade-500/45 bg-jade-500/12'
          : 'border-white/8 bg-black/15 hover:border-jade-500/25 hover:bg-jade-500/5',
      ].join(' ')}
    >
      <span className="block text-[10px] text-jade-100/40">{String(hexagram.number).padStart(2, '0')}</span>
      <span className="mt-1 block font-serif text-lg text-jade-100">{hexagram.symbol} {hexagram.name}</span>
      <span className="mt-2 flex justify-center"><HexagramGlyph hexagram={hexagram} compact /></span>
    </button>
  );
}

function RelationshipButton({ title, description, hexagram, onSelect }: {
  title: string;
  description: string;
  hexagram: CanonicalHexagram;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="rounded-card border border-white/8 bg-black/15 p-3 text-left transition hover:border-jade-500/25 hover:bg-jade-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40">
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-jade-400">{title}</span>
        <span className="font-serif text-lg text-jade-100">{hexagram.symbol}</span>
      </span>
      <span className="mt-1 block font-serif text-base text-jade-100">第{hexagram.number}卦 · {hexagram.name}</span>
      <span className="mt-1 block text-xs leading-5 text-jade-100/45">{description}</span>
    </button>
  );
}

export function IchingLibrary({ initialNumber = 1, initialChangingLines = [], sourceLabel, onOpenBooks }: IchingLibraryProps) {
  const initialHexagram = getCanonicalHexagram(initialNumber) ?? HEXAGRAMS[0];
  const [selectedNumber, setSelectedNumber] = useState(initialHexagram.number);
  const [changingLines, setChangingLines] = useState(() => normalizedChangingLines(initialChangingLines));
  const [query, setQuery] = useState('');
  const [view, setView] = useState<LibraryView>('sequence');
  const [manualLines, setManualLines] = useState<YaoPolarity[]>(() => [...initialHexagram.linesBottomUp]);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);

  const selected = getCanonicalHexagram(selectedNumber) ?? HEXAGRAMS[0];
  const relations = getHexagramRelations(selected);
  const changedHexagram = changeHexagramLines(selected, changingLines);
  const searchResults = useMemo(() => searchCanonicalHexagrams(query), [query]);
  const manualHexagram = resolveHexagramLines(manualLines);

  const contextPayload = useMemo(() => ({
    卦序: `第${selected.number}卦`,
    卦名: selected.fullName,
    上下卦: `上${selected.upperTrigram}下${selected.lowerTrigram}`,
    动爻: changingLines.length ? changingLines.map((line) => LINE_LABELS[line - 1]).join('、') : '未选择',
    变卦: changingLines.length ? changedHexagram?.fullName : '无',
  }), [changedHexagram, changingLines, selected]);

  function openHexagram(number: number, nextChangingLines: readonly number[] = []) {
    const next = getCanonicalHexagram(number);
    if (!next) return;
    setSelectedNumber(number);
    setChangingLines(normalizedChangingLines(nextChangingLines));
    setManualLines([...next.linesBottomUp]);
    window.requestAnimationFrame(() => detailHeadingRef.current?.focus());
  }

  function toggleChangingLine(line: number) {
    setChangingLines((current) => (
      current.includes(line)
        ? current.filter((item) => item !== line)
        : [...current, line].sort((a, b) => a - b)
    ));
  }

  function toggleManualLine(index: number) {
    setManualLines((current) => current.map((line, lineIndex) => (
      lineIndex === index ? (line === 'yang' ? 'yin' : 'yang') : line
    )));
  }

  return (
    <section className="space-y-4" aria-labelledby="iching-library-title">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-5 shadow-instrument">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-jade-400/75">周易原文 · 文王卦序</p>
            <h2 id="iching-library-title" className="mt-2 font-serif text-3xl font-semibold text-jade-100">周易六十四卦</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/60">
              按卦序、上下卦或六爻阴阳查找，阅读卦辞、六爻辞与彖传，并查看错卦、综卦、互卦和动爻所成之卦。
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-jade-100/60">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">64 卦完整收录</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">卦辞 · 爻辞 · 彖传</span>
              <span className="rounded-full border border-jade-500/20 bg-jade-500/10 px-3 py-1.5 text-jade-300">本地查询</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onOpenBooks} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-jade-100/70 transition hover:border-jade-500/30 hover:text-jade-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40">返回典籍书库</button>
            <CopyContextButton commandScope="reader" label="复制卦象摘要" title="周易六十四卦摘要" payload={contextPayload} />
          </div>
        </div>
        <p className="mt-4 border-t border-white/8 pt-3 text-xs leading-6 text-jade-100/50">原文与卦象关系供传统文化学习；页面不生成现实预测或行动结论。</p>
      </div>

      {sourceLabel ? (
        <div className="rounded-panel border border-gold-500/25 bg-gold-500/8 p-4 text-sm leading-7 text-jade-100/70" role="status">
          <span className="font-semibold text-gold-400">{sourceLabel}</span>
          <span className="ml-2">已打开第{selected.number}卦《{selected.name}》</span>
          {changingLines.length ? <span>，并标出{changingLines.map((line) => LINE_LABELS[line - 1]).join('、')}。</span> : '。'}
        </div>
      ) : null}

      <div className="rounded-panel border border-ink-700 bg-black/20 p-4">
        <label htmlFor="iching-search" className="text-xs font-semibold text-jade-100/65">查找六十四卦</label>
        <div className="mt-2 flex items-center gap-3 rounded-card border border-white/10 bg-black/20 px-3 py-2.5 focus-within:ring-2 focus-within:ring-jade-500/40">
          <span aria-hidden="true" className="text-jade-400">⌕</span>
          <input id="iching-search" name="iching-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入卦名、编号、卦符、上下卦或原文词句" className="min-w-0 flex-1 bg-transparent text-sm text-jade-100 placeholder:text-jade-100/35 focus:outline-none" />
          {query ? <button type="button" onClick={() => setQuery('')} className="rounded px-2 py-1 text-xs text-jade-100/55 hover:text-jade-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40">清除</button> : null}
        </div>
        <p className="mt-2 text-xs text-jade-100/45" role="status">{query ? `找到 ${searchResults.length} 卦` : '可搜索“晋”“35”“䷢”“上离下坤”或原文词句'}</p>
      </div>

      <div className="rounded-panel border border-ink-700 bg-ink-850/60 p-4">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="六十四卦查找方式">
          {([
            ['sequence', '文王卦序'],
            ['matrix', '上下卦矩阵'],
            ['lines', '六爻定位'],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={[
              'min-h-10 shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40',
              view === id ? 'border-jade-500/40 bg-jade-500/12 text-jade-50' : 'border-white/8 text-jade-100/50 hover:border-white/15 hover:text-jade-100/80',
            ].join(' ')}>{label}</button>
          ))}
        </div>

        {view === 'sequence' ? (
          <div className="mt-4">
            {searchResults.length ? (
              <div className="grid max-h-[48vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-8" data-testid="iching-sequence-grid">
                {searchResults.map((hexagram) => <HexagramIndexButton key={hexagram.number} hexagram={hexagram} active={hexagram.number === selected.number} onSelect={() => openHexagram(hexagram.number)} />)}
              </div>
            ) : (
              <div className="rounded-card border border-dashed border-white/10 p-6 text-center text-sm leading-7 text-jade-100/55">没有找到相符的卦。可以改用卦名、编号、上下卦或原文中的短句。</div>
            )}
          </div>
        ) : null}

        {view === 'matrix' ? (
          <div className="mt-4 overflow-x-auto" data-testid="iching-trigram-matrix">
            <table className="min-w-[820px] border-separate border-spacing-1 text-center text-xs">
              <caption className="sr-only">六十四卦上下卦矩阵，列为上卦，行为下卦</caption>
              <thead><tr><th scope="col" className="p-2 text-jade-100/45">下卦＼上卦</th>{TRIGRAM_ORDER.map((upper) => <th key={upper} scope="col" className="p-2 font-serif text-sm text-jade-100">{upper} · {TRIGRAMS[upper].nature}</th>)}</tr></thead>
              <tbody>{TRIGRAM_ORDER.map((lower) => (
                <tr key={lower}>
                  <th scope="row" className="p-2 font-serif text-sm text-jade-100">{lower} · {TRIGRAMS[lower].nature}</th>
                  {TRIGRAM_ORDER.map((upper) => {
                    const hexagram = resolveHexagram(upper, lower)!;
                    return <td key={`${upper}-${lower}`}><button type="button" onClick={() => openHexagram(hexagram.number)} aria-label={`上${upper}下${lower}，第${hexagram.number}卦${hexagram.name}`} className={['min-h-14 w-full rounded-card border p-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40', hexagram.number === selected.number ? 'border-jade-500/45 bg-jade-500/12' : 'border-white/8 bg-black/15 hover:border-jade-500/25'].join(' ')}><span className="block font-serif text-lg">{hexagram.symbol}</span><span className="block">{hexagram.name}</span></button></td>;
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : null}

        {view === 'lines' ? (
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]" data-testid="iching-line-locator">
            <div className="rounded-card border border-white/8 bg-black/15 p-4">
              <h3 className="font-serif text-lg font-semibold text-jade-100">按六爻阴阳定位</h3>
              <p className="mt-2 text-xs leading-6 text-jade-100/50">卦画自下而上为初爻至上爻。点击任一爻可在阴、阳之间切换。</p>
              <div className="mt-4 flex flex-col gap-2" role="group" aria-label="六爻阴阳选择">
                {manualLines.map((polarity, index) => ({ polarity, index })).reverse().map(({ polarity, index }) => (
                  <button key={index} type="button" onClick={() => toggleManualLine(index)} aria-label={`${LINE_LABELS[index]}，当前为${polarity === 'yang' ? '阳爻' : '阴爻'}，点击切换`} className="flex min-h-11 items-center justify-between rounded-card border border-white/8 bg-black/15 px-3 py-2 hover:border-jade-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40">
                    <span className="text-xs text-jade-100/55">{LINE_LABELS[index]}</span><YaoBar polarity={polarity} /><span className="text-xs font-semibold text-jade-300">{polarity === 'yang' ? '阳' : '阴'}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-card border border-jade-500/20 bg-jade-500/5 p-6 text-center">
              {manualHexagram ? <><div className="font-serif text-5xl text-jade-100">{manualHexagram.symbol}</div><h3 className="mt-3 font-serif text-2xl text-jade-100">第{manualHexagram.number}卦 · {manualHexagram.name}</h3><p className="mt-2 text-sm text-jade-100/55">{manualHexagram.fullName} · 上{manualHexagram.upperTrigram}下{manualHexagram.lowerTrigram}</p><button type="button" onClick={() => openHexagram(manualHexagram.number)} className="mt-5 rounded-full border border-jade-500/35 bg-jade-500/12 px-4 py-2 text-sm font-semibold text-jade-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40">阅读此卦原文</button></> : null}
            </div>
          </div>
        ) : null}
      </div>

      <article className="rounded-panel border border-ink-700 bg-ink-850/60 p-5" aria-labelledby="iching-detail-title">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-jade-400/75">第{selected.number}卦 · {selected.codePoint}</p>
            <h3 ref={detailHeadingRef} tabIndex={-1} id="iching-detail-title" className="mt-2 font-serif text-3xl font-semibold text-jade-100 focus:outline-none">{selected.symbol} {selected.fullName}</h3>
            <p className="mt-2 text-sm text-jade-100/55">上{selected.upperTrigram}（{selected.upperNature}） · 下{selected.lowerTrigram}（{selected.lowerNature}）</p>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={selected.number === 1} onClick={() => openHexagram(selected.number - 1)} className="rounded-full border border-white/10 px-3 py-2 text-xs text-jade-100/60 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40">上一卦</button>
            <button type="button" disabled={selected.number === 64} onClick={() => openHexagram(selected.number + 1)} className="rounded-full border border-white/10 px-3 py-2 text-xs text-jade-100/60 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40">下一卦</button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-card border border-white/8 bg-black/15 p-5"><HexagramGlyph hexagram={selected} changingLines={changingLines} /><p className="mt-4 text-center text-xs text-jade-100/45">红色爻线表示当前选中的动爻</p></div>
            <div className="rounded-card border border-white/8 bg-black/15 p-4">
              <h4 className="text-sm font-semibold text-jade-100">选择动爻</h4>
              <p className="mt-1 text-xs leading-5 text-jade-100/45">可多选；未选择时不另成变卦。</p>
              <div className="mt-3 grid grid-cols-3 gap-2">{LINE_LABELS.map((label, index) => <button key={label} type="button" aria-pressed={changingLines.includes(index + 1)} onClick={() => toggleChangingLine(index + 1)} className={['min-h-10 rounded-card border px-2 py-2 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40', changingLines.includes(index + 1) ? 'border-cinnabar-500/40 bg-cinnabar-500/10 text-cinnabar-300' : 'border-white/8 text-jade-100/55'].join(' ')}>{label}</button>)}</div>
              {changingLines.length && changedHexagram ? <button type="button" onClick={() => openHexagram(changedHexagram.number)} className="mt-4 w-full rounded-card border border-gold-500/25 bg-gold-500/8 p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"><span className="text-xs text-gold-400">变卦</span><span className="mt-1 block font-serif text-lg text-jade-100">{changedHexagram.symbol} 第{changedHexagram.number}卦 · {changedHexagram.name}</span></button> : <p className="mt-4 text-xs text-jade-100/40">尚未选择动爻</p>}
            </div>
          </aside>

          <div className="min-w-0 space-y-6 font-serif text-[15px] leading-8 text-jade-100/72">
            <section><h4 className="font-serif text-xl font-semibold text-jade-100">卦辞</h4><p className="mt-2">{selected.guaCi}</p></section>
            <section><h4 className="font-serif text-xl font-semibold text-jade-100">爻辞</h4><ol className="mt-3 space-y-3">{selected.yaoCi.map((text, index) => <li key={`${selected.number}-${index}`} className={['rounded-card border p-4', changingLines.includes(index + 1) ? 'border-cinnabar-500/30 bg-cinnabar-500/8' : 'border-white/8 bg-black/15'].join(' ')}><button type="button" onClick={() => toggleChangingLine(index + 1)} aria-pressed={changingLines.includes(index + 1)} className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40"><span className={['mr-3 font-sans text-xs font-semibold', changingLines.includes(index + 1) ? 'text-cinnabar-300' : 'text-jade-400'].join(' ')}>{LINE_LABELS[index]}{changingLines.includes(index + 1) ? ' · 动' : ''}</span>{text}</button></li>)}</ol></section>
            <section><h4 className="font-serif text-xl font-semibold text-jade-100">彖传</h4><p className="mt-2">{selected.tuanZhuan}</p></section>
          </div>
        </div>

        {relations ? (
          <section className="mt-6 border-t border-white/10 pt-5" aria-labelledby="iching-relations-title">
            <h4 id="iching-relations-title" className="font-serif text-xl font-semibold text-jade-100">卦象关系</h4>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <RelationshipButton title="错卦" description="六爻阴阳全部相反" hexagram={relations.cuo} onSelect={() => openHexagram(relations.cuo.number)} />
              <RelationshipButton title="综卦" description="将整卦上下倒置观察" hexagram={relations.zong} onSelect={() => openHexagram(relations.zong.number)} />
              <RelationshipButton title="互卦" description="取二至五爻组成内在卦象" hexagram={relations.hu} onSelect={() => openHexagram(relations.hu.number)} />
            </div>
          </section>
        ) : null}

        <footer className="mt-6 border-t border-white/10 pt-4 text-xs leading-6 text-jade-100/45">
          本页收录文王六十四卦的卦辞、六爻辞与彖传。原文据 {ICHING_DATA_PROVENANCE.source} 开源资料整理，许可为 {ICHING_DATA_PROVENANCE.license}；卦序、卦象与关系由本地规则计算。
        </footer>
      </article>
    </section>
  );
}
