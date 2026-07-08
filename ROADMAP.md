# Chinese Traditional Wisdom AI Agent Workflow 项目优化与新功能演进路线图

> 面向开发维护者，规划周期为 3 个月。目标是把当前“Skill 文档 + 静态 Dashboard + 知识库”的项目，从可演示状态推进到更稳定、可验证、可扩展的产品化状态。

## Summary

核心方向：

- 稳定现有 11 标签可视化 Dashboard，降低 CDN、演示数据、近似计算带来的不确定性。
- 明确真实推算、近似推算、演示数据、外部引擎接入四类能力边界。
- 增强报告生成、知识检索、数据校验和测试体系。
- 新增面向实际咨询流程的向导式体验、报告导出、知识引用浏览等功能。

## 第 1 个月：稳定化与可信度优化

- ✅ 统一文档口径：同步 `README.md`、`README_AI.md`、`SKILL.md`、`tool-index.md`、`EVOLUTION.md` 中关于"真实计算 / 近似计算 / 演示数据 / 外部引擎"的描述。
- ✅ 给 Dashboard 增加能力标识：每个标签页显示"本地规则计算""本地近似计算""演示数据""需外部引擎"等状态。
- ✅ 修复离线可用性问题：Mermaid CDN 不可用时显示降级提示，不阻塞 Canvas 标签页。
- ✅ 强化输入校验：全局生辰输入增加年月日时范围校验、错误提示、非法日期拦截；不再静默回退到默认值。
- ✅ 优化测试入口：`visual/test-runner.html` 增加测试详情展开、失败原因、浏览器环境信息、总数统计与截图建议。
- ✅ 建立质量基线：记录测试总数、通过率、已知近似项和不可验证项，作为后续版本对照。

## 第 2 个月：核心能力增强

- ✅ 抽象引擎适配层：为八字、五运六气、紫微、六爻、梅花定义统一 Adapter 接口，字段包括 `engineName`、`mode`、`inputSchema`、`calculate()`、`toRenderData()`、`confidenceNote`。
- ✅ 八字引擎增强：保留当前纯 JS 引擎作为本地快速模式，优先接入 `6tail/lunar-javascript` 作为精确节气、干支、八字基础；输出中明确区分 `local-fast` 与 `lunar-javascript` 精确历法模式。
- ✅ 五运六气增强：补充当前步气、客主加临关系字段；先用 `6tail/lunar-javascript` 补精确大寒定年和节气边界，再参考 `dhicoc/wuyun-liuqi-skills` 校验 JSON 输出结构。
- ✅ 紫微/六爻/梅花体验策略：真实引擎内置前，标签页和咨询向导都要提供"真实测算尚未接入，是否查看演示结构"的确认；接入后默认走本地真实 Adapter，失败时才回退演示结构并显示降级原因。
- ✅ 搜索能力升级：将 `search.js` 的内置古籍索引与实际 `knowledge-base/fengshui` 文件清单对齐；结果展示增加来源、完整性、类别，并新增 `check-search-index.mjs` 契约测试。
- ✅ 报告生成规范化：固化 `REPORT_DATA` 版本号，静态 HTML 报告模板增加字段缺失提示、模块隐藏规则和数据来源说明。
- ✅ 风水映射校验：已为 6 个 JSON 映射表增加 `SCHEMA.md` 与 `check-mapping-schema.mjs`，覆盖字段完整性、方位覆盖、九星/八宅规则结构，并纳入 React 测试控制台。
- ✅ 紫微真实排盘：已接入 `SylarLong/iztro` v2.5.8，新增 `ZiweiIztroAdapter` 实现真实十二宫排盘；保留演示 fallback 和能力标识。
- ✅ 六爻与梅花路线：六爻已自研内置京房八宫纳甲引擎(`liuyao-engine.js`)，支持铜钱法/时间起卦/手动爻值，输出纳甲、六亲、六神、世应、用神、变卦；梅花优先自研小型 JS 起卦规则；不直接嵌入许可证受限或成熟度不足的项目。
- ✅ 梅花数字起卦：已实现 `method: "number"` 模式，使用 `numberA/numberB` 取数定上下卦与动爻。

## 第 3 个月：新功能与发布沉淀

