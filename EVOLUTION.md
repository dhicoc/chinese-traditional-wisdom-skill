# EVOLUTION.md — 系统演进记录

> 本文件记录 chinese-traditional-wisdom-ai-agent-workflow 各阶段的架构决策、取舍理由和关键变更。
> 日期倒序，最新在上。

---

## 2026-07-08 Phase 9 v2 + fate 复用计划落地

### Phase 9 第二版：TestRunnerConsole 页内动态测试

- **新增 `browserTestRunner.ts`**：用 `?raw` import 浏览器测试脚本源码（与 loadLegacyScripts 同策略），legacy 引擎就绪后 eval 注入并调用 `window.TestXxx.run()`，返回 `{passed, failed, details[], durationMs}`。
- **TestRunnerConsole 新增「页内运行」面板**：运行按钮 + rolling results（逐套件实时追加）+ 通过/失败计数 + 失败详情列表 + 运行错误提示。当前支持 `test-liuyao-engine`（17 项六爻纳甲 oracle），架构可扩展（`BROWSER_TEST_SPECS` 注册新套件即可）。
- **意义**：测试控制台从「静态跳转入口」升级为「页内可执行 + 实时结果」，无需跳转旧 `test-runner.html`。

### fate 项目复用计划写入 ROADMAP

- 调研 babyname/fate（MIT，2.4k stars）完整模块结构，按复用价值分级。
- 已复用：康熙笔画 + 字义五行（`kangxiStrokes.json`，22107 字）。
- 待落地（写入 ROADMAP 新节）：81 数理详注表（P1）、三才配置详描（P1）、喜用神算法（P2）、生肖喜忌用字（P2）、字义出处（P3）、五维评分体系（P3）。
- 不复用：chronos 引擎、纳音（已用 lunar）、周易（已有六爻/梅花）、Go 后端栈。

### 同步

- ROADMAP 新增「fate 项目复用计划」节与「React 迁移剩余优化（Phase 7-11 后续）」节，Phase 9 第二版标记完成。

---

## 2026-07-08 Phase 10 收官：风水罗盘 SVG + 全工作区脱离 Canvas

### 变更

- **新增 `FengshuiCompass`**：React + SVG 二十四山罗盘，替换 FengshuiWorkspace 的 `CanvasPanel` + `renderLegacyCompass`——Phase 10 最后一个待替换模块。
- **布局**：三环罗盘——外环二十四山（阳山暖色/阴山冷色，对齐 `YANG_MOUNTAINS`）、中环八卦符号+卦名、内环八方向、中心十字（北红南黑）。「子」居正北，每山 15°，24 山按 `CORE.twentyFourMountains` 顺序顺时针；径向文字按方位旋转（左侧翻转避免倒读）。环半径与 legacy `compassRender` 完全一致。
- **数据自包含**：二十四山、八卦方位、阴阳山分类内置于组件，对齐 `CORE.twentyFourMountains/trigramDirection/YANG_MOUNTAINS`，避免依赖 legacy CORE 全局。
- **契约同步**：`smoke-react-shell.mjs` fengshui 断言改为「0 canvas + FengshuiCompass + 不再调用 renderLegacyCompass」。

### Phase 10 收官成果

- 第二阶段共落地 **10 个 SVG 组件**：`RadarChart`、`ZiweiPalaceGrid`、`FiveElementsChart`、`HexagramChart`、`MeihuaChart`、`NinePalaceGrid`、`EightMansionsChart`、`BaziPillarsChart`、`YunqiChart`、`FengshuiCompass`。
- **全部 13 个工作区 `canvas=0`**：home / bazi / ziwei / liuyao / meihua / fengshui / feixing / bazhai / yunqi / tizhi / mermaid / testing / reader。React Shell 完全脱离 Canvas，`CanvasPanel` 不再被任何工作区使用。
- 根治了前几轮反复出现的 Canvas 文字溢出/重叠 bug（五运六气病势、梅花互卦、紫微宫位等）——SVG 用 rect/text 锚定 + 字符换行从结构上消除这类脆弱性。

### 取舍

- legacy Canvas renderer（`bazi.js`/`ziwei.js`/`divination.js`/`fengshui.js`/`health.js`）全部保留，旧 `visual/index.html` 主入口与并行验证闭环维持。`CanvasPanel` 组件保留以备未来需要，但当前无工作区引用。

---

## 2026-07-08 五运六气 SVG（Phase 10 图表替换续）

### 变更

- **新增 `YunqiChart`**：React + SVG 组件，替换 YunqiWorkspace 的 `CanvasPanel` + `renderLegacyYunqi`。
- **布局**：标题栏「五运六气·年」、干支大字、岁运胶囊（五行配色）、司天/在泉（红/橙框 + 箭头）、客气六步时间线（6 段横排，每段顶部彩条 + 六气名 + 五行标 + 步名 + 节气范围 + 圆点）、病势倾向（按「，」断点换行，框高随行数自适应）、五行图例。配色对齐 legacy `QI_COLORS/QI_COLORS_LIGHT/QI_WUXING_COLORS`。
- **根治溢出**：病势倾向用 SVG `<text>` 按字符数换行，彻底消除前几轮 legacy Canvas 病势胶囊文字溢出/与标题重叠的隐患。
- **契约同步**：`smoke-react-shell.mjs` yunqi 断言从「1 canvas」改为「0 canvas + YunqiChart + 不再调用 renderLegacyYunqi」。

