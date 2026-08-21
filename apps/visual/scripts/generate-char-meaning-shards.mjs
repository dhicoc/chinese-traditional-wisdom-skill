import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sourcePath = path.join(root, 'apps/visual/src/legacy/charMeanings.json');
const shardDir = path.join(root, 'apps/visual/src/legacy/char-meaning-shards');
const loaderPath = path.join(root, 'apps/visual/src/legacy/charMeaningLoaders.generated.ts');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const SHARDS = 32;
const buckets = Array.from({ length: SHARDS }, () => ({}));
for (const [char, meaning] of Object.entries(source)) {
  const point = char.codePointAt(0) ?? 0;
  buckets[point % SHARDS][char] = meaning;
}
const outputs = new Map();
for (let i = 0; i < SHARDS; i++) {
  const id = i.toString(16).padStart(2, '0');
  const sorted = Object.fromEntries(Object.entries(buckets[i]).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  outputs.set(path.join(shardDir, `shard-${id}.ts`), `const data: Record<string, string> = ${JSON.stringify(sorted)};\nexport default data;\n`);
}
const loaders = Array.from({ length: SHARDS }, (_, i) => {
  const id = i.toString(16).padStart(2, '0');
  return `  '${id}': () => import('./char-meaning-shards/shard-${id}'),`;
}).join('\n');
outputs.set(loaderPath, `export const CHAR_MEANING_LOADERS: Record<string, () => Promise<{ default: Record<string, string> }>> = {\n${loaders}\n};\n`);

let stale = false;
for (const [file, content] of outputs) {
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) stale = true;
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}
if (process.argv.includes('--check')) {
  if (stale) { console.error('char meaning shards are stale; run pnpm data:char-shards'); process.exitCode = 1; }
  else console.log(`char meaning shards: ${SHARDS} shards current, ${Object.keys(source).length} entries`);
} else console.log(`generated ${SHARDS} char meaning shards from ${Object.keys(source).length} entries`);
