import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'knowledge-base/manifest.generated.json'), 'utf8'));
const notices = fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
let passed = 0;
const failures = [];
const check = (condition, message) => condition ? passed++ : failures.push(message);
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

check(manifest.schemaVersion === '1.0.0', 'manifest schemaVersion must be 1.0.0');
check(Array.isArray(manifest.entries) && manifest.entries.length >= 40, 'manifest must cover current knowledge assets');
const ids = new Set();
const paths = new Set();
for (const [index, entry] of manifest.entries.entries()) {
  for (const field of ['id', 'path', 'title', 'domain', 'contentType', 'contentScope', 'sourceAttribution', 'license', 'reviewStatus', 'sha256', 'bytes']) {
    check(entry[field] !== undefined && entry[field] !== '', `entry ${index} missing ${field}`);
  }
  check(!ids.has(entry.id), `duplicate manifest id: ${entry.id}`);
  check(!paths.has(entry.path), `duplicate manifest path: ${entry.path}`);
  ids.add(entry.id); paths.add(entry.path);
  const file = path.join(root, entry.path);
  check(fs.existsSync(file), `manifest path missing: ${entry.path}`);
  if (fs.existsSync(file)) {
    check(entry.sha256 === sha256(file), `stale checksum: ${entry.path}`);
    check(entry.bytes === fs.statSync(file).size, `stale byte size: ${entry.path}`);
  }
  if (entry.contentType === 'primary-text') {
    check(entry.id.startsWith('kb://'), `primary text needs kb:// id: ${entry.path}`);
    check(entry.reviewStatus === 'needs-scholarly-review' || entry.reviewStatus === 'reviewed', `primary text needs scholarly status: ${entry.path}`);
  }
}
for (const required of ['lunar-typescript', 'iztro', '3meta', 'Dream dictionary', 'Kangxi strokes', 'Fengshui classical texts']) {
  check(notices.includes(required), `THIRD_PARTY_NOTICES missing ${required}`);
}
check(!manifest.entries.some((entry) => entry.path.endsWith('mappings/SCHEMA.md')), 'mapping schema must not be indexed as primary text');

console.log(`knowledge provenance: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
}