### 理由

- 五运六气图含病势倾向长文本，是前几轮 Canvas 文字溢出 bug 的源头；SVG 用 `<text>` + 字符换行从结构上根治。
- 中医类（体质、五运六气）至此全部 SVG 化。

### 取舍

- legacy `health.js` / `renderLegacyYunqi` 全部保留，旧 `visual/index.html` 主入口不受影响。

---

## 2026-07-08 八字四柱主盘 SVG（Phase 10 图表替换续）

### 变更

- **新增 `BaziPillarsChart`**：React + SVG 组件，替换 BaziWorkspace 四柱主盘的 `CanvasPanel` + `renderLegacyBazi`。
- **布局**：四柱(年/月/日/时)横排，每柱天干格 + 地支格，按五行配色（`wuxingColor` 描边 + `wuxingColorLight` 填充）；日柱金色高亮背景；天干/地支五行微标（如「木 / 火」）；藏干格。
- **自包含五行映射**：天干→五行、地支→五行映射表内置于组件，对齐 `CORE.stemWuxing/branchWuxing`，避免 SVG 组件直接依赖 legacy CORE 全局对象。
- **八字工作区完全 SVG 化**：四柱主盘 + 五行平衡均不再用 Canvas，`#bazi canvas=0`。
- **契约同步**：`smoke-react-shell.mjs` bazi 断言从「1 canvas（四柱主盘保留）」改为「0 canvas + BaziPillarsChart + FiveElementsChart + 不再调用 renderLegacyBazi/renderLegacyWuxing」。

### 理由

- 四柱主盘是天干地支格 + 五行配色的规则布局，SVG rect/text 天然适配，文字可选中、可访问。
- 至此八字工作区（四柱 + 五行）完成 SVG 化，命理核心三件（八字、紫微、六爻）全部脱离 Canvas。

### 取舍

- legacy `bazi.js` / `renderLegacyBazi` 全部保留，旧 `visual/index.html` 主入口不受影响。

---

## 2026-07-08 八宅大游年 SVG（Phase 10 图表替换续）

### 变更

- **新增 `EightMansionsChart`**：React + SVG 组件，替换 BazhaiWorkspace 的 `CanvasPanel` + `renderLegacyEightMansions`。
- **布局**：8 方向扇区环形命盘（每扇区 45°），每扇区显示方向名、游年星名（大字）、吉凶【】、含义；中心圆显示命卦符号 + 卦名 + 命组。扇区背景按吉凶低透明配色，对齐 legacy `MANSION_COLORS`；径向文字按方位旋转，左侧扇区翻转避免倒读。
- **新增 `getBazhaiGrid(year, gender)`**：在 `canvasRenderers.ts` 暴露八宅命盘完整数据（命卦+符号+命组+8扇区），复用同一份规则计算。
- **legacy 数据暴露**：`fengshui.js` 注册对象新增 `eightMansionsData` 字段，把原本局部的 `EIGHT_MANSIONS_DATA` 映射表挂到 module 上，供 React 侧 `getBazhaiGrid` 复用，确保 Canvas 与 SVG 数据同源无漂移。
- **类型**：`baseTypes.ts` 新增 `EightMansionSector` / `EightMansionsGrid`；`legacyPrivateTypes.ts` 扩展 `LegacyFengshuiModule`（加 `eightMansionsData`）与 `LegacyCORE`（加 `eightMansionStars`/`trigrams`/`trigramsSymbol`/`trigramDirection`）。
- **契约同步**：`smoke-react-shell.mjs` bazhai 断言从「1 canvas + renderLegacyEightMansions」改为「0 canvas + EightMansionsChart + getBazhaiGrid + 不再调用 renderLegacyEightMansions」。

### 理由

- 八宅环形扇区图涉及 path arc 与径向旋转文字，Canvas 手算坐标脆弱；SVG path + transform rotate 更精确、可访问。
- 把 `EIGHT_MANSIONS_DATA` 从 fengshui.js 局部常量暴露到 module 层，让 React SVG 与 legacy Canvas 共用同一份领域规则表，避免数据重复维护。

### 取舍

- legacy `fengshui.js` / `renderEightMansions` 全部保留，旧 `visual/index.html` 主入口不受影响。仅给 module 注册对象新增一个 `eightMansionsData` 只读字段，不改变任何现有 render 行为。

---

## 2026-07-08 流年九宫飞星 SVG（Phase 10 图表替换续）

### 变更

- **新增 `NinePalaceGrid`**：React + SVG 组件，替换 FeixingWorkspace 的 `CanvasPanel` + `renderLegacyFlyingStars`。
- **新增 `getFeixingGrid(year)`**：在 `canvasRenderers.ts` 暴露 3×3 洛书九宫完整网格数据（每格宫位名/星号/星名/五行/吉凶），供 SVG 组件渲染，复用同一份 `CORE.getFlyingStars` 计算，确保与旧 Canvas 数据同源无漂移。
- **布局**：3×3 九宫格（巽离坤 / 震中兑 / 艮坎乾），每格宫位名(上) + 飞星编号星名(下，如「一白」)，吉凶背景色对齐 legacy `STAR_LUCK_COLORS`，中心格橙色高亮外框 + 浅色叠加，底部标注五黄煞/二黑煞入宫方位警告。
- **类型**：`baseTypes.ts` 新增 `FlyingStarCell` / `FlyingStarGrid` 类型并从 `canvasRenderers` 导出。
- **契约同步**：`smoke-react-shell.mjs` feixing 断言从「1 canvas + renderLegacyFlyingStars」改为「0 canvas + NinePalaceGrid + getFeixingGrid + 不再调用 renderLegacyFlyingStars」。