- ✅ 新增"咨询向导"模式：在 Dashboard 首页提供健康、事业、婚恋、占卜、择居、综合六类入口，引导用户填写必要信息，再跳转对应标签页或生成报告数据。
- ✅ 新增报告导出：支持从当前 `FORTUNE` 数据快照生成静态 HTML 报告；导出文件名采用脱敏标识和日期，不保存完整生辰到长期日志。
- ✅ 新增知识引用浏览器：在风水、八宅、飞星相关标签页中点击术语或方位时，展示匹配的映射表条目和古籍索引，不只显示通用 tooltip。
- ✅ 新增案例沉淀工具：基于 `field-journal/_template.md` 生成脱敏案例草稿，强制只保留年份、问题类型、主要学科、失败/成功经验。
- ✅ 新增开发者诊断页：展示当前浏览器能力、脚本加载状态、引擎可用性、CDN 状态、测试入口链接。
- ✅ 发布 `v0.2`：更新 `EVOLUTION.md`，新增 `ROADMAP.md`，整理贡献说明和已知限制，形成可对外展示的稳定版本。


## 外部引擎候选与接入策略

> 调研日期：2026-07-02。以下项目作为后续开发候选，不代表已接入；接入前必须固定版本、补 Adapter 测试，并在 Dashboard 能力标识中展示实际模式。

| 能力 | 候选项目 | 许可证 / 成熟度 | 建议接入方式 | 风险与边界 |
|------|----------|----------------|--------------|------------|
| 紫微斗数真实排盘 | `SylarLong/iztro`（GitHub: `https://github.com/SylarLong/iztro`） | MIT；TypeScript/JavaScript；活跃度高；支持 npm、CDN、独立 JS 包 | 第一优先级。新增 `ZiweiIztroAdapter`，输入全局生辰，输出当前 `VizModules.ziwei.render()` 所需 12 宫结构；可先用本地 vendor JS，避免 CDN 依赖 | 紫微流派存在差异，需在 `confidenceNote` 写明采用 iztro 默认配置；保留演示数据 fallback |
| 八字精确节气 / 干支基础 | `6tail/lunar-javascript`（GitHub: `https://github.com/6tail/lunar-javascript`） | MIT；纯 JS；无第三方依赖；支持节气、干支、八字、五行、十神 | 第一优先级。新增 `BaziLunarAdapter`，用于替换当前月柱节气近似和日期边界；当前引擎保留为 `local-fast` fallback | 仍需对比一组固定样例，确认时辰、子初换日、节气边界策略符合项目口径 |
| 高精度历法备选 | `yuangu/sxtwl_cpp`（GitHub: `https://github.com/yuangu/sxtwl_cpp`） | BSD-3-Clause；C++/SWIG；基于寿星天文历 | 作为后端、CLI 或测试 oracle 备选，不作为静态 Dashboard 首选依赖 | C++ 构建和跨平台成本高，会破坏“纯前端双击可用”的默认架构 |
| 五运六气推算参考 | `dhicoc/wuyun-liuqi-skills`（GitHub: `https://github.com/dhicoc/wuyun-liuqi-skills`） | MIT；Python 主链路 + JS 可选接口；覆盖大寒定年、当前步位、客主加临、JSON 输出 | 第二优先级。先借鉴字段契约和测试样例；本项目保留轻量 JS 实现，必要时做 `YunqiExternalAdapter` | 不能直接把 Agent/RAG 工作流整体搬入 Dashboard；医学相关输出继续只做文化参考，不做诊疗建议 |
| 六爻纳甲 | `bopo/najia`（GitHub: `https://github.com/bopo/najia`） | MIT；Python；支持卦名、变爻、卦宫、六亲、六神、世应、纳甲 | 第三优先级。作为规则校验参考或 Python adapter；前端优先沉淀纳甲 JSON 表和 JS 规则 | 项目较小且活跃度一般，不宜直接成为核心运行依赖 |
| 梅花易数 | `muyen/meihua-yishu`（GitHub: `https://github.com/muyen/meihua-yishu`）等 | `muyen/meihua-yishu` 为 CC BY-NC-SA 4.0，含非商业限制；其他项目成熟度较低 | 不直接嵌入。优先自研时间起卦、数字起卦、动爻、互卦、变卦、错综规则的小型 JS 引擎 | 许可证限制和项目形态不适合直接进入产品代码；可作为规则说明参考 |

### 接入顺序

