import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sourcePath = path.join(root, 'apps/visual/src/legacy/dream-data/dream-dictionary.source.json');
const outputDir = path.join(root, 'apps/visual/public/dream/shards');
const entries = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const groups = new Map();
for (const entry of entries) {
  const category = String(entry.biglx || '其它').trim() || '其它';
  if (!groups.has(category)) groups.set(category, []);
  groups.get(category).push(entry);
}
const categories = [...groups.keys()].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
const outputs = new Map();
const manifest = { schemaVersion: '1.0.0', totalCount: entries.length, shards: [] };
const MAX_SHARD_BYTES = 700_000;
for (const [index, category] of categories.entries()) {
  const data = groups.get(category);
  const parts = [];
  let current = [];
  let currentBytes = 2;
  for (const entry of data) {
    const entryBytes = Buffer.byteLength(JSON.stringify(entry), 'utf8') + 1;
    if (current.length && currentBytes + entryBytes > MAX_SHARD_BYTES) { parts.push(current); current = []; currentBytes = 2; }
    current.push(entry); currentBytes += entryBytes;
  }
  if (current.length) parts.push(current);
  for (const [part, values] of parts.entries()) {
    const file = `category-${String(index).padStart(2, '0')}-part-${String(part).padStart(2, '0')}.json`;
    outputs.set(path.join(outputDir, file), `${JSON.stringify(values)}\n`);
    manifest.shards.push({ category, file, count: values.length });
  }
}
outputs.set(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
let stale = false;
if (!process.argv.includes('--check')) {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const existing of fs.readdirSync(outputDir)) fs.rmSync(path.join(outputDir, existing));
}
for (const [file, content] of outputs) {
  if (process.argv.includes('--check')) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) stale = true; }
  else fs.writeFileSync(file, content);
}
if (process.argv.includes('--check')) {
  if (stale) { console.error('dream shards are stale; run pnpm data:dream-shards'); process.exitCode = 1; }
  else console.log(`dream shards: ${manifest.shards.length} parts across ${categories.length} categories, ${manifest.totalCount} entries current`);
} else console.log(`generated ${manifest.shards.length} parts across ${categories.length} dream categories from ${manifest.totalCount} entries`);