### 理由

- 九宫格是规则网格，SVG rect/text 天然适配，且文字可选中、可访问，比 Canvas `drawCenterText` 坐标计算更稳健。
- 通过新增 `getFeixingGrid` 把「计算」与「渲染」彻底分离：Canvas 与 SVG 共用同一数据源，满足 ROADMAP「同输入对照、无数据漂移」要求。

### 取舍

- legacy `fengshui.js` / `renderFlyingStars` 全部保留，旧 `visual/index.html` 主入口不受影响。

---

## 2026-07-08 梅花易数卦画 SVG（Phase 10 图表替换续）

### 变更

- **新增 `MeihuaChart`**：React + SVG 组件，替换 MeihuaWorkspace 的 `CanvasPanel` + `renderLegacyMeihua`。
- **布局**：本卦卦画(左，上卦3爻+下卦3爻+动爻红圈「变」)、卦名/上下卦符号名/变卦/动爻(右)、互卦 inset(右上，框高按内容自适应)、体用生克(底部，体卦蓝框+箭头+用卦红框+关系标签+释义)。
- **根治溢出**：互卦 inset 框高按内容动态计算，彻底消除之前 legacy Canvas 互卦框文字溢出/重叠的隐患（前几轮修过但仍脆弱）。
- **契约同步**：`smoke-react-shell.mjs` meihua 断言从「1 canvas + renderLegacyMeihua」改为「0 canvas + MeihuaChart + 不再调用 renderLegacyMeihua」。

### 理由

- 梅花 Canvas 含互卦 inset 与体用生克两处易溢出区域，SVG 用 rect/text 固定锚定 + 框高按内容计算，从结构上消除文字测量脆弱性。
- 至此占卜类（六爻、梅花）卦画全部完成 SVG 化。

### 取舍

- legacy `divination.js` / `renderLegacyMeihua` 全部保留，旧 `visual/index.html` 主入口不受影响。

---

## 2026-07-08 六爻卦画 SVG（Phase 10 图表替换续）

### 变更

- **新增 `HexagramChart`**：React + SVG 组件，替换 LiuyaoWorkspace 本卦/变卦两处 `CanvasPanel` + `renderLegacyLiuyao`。
- **布局**：逐爻绘制六神(左，对齐 `CORE.sixGodsColor`)、爻线(阳=整段实线 / 阴=左右两段中间留 18% 隙)、动爻红圈「动」、世应标签(世红/应蓝圆角底)、地支+六亲(右)、底部卦名与用神。本卦金标题、变卦紫标题。
- **爻序修正**：遵循六爻传统——上爻在顶、初爻在底（lines 数组为初爻→上爻，渲染时反向排列）。legacy Canvas 把初爻画在顶部，与传统相反，SVG 版修正为传统正确画法。
- **契约同步**：`smoke-react-shell.mjs` liuyao 断言从「≥1 canvas + renderLegacyLiuyao」改为「0 canvas + HexagramChart + 不再调用 renderLegacyLiuyao」。

### 理由

- 延续 Phase 10 思路：Canvas 爻线/动爻圆圈/世应标签靠手算坐标，SVG 用 rect/text/锚定更稳健、可访问、可选中文字。
- 顺带修正 legacy 的爻序方向 bug（初爻应在下），SVG 版符合六爻传统读图习惯。

### 取舍

- 梅花易数 `renderMeihua` 仍是 Canvas，本轮不动；legacy `divination.js` / `renderLegacyLiuyao` 全部保留，旧 `visual/index.html` 主入口不受影响。

---

## 2026-07-08 八字五行平衡 SVG（Phase 10 图表替换续）

### 变更

- **新增 `FiveElementsChart`**：React + SVG 组件，替换 BaziWorkspace「五行平衡」的 `CanvasPanel` + `renderLegacyWuxing`。
- **布局**：复刻 legacy `bazi.renderWuxing` 的五行相生相克五边形——5 顶点按相生循环（木→火→土→金→水）正上方起始顺时针排列；相邻边为相生（虚线带箭头 + 「生」标签），隔点连线为相克（红色实线带箭头 + 「克」标签）；顶点圆圈用 `wuxingColorLight` 填充 + `wuxingColor` 描边 + `wuxingColorDark` 计数，圆外五行标签；中心「五行平衡」；底部相生/相克图例。
- **配色**：完全对齐 legacy `CORE.wuxingColor / wuxingColorLight / wuxingColorDark`，确保与旧 Canvas 视觉一致。
- **契约同步**：`smoke-react-shell.mjs` bazi 断言从「2 个 canvas」改为「1 个 canvas（四柱主盘）+ FiveElementsChart + 不再调用 renderLegacyWuxing」。

### 理由

- 延续紫微 SVG 迁移的思路：把 Canvas 文字/箭头测量脆弱的图表替换为 SVG。五行相生相克图的箭头、标签在 Canvas 里靠手算坐标，SVG 用 `marker` + 文本锚定更稳健且可访问。
- 四柱主盘（`renderLegacyBazi`）暂保留 Canvas：它的四柱格子布局简单、无文字溢出风险，遵循「逐步替换交互收益高的模块」原则，优先替换收益明确的五行图。