1. `6tail/lunar-javascript`：先解决八字节气近似和五运六气大寒定年边界，是当前可信度收益最高、架构影响最小的改动。
2. `SylarLong/iztro`：把紫微从演示数据升级为本地真实排盘，优先使用本地 vendor 文件或可选 npm 构建产物。
3. 五运六气字段增强：以本地 JS 为主，参考 `dhicoc/wuyun-liuqi-skills` 的 JSON 字段和测试样例补当前步气、客主加临。
4. 六爻：✅ 已落地。自研 `LiuyaoAdapter` 与京房八宫纳甲 JS 引擎(`visual/js/engines/liuyao-engine.js`)，不接 Python 依赖；Dashboard 默认走真实 Adapter，引擎未加载时回退演示并标注 `fallback-demo`。
5. 梅花：自研轻量 JS 引擎，避免非商业许可证项目进入运行代码。

### Adapter 验收标准

- 每个外部引擎 adapter 必须输出统一字段：`engineName`、`mode`、`version`、`inputSchema`、`sourceProject`、`license`、`calculate()`、`toRenderData()`、`confidenceNote`。
- 每个 adapter 至少提供 3 组固定样例测试：普通日期、节气边界日期、性别/时辰差异样例。
- Dashboard 能力标识必须区分 `local-exact`、`local-approx`、`demo`、`external-required`、`fallback-demo`。
- 外部引擎加载失败时不得阻塞 Dashboard；必须回退到当前演示或近似模式，并在标签页显示降级原因。
- 不得把完整姓名、完整出生日期、具体出生地写入长期日志或导出文件名。

## suanle-me 复用评估与接入计划

> 调研日期：2026-07-03。来源：`https://github.com/lyyxqg-lyy/suanle-me`，许可证 MIT，当前仓库为 Next.js 15 + TypeScript 应用，README 声明免费、开源、本地计算、无需登录，并提供 PWA、收藏、历史记录和本地规则化解读。该项目更适合作为产品体验与轻量本地规则参考，不应作为八字、紫微、六爻的精确排盘来源。

### 可复用能力分级

| 方向 | suanle-me 现状 | 本项目复用方式 | 优先级 | 边界 |
|------|----------------|----------------|--------|------|
| 工具目录与信息架构 | `fortuneTools` 用 `slug/title/intro/description/icon/accent/category` 统一管理紫微、八字、梅花、奇门、六爻、塔罗、解梦、每日运势、黄历、姓名、五行、AI 解读 | 新增 `visual/js/tool-manifest.js`，把当前 11 标签页和未来日用工具统一成 manifest；咨询向导、首页卡片、诊断页和报告导出都从 manifest 读取标题、分类、能力状态和入口 | P1 | 保持静态 Dashboard 架构，不迁移 Next.js/React |
| 结构化 Reading 契约 | `getToolReading()` 输出 `title/summary/score/tags/sections/chart/lines` | 在 `REPORT_DATA` 外新增 `READING_DATA` 或 `reading` 字段：用于报告摘要、咨询向导结果页、历史记录卡片；由各 Adapter 的 `toReading()` 生成 | P1 | `score` 只能作为体验指标，不得宣称精确吉凶分数 |
| 本地收藏与历史 | Zustand persist 保存 `favorites/history`，历史限制 30 条 | 用原生 `localStorage` 实现 `FORTUNE_HISTORY` 和 `FORTUNE_FAVORITES`，默认只保存脱敏摘要、模块、生成时间、能力模式，不保存完整生日、姓名、地点 | P1 | 必须提供清空入口；隐私测试覆盖不得泄露完整生辰 |
| PWA 与离线体验 | `manifest.webmanifest` + `sw.js`，强调本地计算和隐私 | 增加可选 `visual/manifest.webmanifest` 与轻量 `visual/sw.js`，缓存 `index.html`、核心 JS、vendor、CSS；诊断页显示 service worker 状态 | P2 | 双击 file 模式仍必须可用；PWA 只在 http/https 本地服务下启用 |
| 日用工具扩展 | 每日运势、黄历、姓名分析、周公解梦、五行分析、规则化 AI 解读 | 新增“日用工具”二级入口：黄历、姓名五行、梦境意象、每日节律；先作为本地规则模块接入，不影响核心命盘 | P2 | 解梦/运势为民俗体验和自我观察，不进严肃命盘结论 |
| 奇门遁甲入口 | 简化输出门、星、宫位和行动建议 | 作为第 12 个候选标签或咨询向导入口加入 roadmap；先定义 `QimenAdapter` 契约和演示确认，后续再接真实排盘/排局规则 | P3 | suanle-me 的奇门是 seed 化简化结果，不能直接标注为真实排局 |
| 三牌塔罗 | 本地三牌阵和提示语 | 不纳入传统文化核心 Dashboard；可作为“跨文化占卜体验”独立可选模块 | P3 | 避免稀释中国传统文化定位 |

