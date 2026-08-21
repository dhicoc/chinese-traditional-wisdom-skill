import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'knowledge-base/manifest.generated.json'), 'utf8'));
const output = path.join(root, 'apps/visual/src/generated/knowledgeFullTextIndex.json');
const normalize = (text) => text.replace(/[`*_>#|\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
const sections = [];

for (const entry of manifest.entries.filter((item) => item.contentType === 'primary-text')) {
  const source = fs.readFileSync(path.join(root, entry.path), 'utf8');
  const lines = source.split(/\r?\n/);
  let current = null;
  let sectionIndex = 0;
  const flush = () => {
    if (!current) return;
    const text = normalize(current.lines.join('\n'));
    if (!text) return;
    sections.push({
      citationId: `${entry.id}#section-${String(current.index).padStart(4, '0')}`,
      bookCitationId: entry.id,
      file: entry.path.replace(/^knowledge-base\/fengshui\//, ''),
      title: entry.title,
      heading: current.heading,
      excerpt: text.slice(0, 220),
      searchText: `${entry.title} ${current.heading} ${text}`.toLowerCase(),
    });
  };
  for (const line of lines) {
    const heading = /^(#{1,4})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      current = { index: sectionIndex++, heading: normalize(heading[2]), lines: [line] };
    } else {
      if (!current) current = { index: sectionIndex++, heading: entry.title, lines: [] };
      current.lines.push(line);
    }
  }
  flush();
}

sections.sort((a, b) => a.citationId < b.citationId ? -1 : a.citationId > b.citationId ? 1 : 0);
fs.mkdirSync(path.dirname(output), { recursive: true });
const serialized = `${JSON.stringify({ schemaVersion: '1.0.0', generatedBy: 'generate-knowledge-search-index.mjs', sections }, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== serialized) {
    console.error('knowledge full-text index is stale; run pnpm knowledge:index');
    process.exitCode = 1;
  } else console.log(`knowledge full-text index: ${sections.length} sections current`);
} else {
  fs.writeFileSync(output, serialized);
  console.log(`generated ${path.relative(root, output).replace(/\\/g, '/')}: ${sections.length} sections`);
}