### 取舍

- 不在本轮替换四柱主盘 Canvas；legacy `bazi.js` / `renderLegacyWuxing` / `renderLegacyBazi` 全部保留，旧 `visual/index.html` 主入口不受影响。

---

## 2026-07-08 紫微斗数 SVG 命盘（Phase 10 图表替换）

### 变更

- **新增 `ZiweiPalaceGrid`**：React + SVG 组件，替换 ZiweiWorkspace 中的 `CanvasPanel` + `renderLegacyZiwei`。
- **布局**：复刻刚修复的 4x4 环形十二宫——外环 12 地支顺时针各居一格（含戌、亥），中心 2x2 四象限信息区（命卦 / 四化 / 生辰 / 主星概览）。
- **渲染**：星曜彩色圆点（确定性 HSL，与 legacy `starColor` 算法一致）+ 四化标签（禄红/权黄/科青/忌灰）+ 庙旺利得。数据直接来自 `ZiweiIztroAdapter`，无需 legacy ziwei renderer。
- **契约同步**：更新 `smoke-react-shell.mjs`（ziwei 断言改为 SVG：`ZiweiPalaceGrid`、`data-testid`、地支覆盖戌亥）；修复 `check-react-migration.mjs` 两项预先漂移的契约（MODULES 数量从写死 14 改为 `>=14`、`extractCommandYear` 匹配函数名而非参数名）。

### 理由

- 前几轮连续修复 Canvas 文字溢出（五运六气病势倾向、梅花互卦框、紫微宫位缺失），根因都是 Canvas 文字测量/换行的脆弱性。SVG 文字天然响应式、可选中、可访问，从根上消除这类问题。
- 紫微 4x4 布局刚理顺数据通路（iztro 中文宫名映射、戌亥独立格），正是替换为 SVG 的最佳时机。

### 取舍

- 不一次性替换所有 Canvas 模块（八字/六爻/梅花/风水/飞星/八宅/五运六气仍是 Canvas），遵循 Phase 10「逐步替换交互收益高的模块」原则。
- legacy `renderLegacyZiwei` 与 `ziwei.js` 保留，供旧 `visual/index.html` 主入口继续使用，不破坏并行验证闭环。

---

## 2026-07 v0.4 日用工具扩展

### 新增工具

| 工具 | 功能 | 状态 |
|------|------|------|
| **每日黄历** | 基于农历日期展示当日宜忌、吉时凶时、节气物候 | folk-experience |
| **姓名五行** | 分析姓名汉字的笔画五行与三才配置 | folk-experience |
| **梦境意象** | 基于传统解梦词库提供意象联想参考 | folk-experience |
| **每日节律** | 展示十二时辰与经络气血流注的对应关系 | folk-experience |

### 设计原则

- **民俗体验定位**：四个工具均标记为 `folk-experience`（民俗体验），明确区分于 `local-exact` 精确计算模块
- **边界声明**：每个工具都包含免责声明，强调"不做吉凶预测/不构成命名建议/不做预言判断/不做医疗诊断"
- **隐私保护**：所有工具均在本地计算，不保存个人资料

### 技术实现

- **模块注册**：`modules.ts` 新增 `日用工具` 分组和四个 `ModuleId`
- **工作区组件**：四个新的 Workspace 组件，遵循 React Shell 设计规范
- **路由集成**：`workspaceRegistry.tsx` 注册四个新工作区
- **测试覆盖**：`modules.test.ts` 更新测试用例，验证 18 个模块完整性

---

## 2026-07 v0.3 发布 — React Shell 全面落地

### 发布概要

- **版本号**: v0.3
- **核心变更**: React + Vite + TypeScript 新前端外壳全面替代旧静态 Dashboard，11 个工具模块全部迁移完成
- **引擎升级**: 八字精确历法、紫微真实排盘、六爻京房纳甲、梅花时间/数字起卦全部内置本地计算
- **入口策略**: 旧 `visual/index.html` 保持可用作为 fallback，新 `apps/visual/` 构建产物通过 `visual/react.html` 访问

### 已完成工作

| 模块 | 状态 | 引擎/模式 |
|------|------|-----------|
| 八字命盘 | ✅ | lunar-javascript v1.7.7 精确节气干支 |
| 紫微斗数 | ✅ | iztro v2.5.8 真实十二宫排盘 |
| 六爻占卜 | ✅ | 自研京房八宫纳甲引擎 |
| 梅花易数 | ✅ | 本地时间起卦 + 数字起卦 |
| 五运六气 | ✅ | 大寒定年精确边界 |
| 风水罗盘 | ✅ | 本地规则计算 |
| 流年飞星 | ✅ | 本地规则计算 |
| 八宅大游年 | ✅ | 本地规则计算 |
| 体质辨识 | ✅ | 本地规则计算 |
| 知识图谱 | ✅ | Mermaid + 古籍 Split Reader |
| 测试控制台 | ✅ | 166 项冒烟测试 + 58 项契约测试 |

### 新增能力

- **咨询向导**: 六类问题入口（健康/事业/婚恋/占卜/择居/综合），调用 Adapter 生成结构化摘要
- **本地历史**: HistoryStore 保存脱敏阅读记录，最多 30 条，不保存完整生辰
- **报告导出**: 集成 `toReading()` 结构化摘要，HTML 报告展示分析结论和来源说明
- **PWA 试点**: manifest + Service Worker，cache-first 离线策略
- **动态天盘背景**: Canvas 2D 粒子系统（星宿/符箓/太极八卦/五行流转）