### 不建议直接复用的部分

- 八字：`suanle-me` 的四柱计算是轻量日期/JDN 近似，缺少节气边界、子初换日、起运等严肃口径；本项目已内置 `lunar-javascript`，不应退回该实现。
- 紫微：`suanle-me` 只按 seed 挑选宫位和主星摘要，不是完整十二宫排盘；本项目仍优先接 `SylarLong/iztro`。
- 六爻：`suanle-me` 用 seed 生成老阴/少阳/少阴/老阳字符串和世应提示，不含纳甲、六亲、六神、卦宫、伏神等完整规则；只能作为演示文案参考。
- 梅花：本项目已实现本地时间起卦 Adapter；`suanle-me` 的数字起卦思路可补充为“数字起卦模式”，但不替代现有时间起卦。
- 远期 UI 栈：Next.js、React、Tailwind、Framer Motion、Recharts、Zustand 不作为当前静态 Dashboard 的必选迁移方向。

### 具体落地任务

1. `ToolManifest`：新增 `visual/js/tool-manifest.js`，字段包括 `id/title/category/entryTab/capabilityKey/questionTypes/requiredInputs/privacyLevel/reportSection`；工具入口、咨询向导和诊断页逐步改为读取 manifest。
2. `toReading()` 契约：扩展 Adapter 可选方法 `toReading(result, input)`，返回 `title/summary/tags/sections/chart/sourceNotes`；报告导出优先使用该结构生成摘要。
3. 本地历史与收藏：新增 `FORTUNE.storage` 或 `HistoryStore`，保存最近 30 条脱敏 reading 摘要；增加“清空历史”和隐私测试。
4. 日用工具路线：新增黄历、姓名五行、梦境意象、每日节律四个轻量本地模块，复用 `suanle-me` 的工具分类思路和小型词表结构，但输出必须带“民俗体验/非预测结论”说明。
5. 数字起卦补强：在梅花 Adapter 中增加 `method: time|number`，使用 `numberA/numberB/question` 生成数字起卦，作为当前时间起卦的用户可选模式。
6. PWA 试点：在不破坏双击打开的前提下，为本地 HTTP 访问增加 manifest 和 service worker；测试覆盖首次加载、断网刷新、vendor 缓存命中、注销缓存。
7. 来源归档：若复制或改写 `suanle-me` 的常量词表、工具描述或策略文案，必须在 `tool-index.md` 记录 MIT 来源、文件路径、采纳字段和改写范围。

### 验收标准

- 工具入口、咨询向导、诊断页和报告导出能从同一份 ToolManifest 读取模块元信息。
- 历史/收藏只保存脱敏摘要；隐私测试证明不保存完整姓名、完整出生日期、具体地点。
- 新增日用工具均有 `mode`、`confidenceNote`、`sourceNotes`，且不会进入严肃命盘结论。
- PWA 不影响 `file://` 双击可用；断网测试下核心 Canvas、内置 vendor、历史记录可用。
- `README.md`、`tool-index.md`、`EVOLUTION.md` 同步记录 `suanle-me` 的 MIT 参考来源和不复用精确算法的原因。

## React + Shadcn + Tailwind 迁移路线

> 规划日期：2026-07-03。依据 `TASTE_SKILL_UI.md`，目标是把当前静态 `visual/` Dashboard 逐步迁移为 React + Shadcn + Tailwind 的“新中式数据主义 / Academic Dark Mode”前端，同时保留现有 11 标签页、确定性引擎、Canvas 渲染、能力标识和测试契约。迁移策略采用 Strangler Fig：旧 `visual/index.html` 继续可用，新 React 应用先并行建设，验证充分后再切主入口。

### 迁移原则

