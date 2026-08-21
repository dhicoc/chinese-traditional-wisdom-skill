import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(appRoot, '../..');
let passed = 0;
let failed = 0;
function check(condition, message) { if (condition) passed += 1; else { failed += 1; console.error(`FAIL: ${message}`); } }
function json(file) { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
function text(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

const version = text('VERSION').trim();
const rootPackage = json('package.json');
const visualPackage = json('apps/visual/package.json');
check(/^\d+\.\d+\.\d+$/.test(version), 'VERSION must be SemVer');
check(rootPackage.version === version, 'root package version must match VERSION');
check(visualPackage.version === version, 'visual package version must match VERSION');
check(text('CHANGELOG.md').includes(`## [${version}]`), 'CHANGELOG must contain current version');
check(text(`docs/releases/v${version}.md`).includes(`v${version}`), 'release notes must contain current version');
check(text(`docs/releases/v${version}-release-checklist.md`).includes(`v${version}`), 'release checklist must contain current version');
check(text('README.md').includes(`Stable release: <strong>v${version}</strong>`), 'README must expose stable version');
check(!fs.existsSync(path.join(root, 'package-lock.json')), 'package-lock.json must not exist');
check(rootPackage.private === true && visualPackage.private === true, 'packages must remain private/local distribution');
check(rootPackage.packageManager === visualPackage.packageManager, 'packageManager must match');
check(/^---\r?\nname:/u.test(text('SKILL.md')), 'SKILL frontmatter must remain present');
check(text('.github/workflows/ci.yml').includes('pnpm eval:skill'), 'CI must run Skill evals');
check(text('apps/visual/pnpm-workspace.yaml').includes('nanoid: 3.3.18'), 'release must override patched nanoid');
check(text('apps/visual/pnpm-workspace.yaml').includes('onlyBuiltDependencies'), 'allowed build dependencies must be explicit');
check(text('requirements.txt').includes('iztro-py==0.5.0') && !text('requirements.txt').includes('ichingshifa'), 'default Python oracle requirements must be cross-platform');
check(text('docs/releases/v1.0.0-dependency-audit.md').includes('No known vulnerabilities found'), 'dependency audit evidence must exist');

console.log(`release contracts: ${passed} passed, ${failed} failed; version=${version}`);
if (failed) process.exitCode = 1;