### 测试基线

- `pnpm test`: 162 项通过
- `node apps/visual/scripts/smoke-react-shell.mjs`: 166 项通过
- `node visual/js/tests/check-react-migration.mjs`: 58 项通过
- `node visual/js/tests/test-liuyao-engine.js`: 17 项纳甲规则 oracle 通过

### 入口说明

- **稳定入口**: `visual/index.html`（旧版，纯静态，零构建依赖）
- **新版入口**: `visual/react.html` → `apps/visual/dist/verify.html`（React Shell，需构建）
- **开发模式**: `cd apps/visual && pnpm dev`

---

## 2026-07 六爻从演示升级为本地真实纳甲引擎

- **变更**：六爻占卜模块从 `demo` 演示数据升级为 `local-exact` 本地真实纳甲排盘。新增 `visual/js/engines/liuyao-engine.js`，自研京房八宫纳甲体系；`engine-adapters.js` 的 `register("liuyao")` 改调真实引擎并保留演示 fallback；`capabilities.js` liuyao `mode` 升为 `local-exact`。
- **领域规则实现**（依据 `reference-metaphysics.md` 纳甲表 + 《京房易传》）：
  - 64 卦表与八宫归属：按京房八宫演变规则（本宫→一世→…→五世→游魂→归魂）确定性生成并校对，覆盖全部 64 卦无重复。
  - 纳甲：每爻配天干+地支，阳卦(乾坎艮震)用阳支顺行、阴卦(巽离坤兑)用阴支逆行；八纯卦纳甲天干地支与权威表一致。
  - 六亲：以宫五行为"我"按生克定父母/兄弟/子孙/妻财/官鬼。
  - 六神：按日干从初爻安放（甲乙青龙起、丙丁朱雀起…壬癸玄武起）；日干取自 lunar-javascript 精确历法，未加载时回退近似。
  - 世应：按八宫内卦序固定序列（本宫6/一世1/…/五世5/游魂4/归魂3），应爻与世爻隔两位。
  - 用神：按问题事项自动选取（求财→妻财、升职/官非/病→官鬼、考试/房屋→父母、子女/医药→子孙、合伙→兄弟、男占婚恋→妻财/女占→官鬼）。
  - 变卦：动爻阴阳互变后重查卦名。
  - 起卦方式：铜钱法(默认，确定性 RNG)、时间起卦、手动爻值(6/7/8/9 字符串)。
- **降级策略**：`liuyao-engine.js` 未加载或 calculate 抛错时，回退 `generateDemoDivination` 演示结构并标注 `fallback-demo`，不阻塞 Dashboard。
- **toReading 契约**：为 liuyao Adapter 实现 `toReading()`，输出 title/summary/tags/5 sections（卦象/世应用神/纳甲六亲六神/动爻变卦/边界说明），供历史记录、咨询向导与报告导出使用。
- **React 工作区**：`LiuyaoWorkspace` 重写为接 `calculateWithLegacyAdapter('liuyao')`，新增起卦方式切换、问题输入、本卦+变卦双 canvas、纳甲六爻明细表；`modules.ts` 状态升为 `local-exact`。
- **测试**：新增 `visual/js/tests/test-liuyao-engine.js`（17 项领域规则 oracle：64卦覆盖、八宫演变、世应位置、八纯卦纳甲、六亲、六神、用神、起卦、变卦、确定性），注册到 `test-runner.html` 与 `testRegistry.ts`；`test-v02-quality.js` liuyao 断言从 `demo` 升为 `local-exact` 并增强纳甲字段校验；`smoke-react-shell.mjs` liuyao canvas 断言放宽为 `>=1` 并新增 Adapter 接入校验。
- **原则**：前端优先沉淀纳甲 JS 规则，不引入 `bopo/najia` Python 运行依赖（ROADMAP 明确"项目较小且活跃度一般，不宜直接成为核心运行依赖"）；规则来源在 `confidenceNote` 标注，不同流派口径差异显式提示。

---

## 2026-07 React 可视化动态天盘背景

- **变更**：新增 `DynamicTianPanBackground`，在 React Shell 底层加入低亮度天盘刻度、二十四山刻线、五行气机光团与仪器网格。背景使用纯 CSS 动画，不引入 Three.js 或额外运行时依赖。
- **设计原则**：服务“天人合一 / 五行流转 / 历法仪器”理念，保持 Academic Dark Mode 与数据可读性，不采用 AI 紫色渐变、赛博霓虹或高强度粒子效果。
- **可访问性**：背景标记为 `aria-hidden`，不参与交互；`prefers-reduced-motion: reduce` 下停止天盘旋转和气机漂移动画。
- **验证**：`smoke-react-shell.mjs` 已增加动态背景组件、样式、二十四山刻度、五行层与 reduced-motion 契约检查。

---

## 2026-07 React 迁移 Phase 5-11 补齐