- 不一次性重写 11 个标签页；先搭 App Shell，再逐个迁移工具页。
- 不破坏现有公开契约：tab id、`window.FORTUNE`、`ToolManifest`、`CapabilityRegistry`、`EngineAdapterRegistry`、Canvas renderer 接口和测试入口保持兼容。
- 先复用现有 `visual/js/` 的确定性计算与渲染模块，再逐步把高价值图表替换为 React/SVG 组件。
- 新 UI 以 `TASTE_SKILL_UI.md` 为最高设计方向：暗色底、朱砂红重点态、碧玉青 AI/洞察态、低饱和五行色、专业仪器感，避免玄学俗套、赛博霓虹和 Shadcn 默认皮肤。
- 在迁移完成前，旧静态页面和新 React 页面必须能并行测试、并行回归。

### Phase 0：冻结当前契约

- 建立 `visual/MIGRATION_REACT.md`，记录旧系统与新系统并存方式、不可破坏的接口、已知风险和回滚方式。
- 固定 11 个 tab id：`home`、`bazi`、`ziwei`、`liuyao`、`meihua`、`fengshui`、`feixing`、`bazhai`、`yunqi`、`tizhi`、`mermaid`。
- 记录当前基线：截图、浏览器控制台状态、`visual/test-runner.html` 结果、`node visual/js/tests/check-doc-contracts.mjs` 结果。
- 明确测试分类：Node contract tests、浏览器环境 tests、Canvas smoke tests、隐私测试。

### Phase 1：创建新前端基座

- 新建独立应用目录，建议路径：`apps/visual/`。
- 技术栈：Vite + React + TypeScript + Tailwind CSS + Shadcn UI + Radix primitives。
- 初始文件建议：
  - `apps/visual/package.json`
  - `apps/visual/vite.config.ts`
  - `apps/visual/tsconfig.json`
  - `apps/visual/index.html`
  - `apps/visual/src/main.tsx`
  - `apps/visual/src/App.tsx`
  - `apps/visual/src/styles/globals.css`
- 第一阶段不引入 Next.js，不立即引入 ECharts/Recharts，不把所有 Canvas 重写成 React 图表。

### Phase 2：落地设计 Tokens

- 把 `TASTE_SKILL_UI.md` 转换为 Tailwind 和 CSS variables：
  - 深炭背景：`#121212` / `#1a1c1e`
  - 卡片表面：`#1e1e24` / `#25262b`
  - 朱砂红：`#ae2012`
  - 碧玉青：`#0a9396`
  - 五行色：木 `#2a9d8f`、火 `#e76f51`、土 `#e9c46a`、金 `#e5e5e5`、水 `#264653`
- 字体策略：数据与代码使用 `JetBrains Mono` / `Inter`，标题与干支卦名使用 `Noto Serif CJK SC` 或系统宋体系 fallback。
- Shadcn 组件必须重设 radius、border、surface、accent 和 focus ring，不允许默认主题直接上线。

### Phase 3：Legacy Adapter 包装层

- ✅ 在 React 侧新增兼容层，不直接散落调用 `window` 全局对象：
  - `apps/visual/src/legacy/loadLegacyScripts.ts`
  - `apps/visual/src/legacy/legacyGlobals.ts`
  - `apps/visual/src/legacy/canvasRenderers.ts`
  - `apps/visual/src/legacy/capabilities.ts`
  - `apps/visual/src/legacy/toolManifest.ts`
- 第一阶段允许继续加载旧 `visual/js/core.js`、`bazi.js`、`ziwei.js`、`divination.js`、`fengshui.js`、`health.js`、`tool-manifest.js`、`capabilities.js`、`engine-adapters.js`。
- 等功能稳定后，再把旧 JS 模块逐步改成 ESM 和 TypeScript 类型声明。

### Phase 4：搭建 App Shell 与 11 标签导航

- ✅ 组件结构建议：
  - `components/app-shell/AppShell.tsx`
  - `components/app-shell/SidebarNav.tsx`
  - `components/app-shell/WorkspaceTabs.tsx`
  - `components/app-shell/CommandBar.tsx`
  - `components/app-shell/AgentStatusCard.tsx`
  - `features/home/HomeDashboard.tsx`
- 桌面端使用 Two-Tier Hybrid Layout：左侧模块导航，右侧工作区，顶部 CommandBar。
- 移动端使用顶部模块切换或抽屉导航，禁止 11 个标签在窄屏横向失控。
- `MODULES` 常量必须从现有 tab 和 `ToolManifest` 对齐，不新增含义不明的入口。

