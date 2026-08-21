import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'knowledge-base/manifest.generated.json'), 'utf8'));
const generatedDir = path.join(root, 'apps/visual/src/generated');
const shardDir = path.join(generatedDir, 'knowledgeFullTextIndex.shards');
const manifestPath = path.join(generatedDir, 'knowledgeFullTextIndex.manifest.json');
const legacyPath = path.join(generatedDir, 'knowledgeFullTextIndex.json');
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
    sections.push({ citationId: `${entry.id}#section-${String(current.index).padStart(4, '0')}`, bookCitationId: entry.id, file: entry.path.replace(/^knowledge-base\/fengshui\//, ''), title: entry.title, heading: current.heading, excerpt: text.slice(0, 220), searchText: `${entry.title} ${current.heading} ${text}`.toLowerCase() });
  };
  for (const line of lines) {
    const heading = /^(#{1,4})\s+(.+?)\s*$/.exec(line);
    if (heading) { flush(); current = { index: sectionIndex++, heading: normalize(heading[2]), lines: [line] }; }
    else { if (!current) current = { index: sectionIndex++, heading: entry.title, lines: [] }; current.lines.push(line); }
  }
  flush();
}
sections.sort((a, b) => a.citationId < b.citationId ? -1 : a.citationId > b.citationId ? 1 : 0);
const SHARDS = 4;
const buckets = Array.from({ length: SHARDS }, () => ({ bytes: 0, sections: [] }));
for (const section of [...sections].sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)) {
  const bucket = buckets.reduce((smallest, candidate) => candidate.bytes < smallest.bytes ? candidate : smallest);
  bucket.sections.push(section);
  bucket.bytes += JSON.stringify(section).length;
}
const outputs = new Map();
for (let i = 0; i < SHARDS; i++) {
  buckets[i].sections.sort((a, b) => a.citationId < b.citationId ? -1 : a.citationId > b.citationId ? 1 : 0);
  outputs.set(path.join(shardDir, `shard-${i}.json`), `${JSON.stringify({ schemaVersion: '1.0.0', sections: buckets[i].sections }, null, 2)}\n`);
}
const indexManifest = { schemaVersion: '1.0.0', generatedBy: 'generate-knowledge-search-index.mjs', sectionCount: sections.length, bookCitationIds: [...new Set(sections.map((item) => item.bookCitationId))].sort(), shards: Array.from({ length: SHARDS }, (_, i) => `knowledgeFullTextIndex.shards/shard-${i}.json`) };
outputs.set(manifestPath, `${JSON.stringify(indexManifest, null, 2)}\n`);
let stale = false;
for (const [file, content] of outputs) {
  if (process.argv.includes('--check')) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) stale = true; }
  else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); }
}
if (!process.argv.includes('--check') && fs.existsSync(legacyPath)) fs.rmSync(legacyPath);
if (process.argv.includes('--check')) {
  if (stale || fs.existsSync(legacyPath)) { console.error('knowledge full-text shards are stale; run pnpm knowledge:index'); process.exitCode = 1; }
  else console.log(`knowledge full-text index: ${sections.length} sections in ${SHARDS} shards current`);
} else console.log(`generated ${sections.length} knowledge sections in ${SHARDS} shards`);
