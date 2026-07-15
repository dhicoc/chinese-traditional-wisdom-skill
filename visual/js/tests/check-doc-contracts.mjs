import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");

let passed = 0;
let failed = 0;
const failures = [];

function check(condition, message) {
  if (condition) {
    passed++;
  } else {
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

// ── 应存在的文档与数据文件（不再依赖旧静态运行时 visual/js/*）──
const requiredFiles = [
  "README.md",
  "README_AI.md",
  "SKILL.md",
  "RULES.md",
  "tool-index.md",
  "EVOLUTION.md",
  "ROADMAP.md",
  "templates/visual-report.md",
  // React Dashboard 入口与核心契约源
  "apps/visual/index.html",
  "apps/visual/src/lib/modules.ts",
  "apps/visual/src/components/shared/ExportReportButton.tsx",
  "apps/visual/src/legacy/reportLayers.ts",
  "apps/visual/src/legacy/toolRegistry.ts",
  "knowledge-base/fengshui/mappings/SCHEMA.md",
  "knowledge-base/fengshui/mappings/life-trigram.json",
  "knowledge-base/fengshui/mappings/eight-mansions.json",
  "knowledge-base/fengshui/mappings/twenty-four-mountains.json",
  "knowledge-base/fengshui/mappings/yearly-flying-stars.json",
  "knowledge-base/fengshui/mappings/three-essentials.json",
  "knowledge-base/fengshui/mappings/form-sha-cures.json"
];

requiredFiles.forEach((relPath) => check(exists(relPath), `缺少入口或数据文件: ${relPath}`));

const readme = read("README.md");
const readmeAi = read("README_AI.md");
const skill = read("SKILL.md");
const toolIndex = read("tool-index.md");
const roadmap = read("ROADMAP.md");
const reportTemplate = read("templates/visual-report.md");
// React 版能力/导出契约源
const modules = read("apps/visual/src/lib/modules.ts");
const exportButton = read("apps/visual/src/components/shared/ExportReportButton.tsx");
const reportLayers = read("apps/visual/src/legacy/reportLayers.ts");

// ── 文档能力口径（与运行时无关；对齐文档当前用词 local-exact / local-approx / 演示）──
[
  ["README.md", readme],
  ["README_AI.md", readmeAi],
  ["SKILL.md", skill],
  ["tool-index.md", toolIndex],
  ["ROADMAP.md", roadmap]
].forEach(([name, content]) => {
  check(content.includes("local-approx") || content.includes("本地近似"), `${name} 缺少本地近似口径`);
  check(content.includes("演示"), `${name} 缺少演示数据口径`);
  check(content.includes("local-exact") || content.includes("本地精确") || content.includes("外部引擎") || content.includes("需外部"), `${name} 缺少精确/外部引擎口径`);
});

// ── React Dashboard 能力声明契约（取代旧 capabilities.js 的 getCapabilities）──
check(modules.includes("export const MODULES"), "modules.ts 缺少 MODULES 能力注册表");
check(modules.includes("export interface WisdomModule"), "modules.ts 缺少 WisdomModule 接口");
check(modules.includes("export function getModuleById"), "modules.ts 缺少 getModuleById 查询函数");
check(modules.includes("export function isModuleId"), "modules.ts 缺少 isModuleId 类型守卫");

// ── 报告导出契约（取代旧 capabilities.js 的 exportReportData）──
check(exportButton.includes("version"), "ExportReportButton 导出缺少 version 字段");
check(exportButton.includes("generatedAt"), "ExportReportButton 导出缺少 generatedAt 字段");
check(exportButton.includes("sourceNotes"), "ExportReportButton 导出缺少 sourceNotes 字段");
check(exportButton.includes("birth.year") || exportButton.includes("birthYear"), "ExportReportButton 导出缺少脱敏出生年份");
// 隐私：导出快照应保留脱敏说明
check(exportButton.includes("脱敏"), "ExportReportButton 导出缺少脱敏说明");

// ── visual-report 模板字段契约（保留）──
["version", "generatedAt", "sourceNotes"].forEach((field) => {
  check(reportTemplate.includes(field), `visual-report 模板缺少 ${field}`);
});

// ── 四层报告契约（取代旧 toFourLayerJS / HIGHLIGHT_HEADINGS）──
check(reportLayers.includes("export function toFourLayer"), "reportLayers.ts 缺少 toFourLayer 四层归类函数");
check(reportLayers.includes("export interface LayerReport"), "reportLayers.ts 缺少 LayerReport 接口");
check(reportLayers.includes("highlights"), "toFourLayer 归类应含 highlights 层");
check(reportLayers.includes("actions"), "toFourLayer 归类应含 actions 层");

// ── 映射表数量与 schema 入口（保留）──
const mappingDir = path.join(root, "knowledge-base", "fengshui", "mappings");
const mappingCount = fs.readdirSync(mappingDir).filter((name) => name.endsWith(".json")).length;
check(mappingCount === 6, `映射表数量应为 6，当前为 ${mappingCount}`);
check(toolIndex.includes("check-mapping-schema.mjs"), "tool-index.md 缺少 schema 校验入口");

console.log(`doc contracts: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  failures.forEach((item) => console.error(`- ${item}`));
  process.exitCode = 1;
}