### Phase 5：迁移 Home Dashboard（✅ 已完成）

- 首页先迁移为 React 静态版，再接入 legacy `ToolManifest` 与 `CapabilityRegistry`。
- 首页展示：工具总数、本地能力数、演示边界数、模块分组、能力状态、隐私等级、问题类型。
- 每个工具卡片增加 `Copy context for AI` 按钮，输出当前工具的 LLM 友好 Markdown 上下文。
- 验收标准：数量与旧首页一致，能力 label 一致，点击工具可切换到对应 tab，不引入假数据。

### Phase 6：迁移 Canvas 型工具页（✅ 已完成）

- ✅ 先做通用组件：
  - `CanvasPanel.tsx`
  - `ControlField.tsx`
  - `InterpretationCard.tsx`
  - `LegendPanel.tsx`
  - `CopyContextButton.tsx`
- 迁移顺序建议：八字、五行、五运六气、体质、风水、流年飞星、八宅、紫微、六爻、梅花；当前 React Shell 已覆盖这批高可见模块的工作区外壳。
- 目录策略统一为英文业务语义目录：`features/constitution/`、`features/yunqi/`、`features/fengshui/`、`features/ziwei/`、`features/meihua/`、`features/liuyao/`；保留 `tizhi` 作为模块 id，不再新增 `features/tizhi/` 新实现。
- 每迁移一个 tab 都必须验证：输入变化后 Canvas 刷新、图例存在、解读文本保留、上下文可复制、移动端不溢出。
- ✅ 八字与紫微已从 React 工作区接入 Legacy `EngineAdapterRegistry`：八字读取全局生辰后走 `BaziLunarAdapter`，紫微通过 `ZiweiIztroAdapter` 调用本地 `SylarLong/iztro` v2.5.8；失败时保留本地 fallback，不把演示结构当作真实结论。
- 旧 renderer 若只接受 canvas id，第一阶段保留 id 方式；后续再改为接收 canvas element。
- 构建产物额外生成 `apps/visual/dist/verify.html`，用于人工逐路由回归；Node 侧保留 `scripts/smoke-react-shell.mjs` 进行结构级冒烟测试。

### Phase 7：CommandBar 全局调度（✅ 已完成）

- ✅ 第一版能力已落地：搜索工具名、切换 tab、输入年份跳转流年飞星/五运六气、复制当前上下文、打开测试控制台。
- 第二版能力：全局修改出生资料、一键刷新所有 tab、起卦快捷命令、搜索古籍文本。
- ✅ CommandBar 通过 `commandIntents.ts` 派发复制和年份跳转意图，不再通过 `querySelector` 直接操作 DOM。
- 快捷键：`Ctrl+K` / `Cmd+K` 打开；必须支持键盘选择和可访问焦点状态。

### Phase 8：知识图谱与古籍 Split Reader（✅ 已完成）

- Mermaid 先迁移为 React 组件，并保留 CDN/npm 加载失败时的源码降级显示。
- ✅ 第二步实现 `AncientTextSplitReader`：左侧显示古籍 markdown 原文，右侧显示 JSON AST / 映射结构，高亮关联字段。
- 若浏览器端无法直接读取本地古籍文件，则新增 manifest JSON 或构建时 import，不临时硬编码文件清单。

### Phase 9：TestRunnerConsole（✅ 已完成）

- ✅ 第一版：在新 React app 中提供测试入口、结果摘要和跳转旧 `visual/test-runner.html` 的链接。
- 第二版：浏览器端动态加载测试脚本，展示 rolling logs、verified badge、失败 diff 和环境信息。
- 必须区分 Node 测试与浏览器测试，避免在 Node 中直接运行依赖 `window` 的测试。

### Phase 10：逐步替换图表组件（✅ 第二阶段进行中）

