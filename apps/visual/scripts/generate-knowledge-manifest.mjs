import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalTextBuffer } from './lib/canonical-text.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const outputPath = path.join(root, 'knowledge-base/manifest.generated.json');
const posix = (value) => value.replace(/\\/g, '/');

function filesUnder(dir, predicate) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

function hashFile(file) {
  return crypto.createHash('sha256').update(canonicalTextBuffer(file)).digest('hex');
}

function inferScope(name) {
  if (/全文|全书/.test(name)) return 'full';
  if (/第\d+章|内篇|外篇|杂篇/.test(name)) return 'chapter';
  if (/目录|大全$/.test(name)) return 'index';
  return 'unknown';
}

function entryFor(file, options) {
  const relative = posix(path.relative(root, file));
  const stat = fs.statSync(file);
  return {
    id: options.id,
    path: relative,
    title: options.title,
    domain: options.domain,
    contentType: options.contentType,
    contentScope: options.contentScope,
    sourceAttribution: options.sourceAttribution,
    license: options.license,
    reviewStatus: options.reviewStatus,
    sha256: hashFile(file),
    bytes: canonicalTextBuffer(file).length,
    version: options.version ?? null,
  };
}

const entries = [];
const fengshuiRoot = path.join(root, 'knowledge-base/fengshui');
for (const file of filesUnder(fengshuiRoot, (file) => file.endsWith('.md') && path.basename(file) !== 'SCHEMA.md')) {
  const rel = posix(path.relative(fengshuiRoot, file));
  const name = path.basename(file, '.md');
  const isIndex = name === '_index';
  entries.push(entryFor(file, {
    id: `kb://fengshui/${rel}`,
    title: isIndex ? '风水知识库索引' : name,
    domain: 'fengshui',
    contentType: isIndex ? 'index' : 'primary-text',
    contentScope: isIndex ? 'index' : inferScope(name),
    sourceAttribution: 'See knowledge-base/fengshui/_index.md; per-title edition/source requires scholarly review.',
    license: 'source-specific-unverified',
    reviewStatus: isIndex ? 'generated-metadata' : 'needs-scholarly-review',
  }));
}

for (const file of filesUnder(path.join(fengshuiRoot, 'mappings'), (file) => file.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const name = path.basename(file);
  entries.push(entryFor(file, {
    id: `mapping://fengshui/${name}`,
    title: String(data.name || name),
    domain: 'fengshui',
    contentType: 'mapping',
    contentScope: 'full',
    sourceAttribution: String(data.source || 'Project-maintained traditional-rule compilation.'),
    license: 'project-compilation; underlying traditional sources vary',
    reviewStatus: 'generated-metadata',
    version: String(data.version || 'unknown'),
  }));
}

for (const name of ['reference-buddhism.md', 'reference-daoism.md', 'reference-tcm.md', 'reference-metaphysics.md']) {
  const file = path.join(root, name);
  entries.push(entryFor(file, {
    id: `reference://${name.replace(/^reference-|\.md$/g, '')}`,
    title: name.replace(/^reference-|\.md$/g, ''),
    domain: name.replace(/^reference-|\.md$/g, ''),
    contentType: 'project-reference',
    contentScope: 'excerpt',
    sourceAttribution: 'Project-maintained reference synthesis; individual claims require source review.',
    license: 'project-content; cited source rights vary',
    reviewStatus: 'needs-scholarly-review',
  }));
}

entries.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const manifest = { schemaVersion: '1.0.0', generatedBy: 'apps/visual/scripts/generate-knowledge-manifest.mjs', entries };
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (process.argv.includes('--check')) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== serialized) {
    console.error('knowledge manifest is stale; run: node apps/visual/scripts/generate-knowledge-manifest.mjs');
    process.exitCode = 1;
  } else {
    console.log(`knowledge manifest: ${entries.length} entries, checksums current`);
  }
} else {
  fs.writeFileSync(outputPath, serialized);
  console.log(`generated ${posix(path.relative(root, outputPath))}: ${entries.length} entries`);
}
