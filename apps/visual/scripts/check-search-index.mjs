import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const fengshuiDir = path.join(root, "knowledge-base", "fengshui");
const searchPath = path.join(root, "visual", "js", "search.js");

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

function collectMarkdownFiles(dir, prefix = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = prefix ? prefix + "/" + entry.name : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath, relPath));
    } else if (entry.name.endsWith(".md") && entry.name !== "_index.md" && entry.name !== "SCHEMA.md") {
      files.push(relPath);
    }
  }
  return files.sort();
}

function loadGlobalSearch() {
  const source = fs.readFileSync(searchPath, "utf8");
  const context = vm.createContext({
    window: {},
    CORE: {
      termExplanations: {
        "玄空飞星": "理气派以时间和方位推演九星流转。"
      }
    }
  });
  new vm.Script(source, { filename: "search.js" }).runInContext(context);
  return { search: context.window.GlobalSearch, source };
}

check(fs.existsSync(searchPath), "应存在 visual/js/search.js 全局搜索模块");

const actualFiles = collectMarkdownFiles(fengshuiDir);
const { search, source } = loadGlobalSearch();

check(Boolean(search), "search.js 应向 window.GlobalSearch 暴露 API");
check(typeof search.searchAll === "function", "GlobalSearch 应暴露 searchAll(query)");
check(typeof search.getIndexStats === "function", "GlobalSearch 应暴露 getIndexStats()");

const stats = search.getIndexStats();
check(stats.mappings === 6, "搜索映射表索引应覆盖 6 个 JSON 映射表");
check(stats.knowledgeBase === actualFiles.length, "古籍索引数量应与 knowledge-base/fengshui 实际 Markdown 文件数一致");
check(Array.isArray(stats.mappingFiles), "getIndexStats 应返回 mappingFiles，便于诊断映射来源");
check(Array.isArray(stats.knowledgeBaseFiles), "getIndexStats 应返回 knowledgeBaseFiles，便于诊断古籍来源");

const expectedMappings = [
  "life-trigram.json",
  "eight-mansions.json",
  "twenty-four-mountains.json",
  "yearly-flying-stars.json",
  "three-essentials.json",
  "form-sha-cures.json"
];
for (const file of expectedMappings) {
  check(stats.mappingFiles.includes(file), "映射表索引应包含 " + file);
}

const indexedFiles = new Set(stats.knowledgeBaseFiles);
for (const file of actualFiles) {
  check(indexedFiles.has(file), "古籍索引应包含实际文件 " + file);
}
check(!indexedFiles.has("_index.md"), "古籍索引不应把 _index.md 当作正文条目");
check(indexedFiles.size === stats.knowledgeBaseFiles.length, "古籍索引不应包含重复文件");

const missingFiles = actualFiles.filter((file) => !indexedFiles.has(file));
const extraFiles = stats.knowledgeBaseFiles.filter((file) => !actualFiles.includes(file));
check(missingFiles.length === 0, "古籍索引不应遗漏实际 Markdown 文件");
check(extraFiles.length === 0, "古籍索引不应引用不存在的 Markdown 文件");

const mountainResult = search.searchAll("二十四山").mappings[0];
check(Boolean(mountainResult), "搜索“二十四山”应命中映射表");
check(mountainResult?.source === "knowledge-base/fengshui/mappings/twenty-four-mountains.json", "映射表结果应返回 source 来源路径");
check(mountainResult?.category === "罗盘方位", "映射表结果应返回 category 类别");
check(mountainResult?.completeness === "完整映射", "映射表结果应返回 completeness 完整性");

const xuankongResult = search.searchAll("玄空").kb[0];
check(Boolean(xuankongResult), "搜索“玄空”应命中古籍索引");
check(Boolean(xuankongResult?.file), "古籍结果应返回 file 来源路径");
check(Boolean(xuankongResult?.category), "古籍结果应返回 category 类别");
check(Boolean(xuankongResult?.completeness), "古籍结果应返回 completeness 完整性");

check(source.includes("escapeHtml(m.category"), "映射表 UI 应展示类别字段");
check(source.includes("escapeHtml(m.completeness"), "映射表 UI 应展示完整性字段");
check(source.includes("escapeHtml(m.source"), "映射表 UI 应展示来源字段");

const line = "─".repeat(56);
console.log(line);
console.log("search index contracts");
console.log(line);
console.log("passed: " + passed);
console.log("failed: " + failed);
if (failures.length > 0) {
  console.log("");
  console.log("failures:");
  for (const f of failures) console.log("  ✗ " + f);
}
console.log(line);

if (failed > 0) process.exit(1);
