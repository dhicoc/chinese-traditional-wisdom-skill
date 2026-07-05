import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const appRoot = path.join(root, "apps", "visual");
const srcRoot = path.join(appRoot, "src");

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

function moduleIdsFromModulesSource(source) {
  const unionBlock = source.match(/export type ModuleId =([\s\S]*?);/);
  if (!unionBlock) return [];
  return Array.from(unionBlock[1].matchAll(/'([^']+)'/g)).map((match) => match[1]);
}

check(exists("apps/visual/src/lib/commandIntents.ts"), "应存在 CommandBar 命令意图模块 commandIntents.ts");
check(exists("apps/visual/src/components/shared/InterpretationCard.tsx"), "应存在通用 InterpretationCard.tsx");
check(exists("apps/visual/src/components/shared/LegendPanel.tsx"), "应存在通用 LegendPanel.tsx");
check(exists("apps/visual/scripts/generate-verify-page.mjs"), "应保留 React Shell verify.html 生成脚本");
check(exists("apps/visual/src/legacy/engineAdapters.ts"), "应存在 React 侧 EngineAdapterRegistry 包装模块");
check(exists("visual/react.html"), "应提供 visual/react.html 并行入口，避免直接替换旧 index.html");

const modules = read("apps/visual/src/lib/modules.ts");
const registry = read("apps/visual/src/components/app-shell/workspaceRegistry.tsx");
const commandBar = read("apps/visual/src/components/app-shell/CommandBar.tsx");
const commandIntents = read("apps/visual/src/lib/commandIntents.ts");
const copyButton = read("apps/visual/src/components/shared/CopyContextButton.tsx");
const homeDashboard = read("apps/visual/src/features/home/HomeDashboard.tsx");
const splitReader = read("apps/visual/src/features/knowledge/AncientTextSplitReader.tsx");
const testConsole = read("apps/visual/src/features/testing/TestRunnerConsole.tsx");
const testRegistry = read("apps/visual/src/legacy/testRegistry.ts");
const feixing = read("apps/visual/src/features/feixing/FeixingWorkspace.tsx");
const yunqi = read("apps/visual/src/features/yunqi/YunqiWorkspace.tsx");
const smoke = read("apps/visual/scripts/smoke-react-shell.mjs");
const legacyLoader = read("apps/visual/src/legacy/loadLegacyScripts.ts");
const engineAdapters = read("apps/visual/src/legacy/engineAdapters.ts");
const baziWorkspace = read("apps/visual/src/features/bazi/BaziWorkspace.tsx");
const ziweiWorkspace = read("apps/visual/src/features/ziwei/ZiweiWorkspace.tsx");

const ids = moduleIdsFromModulesSource(modules);
check(ids.includes("home"), "MODULES 应保留 home 模块 id");
check(ids.length === 14, "React MODULES 应覆盖 home + 13 个工作区模块");
for (const id of ids.filter((value) => value !== "home")) {
  check(registry.includes(id + ":"), "workspaceRegistry 应注册模块 " + id);
}
check(registry.includes("HomeDashboard"), "workspaceRegistry 应把未命中模块回退到 HomeDashboard");

check(!commandBar.includes("querySelector"), "CommandBar 不应通过 querySelector 直接操作 DOM");
check(commandBar.includes("dispatchCopyContextIntent(active.id)"), "CommandBar 复制上下文应派发 copy intent");
check(commandBar.includes("dispatchYearIntent('feixing'"), "CommandBar 应支持年份跳转到流年飞星");
check(commandBar.includes("dispatchYearIntent('yunqi'"), "CommandBar 应支持年份跳转到五运六气");
check(commandBar.includes("extractCommandYear(query)"), "CommandBar 应从输入 query 提取年份");
check(commandBar.includes("ArrowDown"), "CommandBar 应支持 ArrowDown 键盘导航");
check(commandBar.includes("ArrowUp"), "CommandBar 应支持 ArrowUp 键盘导航");
check(commandBar.includes("Enter"), "CommandBar 应支持 Enter 选择命令");
check(commandBar.includes("ctrlKey") && commandBar.includes("metaKey"), "CommandBar 应支持 Ctrl+K / Cmd+K 打开");

