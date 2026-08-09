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
  "apps/mcp-server/README.md",
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
  "apps/visual/src/legacy/trueSolarTime.ts",
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
const mcpReadme = read("apps/mcp-server/README.md");
const toolIndex = read("tool-index.md");
const roadmap = read("ROADMAP.md");
const reportTemplate = read("templates/visual-report.md");
// React 版能力/导出契约源
const modules = read("apps/visual/src/lib/modules.ts");
const exportButton = read("apps/visual/src/components/shared/ExportReportButton.tsx");
const reportLayers = read("apps/visual/src/legacy/reportLayers.ts");
const trueSolarTime = read("apps/visual/src/legacy/trueSolarTime.ts");
const rules = read("RULES.md");
const baziBootstrap = read("bootstrap/bazi-engine.md");
const ziweiBootstrap = read("bootstrap/ziwei-engine.md");

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
check(exportButton.includes("generatedAt"), "ExportReportButton 导出缺少生成时间");
check(exportButton.includes("birth.year") || exportButton.includes("birthYear"), "ExportReportButton 导出缺少出生资料摘要");
check(exportButton.includes("text/html;charset=utf-8"), "ExportReportButton 应导出独立 HTML 文件");
check(!exportButton.includes("sourceNotes"), "ExportReportButton 不应导出 sourceNotes 内部字段");
check(!exportButton.includes("engineName"), "ExportReportButton 不应导出 engineName 内部字段");
check(!exportButton.includes("version:"), "ExportReportButton 不应导出 version 内部字段");

// ── visual-report 模板字段契约（保留）──
["version", "generatedAt", "sourceNotes"].forEach((field) => {
  check(reportTemplate.includes(field), `visual-report 模板缺少 ${field}`);
});

// ── 四层报告契约（取代旧 toFourLayerJS / HIGHLIGHT_HEADINGS）──
check(reportLayers.includes("export function toFourLayer"), "reportLayers.ts 缺少 toFourLayer 四层归类函数");
check(reportLayers.includes("export interface LayerReport"), "reportLayers.ts 缺少 LayerReport 接口");
check(reportLayers.includes("highlights"), "toFourLayer 归类应含 highlights 层");
check(reportLayers.includes("actions"), "toFourLayer 归类应含 actions 层");

// ── 真太阳时 Agent-first 契约 ──
check(trueSolarTime.includes("export function resolveTrueSolarTime"), "trueSolarTime.ts 缺少 resolveTrueSolarTime 确定性校准函数");
check(trueSolarTime.includes("utcOffsetEvidence"), "trueSolarTime.ts 缺少历史 UTC 偏移核验依据字段");
check(trueSolarTime.includes("equationOfTimeMinutes"), "trueSolarTime.ts 缺少均时差输出");
[
  ["SKILL.md", skill],
  ["README_AI.md", readmeAi],
  ["tool-index.md", toolIndex],
  ["RULES.md", rules],
  ["bootstrap/bazi-engine.md", baziBootstrap],
].forEach(([name, content]) => {
  check(content.includes("resolve_true_solar_time"), `${name} 缺少 resolve_true_solar_time 真太阳时契约`);
  check(content.includes("trueSolarBirth"), `${name} 缺少 trueSolarBirth 调用链`);
  check(content.includes("未完成真太阳时复核"), `${name} 缺少真太阳时降级标记`);
});
check(rules.includes("禁止凭模型记忆"), "RULES.md 缺少禁止凭模型记忆校时规则");
check(rules.includes("引擎依据与调用轨迹"), "RULES.md 缺少引擎依据与调用轨迹规则");
check(rules.includes("ToolEnvelope.tool") && rules.includes("presentationToken"), "RULES.md 缺少调用轨迹字段边界");
check(rules.includes("反模式表") && rules.includes("这个我凭知识能排") && rules.includes("自由文本已通过校验"), "RULES.md 缺少防编造反模式表");
check(rules.includes("numericAssertionToken") && rules.includes("data.*") && rules.includes("自由文本已自动校验"), "RULES.md 缺少数值断言校验边界");
[
  ["README.md", readme],
  ["README_AI.md", readmeAi],
  ["SKILL.md", skill],
  ["tool-index.md", toolIndex],
  ["apps/mcp-server/README.md", mcpReadme],
].forEach(([name, content]) => {
  check(content.includes("43 个工具"), `${name} 缺少 43 个工具当前统计`);
  check(content.includes("32 个计算工具"), `${name} 缺少 32 个计算工具当前统计`);
  check(content.includes("validate_bazi_presentation"), `${name} 缺少八字呈现校验工具`);
  check(content.includes("validate_ziwei_presentation"), `${name} 缺少紫微呈现校验工具`);
  check(content.includes("validate_bazhai_presentation"), `${name} 缺少八宅呈现校验工具`);
  check(content.includes("validate_feixing_presentation"), `${name} 缺少流年飞星呈现校验工具`);
  check(content.includes("validate_calendar_presentation"), `${name} 缺少历法与年度盘面呈现校验工具`);
  check(content.includes("validate_divination_presentation"), `${name} 缺少占测／卦象呈现校验工具`);
  check(content.includes("validate_daily_presentation"), `${name} 缺少日用与民俗呈现校验工具`);
  check(content.includes("validate_combo_presentation"), `${name} 缺少组合工具呈现校验工具`);
  check(content.includes("评分理由、淘汰理由、黄历全文、首选结论、吉时、行动建议"), `${name} 缺少组合择日呈现校验边界`);
  check(content.includes("喜用神日主/同异类五行及分数/强弱/用神"), `${name} 缺少喜用神呈现校验边界`);
  check(content.includes("五运六气体质倾向的岁运/司天/在泉与倾向类型"), `${name} 缺少五运六气体质倾向校验边界`);
  check(content.includes("梦象命中状态及条目标题/分类/吉凶标签"), `${name} 缺少梦象呈现校验边界`);
  check(content.includes("validate_numeric_assertions"), `${name} 缺少数值断言校验工具`);
  check(content.includes("resolve_true_solar_time"), `${name} 缺少真太阳时 MCP 调用`);
  check(content.includes("trueSolarBirth"), `${name} 缺少 trueSolarBirth 调用链`);
});
[
  ["README.md", readme],
  ["README_AI.md", readmeAi],
  ["apps/mcp-server/README.md", mcpReadme],
].forEach(([name, content]) => {
  check(!content.includes("共 24 个工具"), `${name} 仍包含过期的 24 工具统计`);
  check(!content.includes("共 27 个工具"), `${name} 仍包含过期的 27 工具统计`);
  check(!content.includes("25 个计算工具"), `${name} 仍包含过期的 25 个计算工具统计`);
});
check(!rules.includes("按子时处理"), "RULES.md 不得在未知时辰时默认按子时处理");
check(ziweiBootstrap.includes("只定义八字预处理"), "ziwei-engine.md 应明确真太阳时仅为八字预处理契约");
check(!ziweiBootstrap.includes("cities.ts"), "ziwei-engine.md 不应依赖不存在的 cities.ts 城市坐标表");

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
