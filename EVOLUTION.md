# EVOLUTION.md — 系统演进记录

> 本文件记录 chinese-traditional-wisdom-skill 各阶段的架构决策、取舍理由和关键变更。
> 日期倒序，最新在上。

---

## 2026-07 React Shell 迁移进展（v0.3 进行中）

### React + Tailwind + Shadcn 迁移基座

- **变更**：新增 `apps/visual/`，采用 Vite + React + TypeScript + Tailwind 作为新前端外壳，服务于 `TASTE_SKILL_UI.md` 中定义的新中式数据主义 / Academic Dark Mode 视觉方向。
- **App Shell**：已搭建 `SidebarNav`、`CommandBar`、`WorkspaceTabs`，并以 `workspaceRegistry.tsx` 统一管理工作区路由，避免在 `AppShell` 中继续堆叠条件分支。
- **Legacy 兼容层**：新增 `loadLegacyScripts.ts`、`canvasRenderers.ts`、`toolRegistry.ts`，通过 `?raw` 导入旧脚本并桥接 `LegacyCORE`、`LegacyVizModules`、`ToolManifest`、`CapabilityRegistry`，优先复用稳定的 Canvas renderer。

### 已迁移工作区

- **已接入 React Shell**：八字命盘、五行平衡、五运六气、体质辨识、风水罗盘、流年飞星、八宅大游年、梅花易数、六爻占卜、紫微斗数。
- **定位**：当前多数工作区属于“React 外壳 + 旧 renderer 兼容层”；紫微、六爻仍然使用演示结构数据，不宣称真实排盘；梅花先保留结构输入，后续再接时间 / 数字起卦规则。
- **目录策略**：工作区目录统一转向英文业务语义，如 `features/constitution/`、`features/yunqi/`、`features/fengshui/`、`features/ziwei/`、`features/meihua/`、`features/liuyao/`。保留 `tizhi` 作为模块 id，但不再新增 `features/tizhi/` 新实现。

### 验证与回归

- **Node 冒烟测试**：新增 `apps/visual/scripts/smoke-react-shell.mjs`，验证 `#bazi` / `#yunqi` / `#tizhi` / `#fengshui` / `#feixing` / `#bazhai` / `#meihua` / `#liuyao` / `#ziwei` 的 Canvas 工作区数量与 registry 契约。
- **人工回归页**：构建后生成 `apps/visual/dist/verify.html`，列出当前已迁移 hash 路由，便于人工逐页检查 Canvas 非空、控件可编辑、复制按钮可用。
- **当前结果**：`npm --prefix apps/visual run build`、`npm --prefix apps/visual test`、`node visual/js/tests/check-doc-contracts.mjs` 均通过。

## 2026-07 v0.2 稳定化与能力边界

### Dashboard 可信度与离线能力

- **变更**：新增 `visual/js/capabilities.js`，统一维护 11 个标签页的能力状态、可信度说明、输入校验、报告导出、诊断入口。
- **引擎适配层**：新增 `visual/js/engine-adapters.js`，把八字、五运六气、紫微、六爻、梅花统一为 `calculate()` / `toRenderData()` 契约；已内置 `visual/vendor/lunar-javascript-1.7.7.js`，八字默认使用精确节气干支，五运六气默认使用大寒边界修正；用户可关闭精确历法测算回退本地近似；紫微、六爻仍为演示 Adapter；梅花已升级为本地时间起卦 Adapter。
- **能力边界**：八字/五运六气标注为本地精确计算并保留近似 fallback；紫微/六爻标注为演示数据且真实计算需外部引擎；梅花标注为本地规则计算；飞星/八宅/风水罗盘标注为本地规则计算。
- **离线降级**：Mermaid CDN 不可用时，知识图谱显示源码降级提示，Canvas 标签页继续可用。
- **隐私**：`FORTUNE.exportReportData()` 只导出年份和性别等脱敏字段，不把完整出生日期写入长期日志；案例草稿也按脱敏字段生成。

### 测试与数据契约

- **测试入口**：`visual/test-runner.html` 增加环境信息、失败详情展开、总数统计、截图建议，并新增 v0.2 质量基线测试。
- **映射表校验**：新增 knowledge-base/fengshui/mappings/SCHEMA.md 与 `visual/js/tests/check-mapping-schema.mjs`，校验 6 个 JSON 映射表的字段和覆盖范围。
- **报告契约**：`REPORT_DATA` 增加 `version`、`generatedAt`、`sourceNotes`，旧字段保持兼容。

---
## 2026-06 可视化系统 + 风水知识库

### 11 标签页可视化系统

