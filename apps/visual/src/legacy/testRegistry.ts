/**
 * 测试套件注册表 — 静态收集所有可执行测试的元信息。
 *
 * 分为三类：
 * - node:   Node.js CLI 测试（无法在浏览器中运行，展示命令与预期数量）
 * - browser: 浏览器端测试（可在 test-runner.html 中运行）
 * - verify:  自动验证页（dist/verify.html，构建后可用）
 */

export type TestSuiteType = 'node' | 'browser' | 'verify';

export interface TestSuite {
  id: string;
  name: string;
  type: TestSuiteType;
  description: string;
  /** 预期测试项数（Node 测试从上次运行记录，浏览器测试从 test-runner.html 解析） */
  expectedCount: number;
  /** Node 测试的 CLI 命令 */
  cliCommand?: string;
  /** 浏览器测试的入口 URL（相对于 visual/ 目录） */
  url?: string;
  /** 测试覆盖的模块/能力 */
  covers: string[];
}

export const TEST_SUITES: TestSuite[] = [
  // ── Node CLI 测试 ──────────────────────────────────
  {
    id: 'smoke-react-shell',
    name: 'React Shell 结构冒烟测试',
    type: 'node',
    description: '验证 React Shell 的文件结构、路由注册、canvas 数量、legacy 桥接、CopyContextButton 契约等。',
    expectedCount: 166,
    cliCommand: 'cd apps/visual && pnpm test',
    covers: ['AppShell', 'workspaceRegistry', 'CopyContextButton', 'DynamicTianPanBackground', 'pure-ts-engines'],
  },
  {
    id: 'check-react-migration',
    name: 'React 迁移契约检查',
    type: 'node',
    description: '验证 Phase 5-11 的核心迁移契约：CommandBar 不直接操作 DOM、年份跳转、Split Reader、测试控制台与通用解读/图例组件。',
    expectedCount: 58,
    cliCommand: 'node visual/js/tests/check-react-migration.mjs',
    covers: ['CommandBar', 'commandIntents', 'InterpretationCard', 'LegendPanel', 'AncientTextSplitReader', 'TestRunnerConsole'],
  },
  {
    id: 'check-doc-contracts',
    name: '文档契约检查',
    type: 'node',
    description: '验证 README / SKILL / tool-index / EVOLUTION 等文档中引用的文件、映射表、引擎脚本确实存在。',
    expectedCount: 58,
    cliCommand: 'node visual/js/tests/check-doc-contracts.mjs',
    covers: ['README.md', 'SKILL.md', 'tool-index.md', 'knowledge-base/mappings', 'visual/vendor'],
  },
  {
    id: 'check-mapping-schema',
    name: '风水映射表 schema 校验',
    type: 'node',
    description: '验证 6 个风水 JSON 映射表的字段完整性、方位覆盖、八宅与飞星规则结构。',
    expectedCount: 476,
    cliCommand: 'node visual/js/tests/check-mapping-schema.mjs',
    covers: ['life-trigram.json', 'eight-mansions.json', 'twenty-four-mountains.json', 'yearly-flying-stars.json', 'three-essentials.json', 'form-sha-cures.json'],
  },

  {
    id: 'check-knowledge-references',
    name: '知识引用浏览器校验',
    type: 'node',
    description: '验证知识引用查询模块、React 面板接入，以及二十四山、八宅、飞星等映射表可命中。',
    expectedCount: 37,
    cliCommand: 'node visual/js/tests/check-knowledge-references.mjs',
    covers: ['KnowledgeReferencePanel', 'queryKnowledgeReferences', 'fengshui/_index.md', 'fengshui/mappings'],
  },

  {
    id: 'check-search-index',
    name: '全局搜索索引校验',
    type: 'node',
    description: '验证 search.js 的风水古籍索引与实际文件清单对齐，并展示来源、类别、完整性字段。',
    expectedCount: 59,
    cliCommand: 'node visual/js/tests/check-search-index.mjs',
    covers: ['visual/js/search.js', 'knowledge-base/fengshui', 'GlobalSearch', 'KB_INDEX'],
  },

  // ── 浏览器端测试（test-runner.html） ────────────────
  {
    id: 'test-bazi',
    name: '八字引擎测试',
    type: 'browser',
    description: '验证八字排盘的干支计算、五行统计、十神关系等核心规则。',
    expectedCount: 0,
    url: '../../../visual/test-runner.html',
    covers: ['BaziEngine', '干支', '五行', '十神'],
  },
  {
    id: 'test-yunqi',
    name: '五运六气引擎测试',
    type: 'browser',
    description: '验证岁运、司天在泉、六步客气推算规则。',
    expectedCount: 0,
    url: '../../../visual/test-runner.html',
    covers: ['YunqiEngine', '岁运', '司天', '在泉'],
  },
  {
    id: 'test-data-bridge',
    name: '数据桥接测试',
    type: 'browser',
    description: '验证 FORTUNE 全局数据桥接与模块间同步。',
    expectedCount: 0,
    url: '../../../visual/test-runner.html',
    covers: ['data-bridge.js', 'FORTUNE', '全局同步'],
  },
  {
    id: 'test-v02-quality',
    name: 'v0.2 质量基线测试',
    type: 'browser',
    description: '验证 v0.2 版本设定的质量基线项。',
    expectedCount: 0,
    url: '../../../visual/test-runner.html',
    covers: ['质量基线', '能力标识', '输入校验'],
  },
  {
    id: 'test-liuyao-engine',
    name: '六爻纳甲引擎测试',
    type: 'browser',
    description: '验证京房八宫纳甲引擎：64卦覆盖、八宫归属、世应位置、八纯卦纳甲天干地支、六亲生克、六神起例、用神选取、起卦方式、变卦、确定性。',
    expectedCount: 17,
    url: '../../../visual/test-runner.html',
    covers: ['LiuyaoEngine', '八宫', '纳甲', '六亲', '六神', '世应', '用神', '变卦'],
  },
  {
    id: 'test-adapter-samples',
    name: 'Adapter 固定样例测试',
    type: 'browser',
    description: '验证八字/紫微/梅花/五运六气 Adapter 的固定样例（普通日期、节气/年份边界、性别/时辰差异）与确定性，满足 ROADMAP Adapter 验收标准。',
    expectedCount: 25,
    url: '../../../visual/test-runner.html',
    covers: ['BaziLunarAdapter', 'ZiweiIztroAdapter', 'LocalMeihuaTimeAdapter', 'YunqiLunarBoundaryAdapter', '确定性'],
  },
  {
    id: 'test-global-sync',
    name: '全局同步回归测试',
    type: 'browser',
    description: '验证全局命盘数据修改后各标签页同步刷新。',
    expectedCount: 0,
    url: '../../../visual/test-runner.html',
    covers: ['全局命盘', '同步刷新', '标签页联动'],
  },
  {
    id: 'test-viz-render',
    name: '可视化渲染测试',
    type: 'browser',
    description: '验证八字命盘、五行平衡图、五运六气、体质雷达图 Canvas 非空渲染。',
    expectedCount: 4,
    url: '../../../visual/test-runner.html',
    covers: ['VizModules.bazi', 'VizModules.health', 'Canvas 非空'],
  },

  // ── 自动验证页 ──────────────────────────────────────
  {
    id: 'verify-page',
    name: 'React Shell 自动验证页',
    type: 'verify',
    description: '构建后生成的 dist/verify.html，自动访问每个 hash 路由，检查标题、canvas 数量与非空像素。',
    expectedCount: 11,
    cliCommand: 'cd apps/visual && pnpm run build && pnpm run preview',
    url: '/verify.html',
    covers: ['所有模块路由', 'h2 标题', 'canvas 数量', 'canvas 像素'],
  },
];

export function getTestSuitesByType(type: TestSuiteType): TestSuite[] {
  return TEST_SUITES.filter((suite) => suite.type === type);
}

export function getTotalExpectedCount(): number {
  return TEST_SUITES.reduce((sum, suite) => sum + suite.expectedCount, 0);
}