- **变更**：补齐 React Shell 后续迁移闭环：Home Dashboard 已接入 legacy ToolManifest / CapabilityRegistry；CommandBar 支持工具搜索、Tab 切换、复制当前上下文、测试控制台入口，以及输入年份跳转流年飞星/五运六气。
- **命令调度**：新增 `apps/visual/src/lib/commandIntents.ts`，CommandBar 只派发复制和年份跳转意图，不再通过 `querySelector` 直接操作 DOM；`CopyContextButton` 增加 `commandScope`，由当前工作区响应全局复制命令。
- **React 外围组件**：新增 `InterpretationCard` 与 `LegendPanel`，先在流年飞星工作区承载中宫飞星摘要和九星五行图例；Phase 10 第一阶段保留稳定 Canvas，不为迁移而重写确定性渲染。
- **年份跳转**：`FeixingWorkspace` 与 `YunqiWorkspace` 读取 `ctw.pendingYear` 并监听 `ctw:set-year`，命令面板输入如“2026”即可跳转相关年份工具页。
- **测试**：新增 `visual/js/tests/check-react-migration.mjs`（49 项），并扩展 `apps/visual/scripts/smoke-react-shell.mjs` 到 135 项；React 测试控制台已注册迁移契约测试。
- **入口策略**：旧 `visual/index.html` 不替换，React 应用继续在 `apps/visual/` 并行验证，构建后通过 `dist/verify.html` 做人工+自动回归。

---

## 2026-07 搜索索引可信度升级

- 将旧版全局搜索 `visual/js/search.js` 的风水古籍索引与 `knowledge-base/fengshui` 实际 Markdown 文件清单建立契约校验，避免索引漂移。
- 映射表搜索结果补充来源路径、类别与完整性字段，和知识引用浏览器的口径保持一致。
- 新增 `visual/js/tests/check-search-index.mjs`，并纳入 React 测试控制台与结构冒烟测试。

## 2026-07 知识引用浏览器接入风水工作区

- **变更**：新增 `apps/visual/src/lib/knowledgeReference.ts` 与 `KnowledgeReferencePanel`，在风水罗盘、八宅大游年、流年飞星三个 React 工作区展示“知识引用”面板。
- **数据来源**：直接读取 6 个风水 JSON 映射表与 `knowledge-base/fengshui/_index.md`，点击“坎 / 生气 / 五黄 / 反弓煞”等术语即可返回映射表条目、字段来源、完整性标识和古籍索引线索。
- **测试**：新增 `visual/js/tests/check-knowledge-references.mjs`，覆盖查询模块、React 面板接入、二十四山/八宅/飞星/阳宅三要/形煞映射命中，并注册到 React 测试控制台。
- **原则**：先做确定性映射和索引线索，不引入复杂 RAG；所有引用均标注来源文件与字段，避免把通用 tooltip 误当作可追溯知识引用。

---

## 2026-07 风水映射校验纳入 React 测试控制台

- **变更**：将既有 `visual/js/tests/check-mapping-schema.mjs` 注册到 `apps/visual/src/legacy/testRegistry.ts`，React 测试控制台可直接看到“风水映射表 schema 校验”套件。
- **校验范围**：6 个风水 JSON 映射表，覆盖命卦、八宅、二十四山、流年飞星、阳宅三要和形煞化解字段结构。
- **同步修正**：Node 测试命令改为 `pnpm test`，并将文档契约检查计数同步为当前实际输出。
- **原则**：已有确定性校验脚本优先接入统一测试入口，不重复实现第二套校验逻辑。

## 2026-07 八字精确节气 + 五运六气大寒定年（6tail/lunar-javascript 接入）

### 外部引擎接入

- **变更**：八字和五运六气模块升级为精确节气计算模式，接入 `6tail/lunar-javascript` (v1.7.7) 引擎。
- **实现**：
  - `BaziLunarAdapter`：调用 `Solar.fromYmdHms()` 生成精确农历和八字四柱数据，自动提取年柱、月柱、日柱、时柱的干支信息。
  - `YunqiLunarBoundaryAdapter`：利用 lunar-javascript 的节气表获取精确大寒日期，实现"大寒定年"的运气年份边界判定。
- **降级策略**：若 lunar-javascript 未加载或用户关闭精确历法 (`useExactCalendar: false`)，自动回退到本地近似引擎，确保页面可用。
- **能力标识**：
  - 八字：`mode` 为 `local-exact`（加载 lunar-javascript 时）或 `local-approx`（关闭精确历法时）
  - 五运六气：`mode` 为 `local-exact`（大寒定年精确模式）或 `local-approx`（公历年近似模式）

### 技术细节

- **节气干支计算**：`calculateBaziWithLunarJavascript()` 使用 `Solar.fromYmdHms()` → `getLunar()` → `getEightChar()` 链式调用获取精确四柱。
- **大寒定年逻辑**：`getDaHanDate()` 读取当年大寒节气日期，出生日期在大寒前则属上一年运气。
- **数据转换**：`extractPillarText()` 和 `pillarFromText()` 将 lunar-javascript 的干支字符串转换为项目内部结构。
- **Vendor 文件**：`visual/vendor/lunar-javascript-1.7.7.js`（MIT 许可证）。

### 五运六气字段增强

- **当前步气** (`current_step`)：根据当前日期自动判定所处六气步位，包含步名、客气、主气、节气区间。
- **客主加临** (`kezhujialin`)：分析客气与主气的五行生克关系，输出"客生主"、"主生客"、"客克主"、"主克客"、"同气"等判定。

### 测试验证

