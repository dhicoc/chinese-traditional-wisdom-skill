import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
let passed = 0;
let failed = 0;
const failures = [];

function check(condition, message) {
  if (condition) passed++;
  else {
    failed++;
    failures.push(message);
  }
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

const requiredFiles = [
  "README.md",
  "README_AI.md",
  "SKILL.md",
  "RULES.md",
  "tool-index.md",
  "EVOLUTION.md",
  "ROADMAP.md",
  "docs/RESEARCH-ROADMAP.md",
  "apps/visual/package.json",
  "apps/visual/scripts/run-engine.ts",
  "apps/visual/src/legacy/directRunner.ts",
  "apps/visual/src/legacy/baseTypes.ts",
  "apps/visual/src/legacy/trueSolarTime.ts",
  "apps/visual/src/lib/modules.ts",
  "templates/visual-report.md",
  "knowledge-base/fengshui/mappings/SCHEMA.md",
  "knowledge-base/fengshui/mappings/life-trigram.json",
  "knowledge-base/fengshui/mappings/eight-mansions.json",
  "knowledge-base/fengshui/mappings/twenty-four-mountains.json",
  "knowledge-base/fengshui/mappings/yearly-flying-stars.json",
  "knowledge-base/fengshui/mappings/three-essentials.json",
  "knowledge-base/fengshui/mappings/form-sha-cures.json",
  "bootstrap/bazi-engine.md",
  "bootstrap/ziwei-engine.md",
  "bootstrap/liuyao-engine.md",
  "bootstrap/meihua-yishu-engine.md",
  "bootstrap/yunqi-integration.md",
  "bootstrap/constitution-questionnaire.md",
  "bootstrap/fengshui-guide.md"
];
requiredFiles.forEach((relPath) => check(exists(relPath), `缺少直调架构文件: ${relPath}`));

const docs = Object.fromEntries([
  "README.md",
  "README_AI.md",
  "SKILL.md",
  "RULES.md",
  "tool-index.md",
  "ROADMAP.md",
  "EVOLUTION.md",
  "docs/RESEARCH-ROADMAP.md"
].map((relPath) => [relPath, read(relPath)]));
const runner = read("apps/visual/scripts/run-engine.ts");
const packageJson = read("apps/visual/package.json");
const directRunner = read("apps/visual/src/legacy/directRunner.ts");
const toolContracts = read("apps/visual/src/legacy/toolContracts.ts");
const trueSolarTime = read("apps/visual/src/legacy/trueSolarTime.ts");
const modules = read("apps/visual/src/lib/modules.ts");

function extractMatches(content, pattern) {
  return [...content.matchAll(pattern)].map((match) => match[1]);
}

function checkSameToolNames(label, actual, expected) {
  const actualNames = [...new Set(actual)];
  const missing = expected.filter((name) => !actualNames.includes(name));
  const unexpected = actualNames.filter((name) => !expected.includes(name));
  check(missing.length === 0 && unexpected.length === 0 && actualNames.length === expected.length,
    `${label} 与 LOCAL_TOOL_NAMES 不一致：缺少 ${missing.join('、') || '无'}；多出 ${unexpected.join('、') || '无'}。`);
}

for (const [name, content] of Object.entries(docs)) {
  check(content.includes("ToolEnvelope"), `${name} 缺少 ToolEnvelope 直调契约`);
  check(content.includes("local-exact") || content.includes("本地精确"), `${name} 缺少 local-exact / 本地精确口径`);
  check(content.includes("local-approx") || content.includes("本地近似"), `${name} 缺少 local-approx / 本地近似口径`);
  check(content.includes("模型不得自行推演") || content.includes("不得自行推演") || content.includes("禁止模型自行推演"), `${name} 缺少禁止模型自行推演规则`);
  check(!/\bMCP\b|mcp-server|setup-mcp|stdio|JSON-RPC|MCP SDK|presentationToken|numericAssertionToken/.test(content), `${name} 仍含已移除架构术语`);
}

check(runner.includes("runLocalTool"), "run-engine.ts 未调用本地 direct runner");
check(runner.includes("pnpm engine <tool> <input-json-file>"), "run-engine.ts 缺少 CLI 用法");
check(packageJson.includes('"engine": "tsx scripts/run-engine.ts"'), "apps/visual/package.json 缺少 engine script");
check(directRunner.includes("runLocalTool"), "directRunner.ts 缺少 runLocalTool");

const localToolNames = extractMatches(
  toolContracts.match(/export const LOCAL_TOOL_NAMES = \[([\s\S]*?)\] as const/)?.[1] ?? '',
  /'([^']+)'/g,
);
check(localToolNames.length > 0, "toolContracts.ts 缺少 LOCAL_TOOL_NAMES 运行时清单");

const runnerToolNames = extractMatches(directRunner, /case '([^']+)'/g);
checkSameToolNames("directRunner.ts 分发", runnerToolNames, localToolNames);

const toolIndex = docs["tool-index.md"];
const documentedTools = extractMatches(toolIndex, /\| `([^`]+)` \| `src\/__fixtures__\/local-tools\/[^`]+\.success\.json` \|/g);
checkSameToolNames("tool-index.md CLI 工具表", documentedTools, localToolNames);

for (const tool of localToolNames) {
  const fixturePath = `apps/visual/src/__fixtures__/local-tools/${tool}.success.json`;
  check(exists(fixturePath), `缺少 ${tool} 的 success fixture: ${fixturePath}`);
  check(toolIndex.includes(`| \`${tool}\` | \`src/__fixtures__/local-tools/${tool}.success.json\` |`),
    `tool-index.md 缺少 ${tool} 的 CLI fixture 行。`);
}

check(trueSolarTime.includes("resolveTrueSolarTime"), "trueSolarTime.ts 缺少本地校准函数");
for (const [name, content] of Object.entries(docs)) {
  check(content.includes("resolve_true_solar_time"), `${name} 缺少真太阳时入口`);
  check(content.includes("trueSolarBirth"), `${name} 缺少 trueSolarBirth 传递规则`);
  check(content.includes("trueSolarResolution"), `${name} 缺少 trueSolarResolution 传递规则`);
  check(content.includes("未完成真太阳时复核"), `${name} 缺少民用时间 fallback 标识`);
}

check(modules.includes("export const MODULES"), "modules.ts 缺少 MODULES 注册表");
check(modules.includes("getModuleById"), "modules.ts 缺少 getModuleById");

const mappingDir = path.join(root, "knowledge-base", "fengshui", "mappings");
const mappingCount = fs.readdirSync(mappingDir).filter((name) => name.endsWith(".json")).length;
check(mappingCount === 6, `映射表数量应为 6，当前为 ${mappingCount}`);

console.log(`doc contracts: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  failures.forEach((message) => console.error(`- ${message}`));
  process.exitCode = 1;
}