- **变更**：visual/ 从单一 Mermaid 页面升级为 11 标签页一站式可视化工具
- **标签页**：首页 / 八字命盘 / 紫微斗数 / 六爻占卜 / 梅花易数 / 风水罗盘 / 流年飞星 / 八宅大游年 / 五运六气 / 体质辨识 / 知识图谱
- **渲染引擎**：Canvas 2D API（原生绘制多数命盘+罗盘），Mermaid.js v10.9.1（流程图+思维导图）
- **三门技术选型理由**：

| 方案 | 选型 | 理由 |
|------|------|------|
| 命盘/罗盘绘制 | Canvas 2D API | 原生无依赖，无需加载大型可视化库，控制精确 |
| 流程图/关系图 | Mermaid.js | 声明式语法，可读性强，更新维护成本低 |
| 数据可视化 | Chart.js (CDN) | 雷达图（体质）+扇形图（八宅），轻量够用 |
| 纯前端架构 | 无服务器 | 双击 index.html 即可在浏览器打开，零部署成本 |

- **取舍**：没有用 ECharts 或 D3.js，原因是本项目的图表类型有限（命盘、罗盘、六爻都是专门格式），通用图表库反而要多加载不必要的代码

### Mermaid 显示问题修复

- **问题**：Mermaid 在 `display: none` 页面中渲染时 SVG 尺寸可能为 0，加上 `startOnLoad: true` 和手动初始化之间的竞态条件
- **方案**：改 `startOnLoad: false` → 手动 `mermaid.run()` → tab 切换时重新渲染（此时 tab 可见，尺寸正确）
- **原则**：隐藏容器内的 DOM 渲染问题优先用"切换时重新渲染"而非"预渲染+缓存"

### 风水知识库 + mappings/

- **变更**：新增 `knowledge-base/fengshui/` 30 个文件，总计 21.5 万字，覆盖 16+ 古籍
- **文件结构**：形势卷（10 文件）/ 理气卷（10 文件）/ 阳宅卷（10 文件）
- **新增 mappings/**：6 个 JSON 键值映射表（命卦 / 八宅 / 二十四山 / 流年飞星 / 阳宅三要 / 形煞）
- **放弃 RAG 方案**：经 SAG 评估，传统命理如六爻起卦和八字排盘不适合 embedding / 向量检索，改用确定性 JSON 映射表 + 结构化的 knowledge-base 文件组织
- **原则**：确定性查询优先于 embedding，一表胜千向量

---

## 2026-05 三层路由 + 融合分析 + 模板系统

### 三层路由

- **变更**：咨询流程从单一链式改为三层路由（问题类型 → 学科 → 融合深度）
- **问题类型**：8 种（健康/事业/婚姻/学业/择居/占卜/心灵/综合）
- **学科**：4 种（玄学/中医/道家/佛教）
- **深度**：3 级（轻度/标准/深度）
- **理由**：用户问题复杂度差异大，固定全流程分析对简单问题过度，对复杂问题不够
- **取舍**：没有把路由做到 4 层以上，每层粒度经过实际对话测试后定型

### 融合分析

- **变更**：新增跨学科交叉点列表（命理+中医、命理+风水、中医+道家 等 8 组），在报告中体现交叉视野
- **理由**：单纯罗列各学科结论是拼盘而非融合，交叉点才是 holisitic 的核心价值

### 模板系统

- **变更**：新增 templates/ 6 个报告模板
- **每个模板内置 RULES.md 合规话术**：医疗建议 disclaimer、预测免责、积极导向等不再靠 AI 自行记住，而是固化在模板文本中

---

## 2026-04 初始搭建

- **初始架构**：纯 SKILL.md + reference 文件 + field-journal/
- **引擎集成**：7 个 bootstrap 指南覆盖八字 / 紫微 / 六爻 / 梅花 / 五运六气 / 体质 / 风水
- **reference 文件**： metaphysics / tcm / daoism / buddhism 各一份
- **知识库**：选址择居需要的大量古籍文本，开始搭建 fengshui/ 目录

---

## 架构原则（持续有效）

1. **确定性查询优先** — 命理映射（天干地支冲合、纳音、神煞等）用 JSON 表，不依赖 embedding
2. **一步到位** — 数据层面覆盖所有古籍原文（30 文件 21.5 万字），不在分析时缺漏再补
3. **模板固化合规** — 伦理要求直接写入模板文件，不靠 AI 记忆
4. **可视化可部署** — 纯前端无服务器，用户只需双击 index.html
5. **演进留痕** — 本文件随每次架构调整更新