- 151 项自动化测试全部通过（通过率 100%）。
- 新增测试覆盖：
  - 可选 lunar-javascript Adapter 能升级精确模式
  - 关闭精确历法后回退本地近似
  - 五运六气增强字段（current_step、kezhujialin）存在性验证

---

## 2026-07 紫微斗数真实排盘（SylarLong/iztro 接入）

### 外部引擎接入

- **变更**：紫微斗数从演示数据升级为本地真实排盘，接入 `SylarLong/iztro` (v2.5.8) 引擎。
- **实现**：新增 `ZiweiIztroAdapter`，调用 `iztro.astro.bySolar()` 生成真实十二宫命盘数据，并转换为现有渲染器所需的格式。
- **降级策略**：若 iztro 未加载或计算失败，自动回退到 `generateDemoZiwei()` 演示数据，确保页面可用。
- **能力标识**：`capabilities.js` 中 ziwei 的 `mode` 从 `demo` 升级为 `local-exact`，`modeLabel` 改为"本地真实排盘"。
- **说明**：紫微流派存在差异，采用 iztro 默认配置；在 `confidenceNote` 中明确标注引擎来源和版本。

### 技术细节

- **时间映射**：将 24 小时制转换为 iztro 的 `timeIndex`（0-12，0=早子时，1=丑时，...，12=晚子时）。
- **数据转换**：`transformIztroPalaces()` 将 iztro 的英文 palace 名称映射为中文（soulPalace→命宫等），提取主星、辅星、庙旺信息。
- **四化提取**：`transformIztroSihua()` 从 iztro 的 huaSihua 数据提取四化映射（禄、权、科、忌）。
- **Vendor 文件**：`visual/vendor/iztro-2.5.8.min.js`（478KB）和 `iztro-2.5.8.LICENSE`（MIT）。

### 测试增强

- 新增"紫微斗数 iztro 真实排盘"测试，验证：
  - 引擎名称和模式正确（ZiweiIztroAdapter 或 DemoZiweiAdapter）
  - palaces 包含命宫、夫妻、财帛等十二宫数据
  - 每个宫位包含 stars、position、miaoxian 字段
  - sihua 四化数据存在
  - mainStars 主星列表非空

---

## 2026-07 咨询向导 + 报告 readings 集成 + PWA 试点（v0.3 续）

### 咨询向导模式

- **新增**：在旧 Dashboard 首页新增"打开咨询向导"按钮，弹出模态对话框。
- **流程**：用户选择问题类型（健康养生、事业决策、婚恋合婚、占卜决策、择居选址、综合咨询）→ 向导调用对应 Adapter 的 `calculate()` + `toReading()` 生成结构化摘要 → 展示标题、摘要、标签、分区详情、能力模式 → 可一键跳转对应工具页。
- **路由**：`WIZARD_ROUTES` 配置每个问题类型对应的 Adapter 列表和目标标签页；综合咨询同时调用八字、五运六气、梅花三个 Adapter。
- **历史集成**：向导生成的 reading 自动保存到 `HistoryStore`，首页历史面板同步刷新。
- **隐私**：向导展示的生辰信息只显示年份和性别，不显示完整出生日期。

### 报告导出集成 toReading()

- **变更**：`exportReportData()` 新增 `readings` 字段，遍历 bazi/yunqi/meihua 三个 Adapter 调用 `toReading()` 生成结构化摘要。
- **展示**：`buildReportHtml()` 在完整 REPORT_DATA 之后新增"结构化阅读摘要"区块，展示每个 reading 的标题、摘要、标签、分区详情和来源说明。
- **隐私**：readings 只包含分析结论和文化参考说明，不包含完整生辰或姓名。

### PWA 试点

- **新增**：`visual/manifest.webmanifest`，声明应用名称、主题色、图标（内嵌 SVG data URI，无外部文件依赖）。
- **新增**：`visual/sw.js`，轻量 Service Worker，缓存核心 JS/CSS/HTML 静态资源，采用 cache-first 策略。
- **注册**：在 `index.html` 底部注册 SW，仅在 `http/https` 协议下加载，`file://` 双击打开不加载 SW，确保离线 HTML 优先可用。
- **诊断**：开发者诊断页可展示 SW 注册状态（后续增强）。

### 测试增强

- 新增"报告导出包含 readings 结构化摘要"测试。
- 新增"咨询向导路由配置完整"测试。
- 新增"PWA manifest 可访问"测试。

## 2026-07 toReading 契约 + HistoryStore + 梅花数字起卦（v0.3 续）

### toReading() 结构化阅读摘要

- **变更**：扩展 `EngineAdapterRegistry`，新增可选 `toReading(result, input)` 方法和 `toReading()` / `listWithReading()` 公开接口。
- **已实现**：八字、五运六气、梅花三个本地引擎 Adapter 均已实现 `toReading()`，返回 `{ title, summary, tags, sections, sourceNotes }` 结构化摘要。
- **定位**：`toReading()` 为报告导出、历史记录和咨询向导结果页提供统一的阅读摘要来源；`score` 类字段不纳入，避免宣称精确吉凶分数。

### 本地历史与收藏 HistoryStore