- ✅ 第一阶段不为 React 化而重写稳定 Canvas；已新增 `InterpretationCard` / `LegendPanel` 作为 React 外围解释与图例组件，并新增 `DynamicTianPanBackground` 作为低亮度动态天盘气场背景；后续再替换交互收益高的模块：`FiveElementsRadar`、`QiWheel`、`NinePalaceGrid`、`HexagramLines`、`ZiweiPalaceGrid`。
- ✅ 第二阶段已落地 `RadarChart`（体质辨识）、`ZiweiPalaceGrid`（紫微斗数十二宫）、`FiveElementsChart`（八字五行相生相克图）、`HexagramChart`（六爻卦画）、`MeihuaChart`（梅花易数卦画）五个 SVG 组件，分别替换对应 Canvas：`ZiweiPalaceGrid` 复刻 4x4 环形十二宫布局，外环 12 地支各居一格、中心 2x2 命卦/四化/生辰/主星信息区，星曜彩色圆点 + 四化标签 + 庙旺，数据直接来自 `ZiweiIztroAdapter`；`FiveElementsChart` 复刻五行相生相克五边形，相邻边相生（虚线带箭头）、隔点相克（实线带箭头），顶点圆圈显示计数，配色对齐 legacy `CORE.wuxingColor`；`HexagramChart` 逐爻绘制六神(左)、爻线(阳实/阴断)、动爻红圈、地支六亲(右)、世应标签、底部卦名与用神，爻序遵循传统（上爻在顶、初爻在底）；`MeihuaChart` 含本卦卦画(左)、卦名/上下卦/变卦/动爻(右)、互卦 inset(右上，框高自适应)、体用生克(底部，体蓝/用红+箭头+释义)。ZiweiWorkspace / LiuyaoWorkspace / MeihuaWorkspace 不再依赖 `CanvasPanel`；BaziWorkspace 五行平衡不再调用 `renderLegacyWuxing`，四柱主盘暂保留 Canvas。
- 密集仪表优先 SVG 自绘；关系图谱继续保留 Mermaid；复杂布局必要时继续使用 Canvas。
- 替换前后必须做同输入对照，确保确定性输出无视觉漂移和数据漂移。

### Phase 11：测试与切换入口（✅ 并行验证完成）

- ✅ 已新增 `visual/js/tests/check-react-migration.mjs`，并把 React 迁移契约纳入测试控制台。后续可继续扩展测试建议：
  - `apps/visual/src/__tests__/modules.test.ts`
  - `apps/visual/src/__tests__/copy-context.test.ts`
  - `apps/visual/src/__tests__/command-bar.test.ts`
  - `apps/visual/src/__tests__/legacy-adapter.test.ts`
  - `apps/visual/e2e/smoke.spec.ts`
  - `apps/visual/e2e/navigation.spec.ts`
  - `apps/visual/e2e/canvas-render.spec.ts`
- ✅ 已新增并行入口 `visual/react.html`，指向构建产物 `apps/visual/dist/verify.html`；旧 `visual/index.html` 保持稳定主入口，不在本阶段替换。
- 主入口切换前，必须确认 11 tab 全部可打开、默认数据可渲染、CommandBar 可切换、Copy context 有效、375px 移动端不横向溢出、暗黑模式 contrast 合格、Mermaid fallback 可用。

### Sprint 建议

1. **Sprint 1：安全搭架**：创建 `apps/visual/`、安装 React/Tailwind/Shadcn、落地 tokens、实现 AppShell + 11 tab 导航 + HomeDashboard 静态版。
2. **Sprint 2：复用旧引擎**：完成 legacy script loader、CanvasPanel、迁移八字/五行/五运六气/体质、实现 Copy context。
3. **Sprint 3：补齐 11 tabs**：迁移风水/飞星/八宅/紫微/六爻/梅花、迁移 Mermaid、加入测试控制台入口。
4. **Sprint 4：新交互**：实现 CommandBar、全局出生资料同步、AncientTextSplitReader 雏形、浏览器 E2E smoke tests。

### 暂不做事项

- 不直接把旧 `visual/index.html` 改成 React 挂载点并一次性搬迁所有逻辑。
- 不在第一阶段引入 Next.js。
- 不一开始把所有 Canvas 改为 Recharts/ECharts。
- 不破坏 tab id、hash 行为和现有测试入口。
- 不使用 Shadcn 默认主题、赛博霓虹、玄学装饰或大面积发光效果。


- `window.FORTUNE` 保持公开入口，新增只读方法：
  - `getCapabilities()`：返回各模块能力状态。
  - `exportReportData()`：返回可填入 `REPORT_DATA` 的脱敏数据快照。
- `REPORT_DATA` 增加 `version`、`sourceNotes`、`generatedAt` 字段；旧字段保持兼容。
- 每个可视化模块继续通过 `registerVizModule()` 注册，不改变现有 `render*()` 调用方式。
- JSON 映射表保持现有文件路径，新增 schema 文档和测试，不直接改动业务含义。
- 所有报告模板继续内置免责声明、医疗边界和预测边界，不允许生成绝对化结论。

