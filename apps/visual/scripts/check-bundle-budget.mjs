import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const visual = path.join(root, 'apps/visual');
const assets = path.join(visual, 'dist/assets');
let passed = 0;
const failures = [];
const check = (condition, message) => condition ? passed++ : failures.push(message);
const jsFiles = fs.readdirSync(assets).filter((name) => name.endsWith('.js')).map((name) => ({ name, bytes: fs.statSync(path.join(assets, name)).size, gzip: zlib.gzipSync(fs.readFileSync(path.join(assets, name))).length }));
for (const file of jsFiles) {
  check(file.gzip <= 250_000, `${file.name} gzip ${file.gzip} exceeds 250KB`);
  if (!file.name.startsWith('vendor-')) check(file.bytes <= 700_000, `${file.name} raw ${file.bytes} exceeds 700KB`);
}
const entry = jsFiles.find((file) => /^index-.*\.js$/.test(file.name));
check(Boolean(entry) && entry.gzip <= 50_000, `initial app entry gzip must be <=50KB, actual ${entry?.gzip ?? 'missing'}`);
const charShards = fs.readdirSync(path.join(visual, 'src/legacy/char-meaning-shards')).map((name) => fs.statSync(path.join(visual, 'src/legacy/char-meaning-shards', name)).size);
check(charShards.length === 32 && Math.max(...charShards) <= 60_000, 'character meanings must remain 32 shards <=60KB source each');
const searchShards = fs.readdirSync(path.join(visual, 'src/generated/knowledgeFullTextIndex.shards')).map((name) => fs.statSync(path.join(visual, 'src/generated/knowledgeFullTextIndex.shards', name)).size);
check(searchShards.length === 4 && Math.max(...searchShards) <= 250_000, 'knowledge search must remain 4 shards <=250KB source each');
const dreamDir = path.join(visual, 'public/dream/shards');
const dreamShards = fs.readdirSync(dreamDir).filter((name) => /^category-.*\.json$/.test(name)).map((name) => fs.statSync(path.join(dreamDir, name)).size);
check(dreamShards.length >= 10 && Math.max(...dreamShards) <= 700_000, 'dream dictionary category parts must stay <=700KB raw each');
check(!fs.existsSync(path.join(visual, 'public/dream/dream-dictionary.json')), 'legacy 12MB public dream dictionary must not return');
console.log(`bundle budget: ${passed} passed, ${failures.length} failed; largest gzip=${Math.max(...jsFiles.map((file) => file.gzip))} bytes`);
if (failures.length) { failures.forEach((failure) => console.error(`- ${failure}`)); process.exitCode = 1; }
