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

const requiredFiles = [
  "README.md",
  "README_AI.md",
  "SKILL.md",
  "RULES.md",
  "tool-index.md",
  "EVOLUTION.md",
  "ROADMAP.md",
  "templates/visual-report.md",
  "visual/index.html",
  "visual/test-runner.html",
  "visual/js/capabilities.js",
    "visual/js/tool-manifest.js",
  "visual/js/history-store.js",
  "visual/js/engine-adapters.js",
  "visual/vendor/lunar-javascript-1.7.7.js",
  "visual/vendor/lunar-javascript-1.7.7.LICENSE",
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
const capabilities = read("visual/js/capabilities.js");

[
  ["README.md", readme],
  ["README_AI.md", readmeAi],
  ["SKILL.md", skill],
  ["tool-index.md", toolIndex],
  ["ROADMAP.md", roadmap]
].forEach(([name, content]) => {
  check(content.includes("本地近似计算"), `${name} 缺少本地近似计算口径`);
  check(content.includes("演示数据"), `${name} 缺少演示数据口径`);
  check(content.includes("外部引擎") || content.includes("需外部引擎"), `${name} 缺少外部引擎口径`);
});

["getCapabilities()", "exportReportData()"].forEach((apiName) => {
  check(readme.includes(apiName), `README.md 缺少 ${apiName}`);
  check(readmeAi.includes(apiName), `README_AI.md 缺少 ${apiName}`);
  check(skill.includes(apiName), `SKILL.md 缺少 ${apiName}`);
  check(capabilities.includes(apiName.replace("()", "")), `capabilities.js 缺少 ${apiName}`);
});

["version", "generatedAt", "sourceNotes"].forEach((field) => {
  check(reportTemplate.includes(field), `visual-report 模板缺少 ${field}`);
  check(capabilities.includes(field), `capabilities.js 导出缺少 ${field}`);
});

check(capabilities.includes("subject: {"), "exportReportData 缺少 subject");
check(capabilities.includes("birthYear"), "exportReportData 缺少脱敏出生年份");
check(!/subject:\s*\{[\s\S]{0,260}\b(month|day|hour)\s*:/.test(capabilities), "subject 不应导出完整月日时");
check(capabilities.includes("不包含完整出生日期"), "exportReportData 缺少隐私说明");
// 四层报告联动：exportReportData 应含 fourLayer 字段 + toFourLayerJS 归类函数
check(capabilities.includes("fourLayer: fourLayer"), "exportReportData 缺少 fourLayer 字段");
check(capabilities.includes("function toFourLayerJS"), "capabilities.js 缺少 toFourLayerJS 四层归类函数");
check(capabilities.includes("HIGHLIGHT_HEADINGS"), "toFourLayerJS 缺少 highlights 归类规则");
check(/四层报告 \(fourLayer\)/.test(capabilities), "downloadReport HTML 缺少四层报告渲染段");

const mappingDir = path.join(root, "knowledge-base", "fengshui", "mappings");
const mappingCount = fs.readdirSync(mappingDir).filter((name) => name.endsWith(".json")).length;
check(mappingCount === 6, `映射表数量应为 6，当前为 ${mappingCount}`);
check(toolIndex.includes("check-mapping-schema.mjs"), "tool-index.md 缺少 schema 校验入口");

console.log(`doc contracts: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  failures.forEach((item) => console.error(`- ${item}`));
  process.exitCode = 1;
}
