# 深度调研实施路线图

> 起草日期：2026-08-06。来源：两轮深度调研（4+5 个子代理并行联网，覆盖产品/功能/可视化/工程/AI协作 5 大维度）。
> 状态：**计划阶段**。按 §批次逐步落地，每批验证后提交。

---

## 进度审查（2026-08-07）

> 审查依据：当前 `main` 已推送至 `d3f70ae`，最近 GitHub Actions CI（run `31160686534`）的 Typecheck、Unit tests、Build 全部通过。工作区没有已跟踪文件改动；`.qwen/` 与 `docs/superpowers/` 是未跟踪的本地目录，不属于产品提交内容。

### 当前所处阶段

项目已经完成 **P0 的可验证基线**，并进入 **P1「命理深度挖潜」的后段**。八字和紫微的排盘、动态运限及展示已不再是计划项；尚未完成的是跨引擎架构收敛、统一流派配置，以及高阶判断和校时能力。

| 路线图项目 | 当前状态 | 审查结论 |
|---|---|---|
| P0.1 CI workflow | ✅ 已完成 | `.github/workflows/ci.yml` 已覆盖 visual/MCP typecheck、单测、smoke/contracts 与 visual build，并已在最新提交全绿。 |
| P0.2 共享引擎包 `packages/engines` | ⏳ 未开始 | MCP 仍复用 `apps/visual/src/legacy` 的引擎实现；这是仍需谨慎拆分的架构债。 |
| P0.3 证据链协议 | ✅ 已完成 | `ToolEnvelope` 与 `envelopeEvidence.ts` 已落地；八字等引擎输出步骤、事实、限制与计算配置。 |
| P1.1 MCP 专业度与 schema 快照 | 🟡 部分完成 | MCP 已有 TypeScript 类型检查和测试；annotations、完整 outputSchema 与工具 schema 快照仍需专项核验。 |
| P1.3 八字精确起运与动态运限 | ✅ 已完成 | `lunar-typescript` 精确起运、顺逆行、起运日期、大运、流年、流月、流日均已接入；动态层不改写本命四柱。 |
| P1.3 八字神煞扩展 | ✅ 已完成 | 已有 53 种规则、柱位检视与同柱去重，且资料已单独归档。 |
| P1.3 紫微 iztro 深度 | ✅ 已完成 | 已接入本命星曜分类、长生/博士十二神，以及大限、流年四化、流年命宫、逐宫流耀、岁前/将前十二神。 |
| P1.3 流派参数化 | 🟡 部分完成 | 八字神煞已有按年支/日支的查法切换；尚未收敛成全局 `EngineConfig`，紫微也尚无面向使用者的统一口径配置。 |
| P2 防编造机器校验 | 🟡 部分完成 | 已有证据链、计算配置、CI 与契约脚本；引用 ID、数值断言校验器、全引擎验证门仍待推进。 |
| P2 工程规范 | 🟡 部分完成 | TypeScript、测试、CI 已稳定；Biome、严格 tsconfig、循环依赖门禁、搜索索引升级尚未完成。 |
| P3 产品亮点与分发 | ⏳ 未开始 | 隐私标识、运限时间轴、通知与 npx/HTTP 分发仍是后续工作。 |

### 本轮新增待办：命理专业化收敛

以下项目来自八字与紫微当前能力审查。它们必须保持「确定性规则、可说明口径、可测试」的原则，不以模糊的自动解读替代计算事实。

| 优先级 | 待办 | 范围与验收 |
|---|---|---|
| P1.3a | 八字高阶判断规则 | 建立月令旺衰、格局、扶抑、调候、通关、从格/化气的显式规则与冲突优先级；每个结论输出采用口径、依据和限制；固定样例覆盖普通格、从格候选、寒暖燥湿边界。 |
| P1.3b | 真太阳时与地点校正 | 增加出生地/经纬度、时区、历史夏令时和地方时/真太阳时配置；明确默认不校正；对跨时辰与子初换日边界建立可复现测试。 |
| P1.3c | 流月流日联动体验 | 现有流月、流日快照已完成；后续增加流年—流月—流日时间轴、跨日期浏览与必要的流时层，但不得混入本命四柱。 |
| P1.3d | 紫微口径与进阶动态层 | 在 UI 与导出中明确 iztro 默认口径；将可配置的流派参数收敛至 `EngineConfig`；评估并测试流日、流时及三方四正等进阶层，避免未经核验的解释性推断。 |
| P1.3e | 规则来源与回归真值表 | 对八字、紫微每项新增规则标明来源、适用边界和固定排盘夹具；CI 中保留关键本命/大限/流年/月/日快照断言。 |

---

## 0. 调研核心结论

**定位判断**：本项目"确定性引擎 + MCP 薄壳 + React Dashboard"的架构路线被市场验证正确——最接近的竞品 mingyu（⭐273）、同构的 bazi-mcp（⭐416）、mcp-logic（确定性定理证明器包 MCP）都在走同一条路。**本项目不是方向错，而是缺两块**：

