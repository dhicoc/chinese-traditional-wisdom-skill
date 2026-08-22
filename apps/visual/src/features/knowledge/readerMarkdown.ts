const SPECIAL_LINE = /^(#{1,3})\s+|^>\s+|^\{>\s*|^[-*]\s+|^\d+\.\s+|^---\s*$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderPlainText(value: string, searchTerm: string): string {
  if (!searchTerm) return escapeHtml(value);
  const matcher = new RegExp(escapeRegExp(searchTerm), 'gi');
  let cursor = 0;
  let html = '';
  for (const match of value.matchAll(matcher)) {
    const start = match.index ?? 0;
    html += escapeHtml(value.slice(cursor, start));
    html += `<mark class="rounded bg-amber-500/30 px-0.5 text-amber-100">${escapeHtml(match[0])}</mark>`;
    cursor = start + match[0].length;
  }
  return html + escapeHtml(value.slice(cursor));
}

function renderInline(value: string, searchTerm: string): string {
  const bold = /(\*\*|''')(.+?)\1/g;
  let cursor = 0;
  let html = '';
  for (const match of value.matchAll(bold)) {
    const start = match.index ?? 0;
    html += renderPlainText(value.slice(cursor, start), searchTerm);
    html += `<strong class="font-semibold text-jade-100/85">${renderPlainText(match[2], searchTerm)}</strong>`;
    cursor = start + match[0].length;
  }
  return html + renderPlainText(value.slice(cursor), searchTerm);
}

function countMatches(text: string, searchTerm: string): number {
  if (!searchTerm) return 0;
  return [...text.matchAll(new RegExp(escapeRegExp(searchTerm), 'gi'))].length;
}

export interface RenderedReaderMarkdown {
  html: string;
  matchCount: number;
}

/**
 * 将馆藏 Markdown 转为安全、适合长文阅读的 HTML。
 * 所有正文先转义，再添加有限的标题、列表、引用和关键词标记。
 */
export function renderReaderMarkdown(text: string, searchTerm = ''): RenderedReaderMarkdown {
  const normalizedTerm = searchTerm.trim();
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const output: string[] = [];
  let headingIndex = 0;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const sourceLevel = heading[1].length;
      const renderedLevel = Math.min(sourceLevel + 2, 5);
      const id = `section-${String(headingIndex++).padStart(4, '0')}`;
      const classes = sourceLevel === 1
        ? 'mt-2 font-serif text-2xl font-bold leading-tight text-jade-50'
        : sourceLevel === 2
          ? 'mt-8 border-b border-white/10 pb-2 font-serif text-xl font-semibold text-jade-100'
          : 'mt-6 font-serif text-base font-semibold text-jade-100/85';
      output.push(`<h${renderedLevel} id="${id}" data-knowledge-section="${id}" class="${classes}">${renderInline(heading[2], normalizedTerm)}</h${renderedLevel}>`);
      index += 1;
      continue;
    }

    if (/^---\s*$/.test(line)) {
      output.push('<hr class="my-6 border-white/10" />');
      index += 1;
      continue;
    }

    if (/^>\s+/.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && /^>\s+/.test(lines[index])) {
        quoted.push(lines[index].replace(/^>\s+/, ''));
        index += 1;
      }
      output.push(`<blockquote class="my-4 border-l-2 border-jade-500/35 bg-jade-500/5 px-4 py-3 font-serif text-jade-100/65">${quoted.map((item) => renderInline(item, normalizedTerm)).join('<br />')}</blockquote>`);
      continue;
    }

    if (/^\{>\s*/.test(line)) {
      const note: string[] = [line.replace(/^\{>\s*/, '')];
      index += 1;
      while (index < lines.length && !/\}\s*$/.test(note[note.length - 1])) {
        note.push(lines[index]);
        index += 1;
      }
      note[note.length - 1] = note[note.length - 1].replace(/\}\s*$/, '');
      output.push(`<aside class="my-4 rounded-card border border-gold-500/15 bg-gold-500/5 px-4 py-3 text-sm leading-7 text-jade-100/62"><span class="mr-2 font-sans text-xs font-semibold text-gold-400">注</span>${note.map((item) => renderInline(item.trim(), normalizedTerm)).join('<br />')}</aside>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ''));
        index += 1;
      }
      output.push(`<ul class="my-4 list-disc space-y-2 pl-6 text-jade-100/72">${items.map((item) => `<li class="pl-1">${renderInline(item, normalizedTerm)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      output.push(`<ol class="my-4 list-decimal space-y-2 pl-6 text-jade-100/72">${items.map((item) => `<li class="pl-1">${renderInline(item, normalizedTerm)}</li>`).join('')}</ol>`);
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !SPECIAL_LINE.test(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    output.push(`<p class="my-4 break-words font-serif text-[15px] leading-8 text-jade-100/72">${paragraph.map((item) => renderInline(item, normalizedTerm)).join('<br />')}</p>`);
  }

  return {
    html: output.join('\n'),
    matchCount: countMatches(text, normalizedTerm),
  };
}