check(commandIntents.includes("ctw:copy-context"), "commandIntents 应定义复制上下文事件名");
check(commandIntents.includes("ctw:set-year"), "commandIntents 应定义年份跳转事件名");
check(commandIntents.includes("ctw.pendingYear"), "commandIntents 应定义年份 sessionStorage key");
check(commandIntents.includes("extractCommandYear"), "commandIntents 应暴露年份解析函数");
check(copyButton.includes("commandScope"), "CopyContextButton 应支持 commandScope 作用域");
check(copyButton.includes("COPY_CONTEXT_INTENT"), "CopyContextButton 应监听 CommandBar copy intent");
check(homeDashboard.includes('commandScope="home"'), "HomeDashboard 应提供首页上下文复制作用域");

check(legacyLoader.includes("iztro-2.5.8.min.js?raw"), "legacy loader 应加载 iztro v2.5.8 vendor");
check(legacyLoader.includes("lunar-javascript-1.7.7.js?raw"), "legacy loader 应加载 lunar-javascript vendor");
check(legacyLoader.includes("engine-adapters.js?raw") && legacyLoader.includes("data-bridge.js?raw"), "legacy loader 应加载 engine-adapters 与 data-bridge");
check(engineAdapters.includes("getLegacyEngineAdapter") && engineAdapters.includes("calculateWithLegacyAdapter"), "React 应通过包装模块调用 EngineAdapterRegistry");
check(baziWorkspace.includes("useBirth") && baziWorkspace.includes("calculateWithLegacyAdapter"), "BaziWorkspace 应使用全局生辰和 Adapter 计算");
check(ziweiWorkspace.includes("useBirth") && ziweiWorkspace.includes("calculateWithLegacyAdapter"), "ZiweiWorkspace 应使用全局生辰和 Adapter 计算");
check(ziweiWorkspace.includes("ZiweiIztroAdapter") && !ziweiWorkspace.includes("后续再接真实 iztro adapter"), "ZiweiWorkspace 不应继续停留在后续接入 iztro 的演示口径");

check(feixing.includes("readPendingCommandYear('feixing')"), "FeixingWorkspace 应读取 CommandBar 暂存年份");
check(feixing.includes("YEAR_INTENT_EVENT"), "FeixingWorkspace 应监听年份跳转事件");
check(feixing.includes("InterpretationCard"), "FeixingWorkspace 应接入 InterpretationCard");
check(feixing.includes("LegendPanel"), "FeixingWorkspace 应接入 LegendPanel");
check(yunqi.includes("readPendingCommandYear('yunqi')"), "YunqiWorkspace 应读取 CommandBar 暂存年份");
check(yunqi.includes("YEAR_INTENT_EVENT"), "YunqiWorkspace 应监听年份跳转事件");

check(homeDashboard.includes("getLegacyTools") && homeDashboard.includes("getCapabilityForTool"), "HomeDashboard 应接入 legacy ToolManifest / CapabilityRegistry 数据");
check(splitReader.includes("?raw"), "AncientTextSplitReader 应通过构建期 ?raw 引入古籍/映射内容");
check(testConsole.includes("TEST_SUITES"), "TestRunnerConsole 应使用 TEST_SUITES 注册表");
check(testRegistry.includes("check-react-migration"), "TestRunnerConsole 注册表应包含 React 迁移契约测试");
check(smoke.includes("InterpretationCard.tsx") && smoke.includes("LegendPanel.tsx"), "React Shell 冒烟测试应覆盖通用解读/图例组件");

check(modules.includes("iztro v2.5.8"), "MODULES 紫微说明应同步 iztro v2.5.8 能力口径");
check(modules.includes("数字起卦 Adapter"), "MODULES 梅花说明应同步数字起卦能力口径");

console.log("React migration contract check");
console.log("passed:", passed);
console.log("failed:", failed);
if (failed > 0) {
  console.error("Failures:");
  failures.forEach((message) => console.error("- " + message));
  process.exit(1);
}