1. **工程深度**：无 CI、无 lint、mcp-server 跨 app 相对路径 import、搜索线性扫描
2. **防编造的机器校验**：RULES.md §11 是软约束，业界已有证据链协议/契约校验器/验证门等成熟打法

**差异化金矿（商业平台无法复制）**：
- 可验证的"零上传/本地计算"标识（纯前端可证明零网络请求）
- 跨系统联合分析（9 个 combo，商业平台没有）
- 古籍全文溯源 + 可导出复现报告
- 中医×命理 holistic 融合

---

## 1. 实施批次总览

| 批次 | 内容 | 参照项目 | 预估 |
|------|------|---------|------|
| P0 | CI workflow + 引擎抽共享包 + 证据链协议 | cal.com / tldraw / mingyu | 1-2天 |
| P1 | MCP 专业度（annotations/outputSchema/description）+ schema 快照测试 | 官方 servers / github-mcp-server | 2-3天 |
| P1 | 命理深度挖潜（精确起运/40神煞/iztro深度/流派参数化） | lunar / iztro / mingyu | 2-3天 |
| P2 | 防编造机器校验（契约校验器/引用ID/验证门） | superpowers / SymbolicAI / RAGFlow | 3-5天 |
| P2 | 工程规范（Biome/严格tsconfig/minisearch/本地存储版本化） | zod / TanStack / tldraw / VitePress | 3-5天 |
| P3 | 产品亮点（隐私标识/付费墙对照/每日推送/时间轴K线/幸运色） | Co-Star / Tomorrow / 观微 | 3-5天 |
| P3 | 可分发（npx/double-transport/Smithery/.claude-plugin） | bazi-mcp / trailofbits | 2-3天 |

---

## 2. P0：第一批（先做，性价比最高）

### 2.1 CI workflow（纯新增，零风险）

**目标**：建立全量回归基线。当前仓库零 CI，每次改动全凭本地测试。

**做法**（抄 cal.com `all-checks.yml`）：
- 新建 `.github/workflows/ci.yml`：
  - `on: [push, pull_request]`
  - job 串依赖：`typecheck` → `lint`（暂跳过，无 lint 配置）→ `unit` → `build` → `e2e`
  - 实际先落地：typecheck + vitest + mcp test + build
- 新建成后补 coverage：`davelosert/vitest-coverage-report-action`

**验收**：push 后 GitHub Actions 跑 typecheck + 全部单测，全绿。

### 2.2 引擎抽共享包 `packages/engines`（解决最大架构债）

**目标**：消除 `apps/mcp-server/src/tools.ts` 里 25 处 `../../visual/src/legacy/...` 跨 app 相对路径 import。

**现状**：mcp-server 用相对路径跨 app 导入 visual 的引擎，无导出边界、无版本、构建即脆。

**做法**（抄 tldraw/TanStack `packages/*`）：
1. 建根 `pnpm-workspace.yaml`：`packages: ['packages/*', 'apps/*']`
2. 新建 `packages/engines/`：从 `apps/visual/src/legacy` 提升引擎 + 共享类型
   - 每引擎一目录：`bazi/ liuyao/ qimen/ ziwei/ ...`（engine.ts + types.ts + __tests__）
   - 共享类型层：`envelope/ baseTypes.ts`（ToolEnvelope 等）
   - `index.ts` 只导出公开 API（enveloped 函数 + 类型）
3. `package.json`：`"name": "@wisdom/engines"`, `"exports": { ".": "./src/index.ts" }`
4. visual 和 mcp-server 改依赖 `@wisdom/engines`，删相对路径

**风险**：大重构，破坏构建风险高。**建议分步**：先建包 + 迁移类型层（baseTypes/ToolEnvelope），跑通测试；再迁移引擎；visual 依赖不动（visual 仍直接引 legacy 或改引包）。若风险过大可暂缓，先做 P0.1 和 P0.3。

### 2.3 证据链协议 `envelopeEvidence.ts`（防编造落地）

**目标**：把"口径披露/不伪造证据"从 RULES.md 软约束变成**类型强制**的结构。

**做法**（抄 mingyu `packages/core/src/prompt-evidence/`）：
1. 新建 `envelopeEvidence.ts`（放共享类型层）：
   ```ts
   export type EvidenceLevel = '主证' | '辅证' | '反证' | '限制' | '应期';
   export interface PromptEvidenceItem {
     level: EvidenceLevel;
     title: string;
     detail?: string;
     source?: string; // 古籍/历表/算法
     tags?: string[];
   }
   export interface CalculationStep {
     key: string; stage: string; status: 'ok'|'approx'|'fallback';
     inputs: unknown; result: unknown; dependsOnStepKeys?: string[];
     promptText: string; sources?: string[]; limitation?: string;
   }
   ```