- **新增**：`visual/js/history-store.js`，使用原生 `localStorage` 保存脱敏阅读摘要。
- **隐私保护**：自动清除 `YYYY-MM-DD` 格式的完整日期；只保存 module、title、summary、tags、mode、createdAt 字段；不保存完整姓名、完整出生日期、具体地点。
- **容量**：历史最多 30 条，同 module+title 自动覆盖；收藏独立管理，提供清空入口。
- **集成**：旧 Dashboard 首页新增历史记录面板，显示最近 10 条摘要；`data-bridge.js` 在用户更新数据时自动调用 `saveReadingToHistory()` 生成并保存 reading。
- **React Shell**：新增 `features/history/HistoryPanel.tsx` 工作区，支持历史/收藏标签切换、单条删除、收藏切换、批量清空。

### 梅花数字起卦模式

- **变更**：梅花 Adapter 新增 `method: "number"` 模式，使用 `numberA` / `numberB` 取数定上下卦与动爻。
- **规则**：上卦 = numberA % 8，下卦 = (numberA + numberB) % 8，动爻 = (numberA + numberB) % 6。
- **兼容**：默认仍为 `method: "time"`（时间起卦），数字起卦为可选模式。

### 测试增强

- **浏览器测试**：新增 `toReading()` 契约测试、梅花数字起卦验证（含上卦/下卦/动爻计算正确性）、HistoryStore 增删改查与脱敏测试。
- **文档契约**：`check-doc-contracts.mjs` 新增 `history-store.js` 文件存在性检查。

## 2026-07 React Shell 迁移完成版（v0.3 并行验证）

### React + Tailwind + Shadcn 迁移基座

- **变更**：新增 `apps/visual/`，采用 Vite + React + TypeScript + Tailwind 作为新前端外壳，服务于 `TASTE_SKILL_UI.md` 中定义的新中式数据主义 / Academic Dark Mode 视觉方向。
- **App Shell**：已搭建 `SidebarNav`、`CommandBar`、`WorkspaceTabs`，并以 `workspaceRegistry.tsx` 统一管理工作区路由，避免在 `AppShell` 中继续堆叠条件分支。
- **Legacy 兼容层**：新增 `loadLegacyScripts.ts`、`canvasRenderers.ts`、`toolRegistry.ts`、`engineAdapters.ts`，通过 `?raw` 导入旧脚本、vendor、`engine-adapters.js` 与 `data-bridge.js`，并桥接 `LegacyCORE`、`LegacyVizModules`、`ToolManifest`、`CapabilityRegistry`、`EngineAdapterRegistry`，优先复用稳定的 Canvas renderer。

### 已迁移工作区

- **已接入 React Shell**：八字命盘、五行平衡、五运六气、体质辨识、风水罗盘、流年飞星、八宅大游年、梅花易数、六爻占卜、紫微斗数、知识图谱、古籍 Split Reader、测试控制台、本地历史。
- **定位**：当前多数工作区属于“React 外壳 + 旧 renderer 兼容层”；八字和紫微已通过 React 侧 `engineAdapters.ts` 调用旧 `EngineAdapterRegistry`，其中八字走 `BaziLunarAdapter`，紫微走本地 `ZiweiIztroAdapter` / `SylarLong/iztro` v2.5.8。六爻仍然使用演示结构数据，不宣称真实起卦。
- **目录策略**：工作区目录统一转向英文业务语义，如 `features/constitution/`、`features/yunqi/`、`features/fengshui/`、`features/ziwei/`、`features/meihua/`、`features/liuyao/`。保留 `tizhi` 作为模块 id，但不再新增 `features/tizhi/` 新实现。

### 验证与回归

- **Node 冒烟测试**：新增 `apps/visual/scripts/smoke-react-shell.mjs`，验证 `#bazi` / `#yunqi` / `#tizhi` / `#fengshui` / `#feixing` / `#bazhai` / `#meihua` / `#liuyao` / `#ziwei` 的 Canvas 工作区数量与 registry 契约。
- **人工回归页**：构建后生成 `apps/visual/dist/verify.html`，列出当前已迁移 hash 路由，便于人工逐页检查 Canvas 非空、控件可编辑、复制按钮可用；新增 `visual/react.html` 作为并行验证入口，旧 `visual/index.html` 不替换。
- **当前结果**：`pnpm build`、`pnpm typecheck`、`pnpm test`、`node visual/js/tests/check-react-migration.mjs` 均通过；`verify.html` 中紫微标注为 `local-exact`。当前已知非阻断项是打包后主 chunk 较大，后续可用 lazy legacy loader / dynamic import 做拆包。

## 2026-07 v0.2 稳定化与能力边界

### Dashboard 可信度与离线能力

- **变更**：新增 `visual/js/capabilities.js`，统一维护 11 个标签页的能力状态、可信度说明、输入校验、报告导出、诊断入口。
- **引擎适配层**：新增 `visual/js/engine-adapters.js`，把八字、五运六气、紫微、六爻、梅花统一为 `calculate()` / `toRenderData()` 契约；已内置 `visual/vendor/lunar-javascript-1.7.7.js` 和 `visual/vendor/iztro-2.5.8.min.js`，八字默认使用精确节气干支，五运六气默认使用大寒边界修正，紫微默认使用 iztro 十二宫排盘；用户可关闭精确历法测算回退本地近似；六爻仍为演示 Adapter；梅花已升级为本地时间/数字起卦 Adapter。
- **能力边界**：八字/五运六气/紫微标注为本地精确计算并保留 fallback；六爻标注为演示数据且真实起卦需继续补纳甲规则；梅花标注为本地规则计算；飞星/八宅/风水罗盘标注为本地规则计算。
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