## Test Plan

- 单元测试：八字、五运六气、命卦、飞星、八宅、JSON schema、输入校验。
- 可视化测试：每个 Canvas 模块至少验证“可渲染、不报错、非空画布”。
- 文档一致性测试：检查 README/SKILL/tool-index 中列出的入口文件、模板、映射表真实存在。
- 离线测试：断网打开 `visual/index.html`，核心 Canvas 模块可用，Mermaid 降级有提示。
- 隐私测试：报告导出和案例沉淀不得写入完整姓名、完整出生日期、具体出生地。
- 验收标准：测试页面全部通过；Dashboard 无控制台致命错误；每个标签页都有能力标识；可成功导出一份静态 HTML 报告。

## 当前 v0.3 进行中范围

- 已落地：能力注册、标签页能力标识、统一引擎 Adapter 注册表、内置 `lunar-javascript` 精确历法、梅花时间起卦 Adapter、全局精确历法测算开关、输入校验、脱敏报告导出、脱敏案例草稿、开发者诊断页、Mermaid 离线降级、搜索索引对齐、测试页增强、JSON schema 校验脚本、文档契约检查脚本、全局命盘同步回归测试。
- 已边界收敛：六爻在 Dashboard 已升级为本地京房八宫纳甲引擎(`liuyao-engine.js`)，输出来自真实排盘而非演示；紫微已接入本地 `SylarLong/iztro` v2.5.8，梅花已内置时间/数字起卦规则。后续开发目标不是长期依赖外部服务，而是把可用开源引擎或自研规则内置到本地 Adapter。不同流派在纳甲地支顺逆与六神起例上可能存在口径差异，已在 `confidenceNote` 显式提示。
- 已内置精确历法与本地排盘：Dashboard 默认加载 `visual/vendor/lunar-javascript-1.7.7.js` 与 `visual/vendor/iztro-2.5.8.min.js`，八字使用精确节气干支，五运六气使用大寒边界修正，紫微使用 iztro 真实十二宫排盘；用户可关闭“精确历法测算”回退近似模式。
- v0.3 信息架构已开始落地：新增 `visual/js/tool-manifest.js`，工具目录可按 manifest 分组渲染；视觉方案重新设计，不再沿用 suanle-me 参考方向。
- React Shell 迁移面已补齐：`apps/visual/` 已具备 App Shell、统一 `workspaceRegistry.tsx`、完整 legacy script loader（含 vendor / engine-adapters / data-bridge）、`CanvasPanel` / `ControlField` / `CopyContextButton` / `InterpretationCard` / `LegendPanel`、CommandBar 命令意图、年份跳转、Node 冒烟测试、React 迁移契约测试与 `verify.html` 人工回归页；已迁移工作区包括八字、五行、五运六气、体质辨识、风水罗盘、流年飞星、八宅大游年、梅花易数、六爻占卜、紫微斗数、知识图谱、古籍 Split Reader、测试控制台与本地历史。
- React Phase 5-11 已形成并行验证闭环：`pnpm test` 当前 162 项通过，`node visual/js/tests/check-react-migration.mjs` 当前 58 项通过；浏览器端新增 `test-liuyao-engine.js`（17 项六爻纳甲领域规则 oracle）；`pnpm build` 会生成标注紫微与六爻 `local-exact` 的 `apps/visual/dist/verify.html`。旧 `visual/index.html` 不替换，继续作为稳定主入口；`visual/react.html` 作为并行验证入口。
- v0.3 结构化阅读与历史已落地：`EngineAdapterRegistry.toReading()` 契约已实现于八字/五运六气/梅花三个 Adapter；`HistoryStore` 本地历史与收藏已集成到旧 Dashboard 首页和 React Shell `history` 工作区；梅花数字起卦模式已内置。
- v0.3 咨询向导已落地：旧 Dashboard 首页新增"打开咨询向导"按钮，提供六类问题入口，调用 `toReading()` 生成结构化摘要并保存到历史；报告导出 `exportReportData()` 已集成 `readings` 字段并在 HTML 报告中展示。
- v0.3 PWA 试点已落地：新增 `manifest.webmanifest` 和 `sw.js`，仅在 http/https 下注册 Service Worker，`file://` 双击不加载 SW。