2. 扩展 `ToolEnvelope` data 加 `evidence?: { steps: CalculationStep[]; facts: PromptEvidenceItem[]; limitations: string[] }`
3. 每个引擎补 evidence：记录计算步骤（定盘/四柱生成/大运推算）+ 事实（带 limitation 常量）+ 边界说明
4. **注意**：按 MEMORY 约束，evidence 只进 data/MCP 输出，不进 UI 文案（UI 只消费 summary）

**验收**：bazi/ziwei 两个引擎先带 evidence，MCP 返回可见；测试断言 evidence 结构存在。

---

## 3. P1：第二批

### 3.1 MCP 专业度（annotations/outputSchema/description）

**参照**：官方 servers 仓库（everything/memory/sequentialthinking）

**做法**：
1. **annotations 四元组**：每工具加 `{readOnlyHint, destructiveHint, idempotentHint, openWorldHint}`。排盘类 `readOnly:true, idempotent:true`；`cast_liuyao/meihua`（随机）`idempotent:false`
2. **outputSchema**：每工具定义返回结构，与 ToolEnvelope 对齐；返回 `{content:[text], structuredContent}` 双写
3. **description 长模板**：33 工具 description 加「When to use / 与相似工具的边界 / 参数说明」。特别处理相似工具选错：`combo_sanshi` vs `combo_sanshi_classic`、`calc_bazhai` vs `calc_feixing`、`get_constitution_tendency` vs `assess_constitution`
4. **title 字段**：每工具补人类可读名

### 3.2 工具 schema 快照测试

**参照**：github-mcp-server `internal/toolsnaps/`

**做法**：
- 导出全部 33 工具 JSON Schema 存 `.snap`，CI diff
- 防无意识改 schema 引发工具失效

### 3.3 命理深度挖潜

**参照**：lunar（已接入）、iztro（已接入）、mingyu

**做法**（改调用而非新开发，成本低）：
1. **八字精确起运 + 大运/流年/小运**：lunar `EightChar.getYun/getDaYun/getLiuNian/getXiaoYun` 已内置
2. **八字神煞 10→40 种**：lunar `getShenSha`
3. **黄历补字段**：六曜/建除十二值星/胎神方位/月相
4. **紫微 iztro 深度**：五行局/命主身主/身宫/三方四正/流日流时
5. **流派参数化收敛**：散落的流派开关收敛为 `EngineConfig` 全局对象 + 输出 `calculationConfig`
6. **真值表测试**：固定生辰断言整盘快照

---

## 4. P2：第三批

### 4.1 防编造机器校验

**参照**：superpowers（验证门/反模式表）、SymbolicAI（输出契约）、RAGFlow（引用ID）

**做法**：
1. RULES.md §11 加"引擎依据"小节：报告固定列本次调用轨迹
2. 反模式表：`| "这个我凭知识能排" | 排盘必须来自引擎 |` 等
3. 输出契约校验器：校验解读里每个数值性断言是否在 ToolEnvelope 中
4. 知识库条目加稳定 citation ID：`kb://fengshui/...md#坐向`

### 4.2 工程规范

**参照**：zod（Biome）、TanStack（严格tsconfig）、VitePress（minisearch）、tldraw（本地存储）

**做法**：
1. Biome 一体化 lint+format
2. tsconfig 严格项：`noUncheckedIndexedAccess`/`noUnusedLocals`/`noUnusedParameters`
3. `madge --circular` 循环依赖门禁
4. minisearch + bigram 中文分词替换线性扫描
5. 古籍 md 加 YAML frontmatter + 生成 kb-index.json
6. historyStore 版本化 + 迁移 + 隐私页

---

## 5. P3：第四批（产品亮点）

### 5.1 隐私标识 + 付费墙对照
- 用户可见的"零上传/本地计算"标识（每次结果旁）
- 首页"竞品收费功能 vs 本项目免费"对照表

### 5.2 每日运势本地推送 + 幸运色/数字/吉时
- Notification API + 定时调度
- 本命五行×今日五行查表

### 5.3 大运流年时间轴"人生K线"
- 八字工作区补时间轴（0-60岁、六大运分段、流年点）

### 5.4 可分发
- npx 分发（bin→dist）+ 双传输（stdio+HTTP）+ Smithery + `.claude-plugin`

---

## 6. 验收清单（每批通用）

- `pnpm typecheck` 通过
- `pnpm vitest run` 全过（当前 329）
- `pnpm test`（mcp-server）全过（当前 86）
- 契约测试 5 套全过
- 浏览器目测（涉及 UI 时）

## 7. 风险与回退

- **P0.2 引擎抽包**是最大风险（大重构）。分步走：先迁移类型层跑通，再迁移引擎；每步独立 commit，坏了一步步回退
- **P2.1 契约校验器**可能误伤解读质量，先小范围试点（bazi）再推广
- 每批独立 commit，`git revert` 单步回退
