# EVOLUTION.md — 系统演进记录

> 本文件记录 chinese-traditional-wisdom-ai-agent-workflow 各阶段的架构决策、取舍理由和关键变更。
> 日期倒序，最新在上。

---

## 2026-07-13 三式补全 + 周易核心扩展 + 风水增强 + 文档对齐

### 变更（按提交顺序）

1. **太乙神数**：新增 `taiyiEngine.ts`（约 1000 行，参考 `kentang2017/kintaiyi` MIT）+ `TaiyiChart.tsx` 九宫 SVG + MCP `taiyi_calculate` + `taiyi` 模块（`local-exact`）。太乙积年（5 计式 × 4 积年法）、局数、落宫、文昌/始击/定目、主客算/四将、格局（掩迫关囚击格对提挟）、八门、十六宫。修复数据错误：`TAIYI_PAI`/`SF_LIST` 单字符索引（非 `/../g` 正则）、四神等 36 字符循环取模。
2. **大六壬**：新增 `daliurenEngine.ts`（参考 `kentang2017/kinliuren` MIT 算法逻辑，纯 TS 重写）+ `DaliurenChart.tsx` 天地盘 SVG（4×3 方阵 12 宫 + 中心四课三传分区）+ MCP `liuren_calculate` + `liuren` 模块（`local-exact`）。天地盘/四课/三传（九宗门）/神煞/格局。
3. **二十八星宿**：新增 `xingxiuEngine.ts` + `XingXiuChart.tsx` + MCP `xingxiu_daily` + `xingxiu` 模块（`local-exact`）。每日值宿/吉凶宜忌/四象禽星/七曜五行。
4. **揲蓍法 + 64 卦古典文本**：六爻/梅花引擎新增 `method='yarrow'`（50 策三变算法）。从 `kintaiyi` `data.pkl` 提取 64 卦文本 → `ichingTexts.json`（64 卦 × 8 条：卦辞 + 6 爻辞 + 彖传）+ `ichingTexts.ts` 查询。六爻/梅花 `export_snapshot` 新增卦辞/动爻爻辞/彖传段。
5. **联合分析固化**：新增 `comboEngine.ts` + `combo` 工作区 + 5 个 MCP 工具（`combo_annual_fortune`/`combo_decision`/`combo_space_time`/`combo_sanshi`/`combo_sanshi_classic`）。`combo` 模块（`local-exact`，多系统聚合 + 一致性检验）。落地 ROADMAP「功能层增强 Step 1」。
6. **四层报告**：新增 `FourLayerReport` 组件（tldr/highlights/details/actions 四层显式分层），各引擎 `export_snapshot` 产出段表。落地 ROADMAP「功能层增强 Step 2」。
7. **风水增强（3 项）**：`taisuiEngine.ts`（太岁/岁破/三煞/五黄，12 地支化解文案）+ `menZhuZaoEngine.ts`（门主灶三要五行生克 + 通关化解）+ `flyingStarRemedies.ts` 每星增加具体颜色 + 摆设物品。八宅工作区接入太岁/门主灶区域；飞星工作区显示颜色+物品。
8. **奇门状态修正**：`modules.ts` 奇门从 `local-approx` 升为 `local-exact`（对齐 EVOLUTION 2026-07-08 已落地的 3meta 真实排盘）。
9. **MCP 工具池扩充至 21**：13 排盘 + 6 联合分析 + 2 元工具。`tools.ts`/`index.ts` 注释从「10 个」更新为「19 个」。
10. **文档对齐**：SKILL/README/README_AI/tool-index/EVOLUTION/ROADMAP 全面修订——MCP 工具数 12→20、能力边界表（紫微/六爻/奇门演示→local-exact、补奇门/六壬/星宿/太乙/联合/姓名/解梦/节律/黄历行）、「11 标签页」→多工作区、六引擎→18 引擎、SKILL §0 安装主路径从 Python 改为纯 TS+MCP、README 技术栈/仓库结构/英文版 Canvas→SVG、ROADMAP 流年/八宅/horosa 计划打勾、补三式补全节、致谢统一。

### 引擎/工具池最终状态

- **纯 TS 引擎**：19 个 enveloped（13 排盘 + 6 联合）+ `taisuiEngine`/`menZhuZaoEngine`/`ichingTexts`/`jieqiWellness`/`meridianClock` 辅助。
- **MCP 工具**：21 个（19 计算 + `agent_guidance` + `wisdom_dispatch`）。
- **React Dashboard 模块**：23 个 `ModuleId`（术数排盘/堪舆风水/医道运气/日用工具/知识检索/开发者六组）。

### 2026-07-13 续：今日养生建议（命理+体质+时空养生闭环）

补齐用户反馈的三个养生缺口：
- 新增 `jieqiWellness.ts`：24 节气通用调养（饮食/起居/运动/穴位/总则）+ 9 体质×节气针对性加减，节气查表（近似表 + lunar-javascript `getJieQiTable` 精确回退）。
- 新增 `meridianClock.ts`：子午流注 12 时辰×12 经络共享数据（从 RhythmWorkspace 提取，供 combo 与 SVG 复用）。
- 新增 `comboEngine.calcDailyWellnessCombo` + MCP `combo_daily_wellness`：聚合 体质（问卷或五运六气倾向）+ 当前节气调养 + 当令时辰经络 + 太岁/五黄方位 + 个人吉方 → 四层报告。落地「命理+体质+时空养生」闭环。
- 新增 `MeridianClock.tsx` 圆形经络钟 SVG（12 扇区，当前时辰金色高亮，指针线，点击切换），`RhythmWorkspace` 重构：钟面 + 节气调养条带 + 选中详情。
- `ComboWorkspace` 新增「今日养生建议」入口（默认选项）+ 体质选择器。
- MCP `dispatch.ts` 加 `combo_daily_wellness` 路由（今日养生/节气养生等关键词）+ `extractConstitution` 体质提取。

### 验证

- visual 单元 + e2e + mcp-server 测试全过（visual 229 + mcp-server 70 ≈ 299 项）。
- 三式互参/三式合一端到端可用。

---

## 2026-07-10 架构层重构 + MCP Server 落地（三层架构 Layer 2）

### 背景

ROADMAP 原计划"待整个项目全部做完后再启动 MCP"，但担心后期 C 类旧 JS 引擎（深度耦合 `window`）剥离工程量过大，提前启动**计算层与 window 解耦**的架构重构。目标：系统做完时 MCP server 是薄壳，无需回头剥离 window 耦合。

### 变更（按提交顺序）

1. **ToolEnvelope 统一类型**（7fdea6a）：`apps/visual/src/legacy/baseTypes.ts` 定义 `ToolEnvelope<TData>` / `ExportSnapshot` / `InputNormalized` + `wrapEnvelope()`，借鉴 horosa-skill 字段设计思想（AGPL 仅思想不复制代码；export_snapshot 放 data 内部对齐 horosa 真实结构）。周公解梦样板 `envelopeSample.ts`。
2. **B 类引擎参数化**（a42f405）：`bazhaiHouse.ts` 内嵌 `EIGHT_MANSIONS_DATA` + `mansionsData` 入参；`almanacData.ts` `solar` 入参。B 类清零升 A 类。
3. **A 类批量 envelope**（7e838f4）：`envelopeAdapters.ts` 包 xiyong/nameRating/constitutionTendency 三个 envelope。
4. **C 类迁移 6/6**（9259437→c8c2108）：meihua/yunqi/liuyao/bazi/ziwei/qimen 六个旧 JS Adapter 全部移植成纯 TS，`window.Solar` 参数化（传入精确 local-exact，未传近似 local-approx），iztro/3meta 用 ESM `import`。**关键 bug 修复**：`callFirst`/`call` 里 `obj[name]()` 裸调导致 lunar-javascript 方法 `this` 丢失 → 改 `.call(obj)`。
5. **MCP Server 薄壳**（d37e266）：新建 `apps/mcp-server/`，`@modelcontextprotocol/sdk` + StdioServerTransport，注册计算工具（import 纯 TS enveloped 引擎，无计算逻辑）+ `agent_guidance`（参数引导防瞎猜）+ `wisdom_dispatch`（自然语言意图路由）两个元工具。借鉴 horosa agent_guidance + horosa_dispatch 设计（软引导而非硬闸门）。初始 10 个计算工具，后续随引擎扩充至 18 个（见下方「MCP 工具池」）。
6. **客户端配置 + 自动配置脚本**（f8f83e2→d695e30→9c0d11a）：`examples/` 三客户端配置 + README 挂载指南；`scripts/setup-mcp.mjs` 一键自动检测并配置 Claude Code/Desktop/Cursor/Cline（AI 自主激活，解决 MCP 便携性痛点）。
7. **4 个 Workspace 切纯 TS 引擎**（7a2e8c4）：BaziWorkspace/ZiweiWorkspace/LiuyaoWorkspace/QimenWorkspace 优先用纯 TS 引擎，旧 adapter 留 fallback，零回归。

### 引擎分类最终状态

| 类 | 之前 | 现在 |
|----|------|------|
| A 纯 TS 计算 | 5 个 | 10 个 envelope + bazhaiHouse + almanacData（2026-07-13 前再增 daliuren/xingxiu/taiyi/combo/taisui/menZhuZao/ichingTexts 等，envelope 总数达 18） |
| B TS 读 window | 2 个 | 0（已清零） |
| C 旧 JS+window | 6 个 Adapter | 6 个已迁纯 TS（旧 JS 留 fallback） |

### MCP 工具池（20 个 = 18 计算 + 2 元工具）

`bazi_calculate` / `ziwei_chart` / `cast_liuyao` / `arrange_qimen` / `liuren_calculate` / `xingxiu_daily` / `taiyi_calculate` / `cast_meihua` / `calc_yunqi` / `analyze_name` / `calc_xiyong` / `get_constitution_tendency` / `dream_interpret` + 5 联合分析（`combo_annual_fortune` / `combo_decision` / `combo_space_time` / `combo_sanshi` / `combo_sanshi_classic`）+ `agent_guidance` + `wisdom_dispatch`。统一返回 `ToolEnvelope`，`data.export_snapshot` 是稳定段表供 LLM 消费。

> 工具池随引擎扩充而增长：2026-07-10 初始 10 计算 + 2 元 = 12；2026-07-13 前陆续新增大六壬/二十八星宿/太乙/5 联合分析，达 18 计算 + 2 元 = 20；同日再增今日养生建议，达 19 计算 + 2 元 = 21。

### 关键取舍

- **不搞重型后端**（horosa 那种 Java runtime + SQLite）：本项目引擎全是 JS，纯前端 + 可选薄 MCP 壳即够，学 horosa 搞后端会摧毁"双击即用"核心卖点。见记忆 `no-heavy-backend`。
- **软引导 vs 硬闸门**：horosa agent_guidance 是硬拒绝计算；本项目用软引导（缺参时在 envelope 旁附 prompt_to_user），更友好，不破坏直接调用。
- **旧 JS 全保留作 fallback**：各 Workspace 优先用纯 TS 引擎，失败回退旧 `calculateWithLegacyAdapter`，保证零回归。

### 验证

- visual 150 单元 + e2e 全过；mcp-server 53 项（tools 17 + server 7 + guidance 17 + setup-mcp 12）全过。合计 203 项。（2026-07-13 后随引擎扩充，visual 单元增至 229 + mcp-server 70 ≈ 299 项。）
- MCP 端到端：`claude mcp list` 显示 `chinese-wisdom ✔ Connected`；`wisdom_dispatch` 路由「紫微排盘 1988年10月5日8时女」→ `ziwei_chart` + 自动填充参数。
- 构建：bundle 4955→5809KB（iztro+3meta ESM 进主 bundle，gzip 2108KB，可接受）。

---

## 2026-07-08 奇门遁甲升级：3meta 真实排盘

### 变更

- 接入 `3metaJun/3meta` v2.6.0（MIT）作为奇门遁甲主引擎，vendor 化 `visual/vendor/3meta-2.6.0.min.js`（357KB UMD），通过 `loadLegacyScripts` 注入。
- `qimen-engine.js` 重写：主引擎用 3meta `QimenChart.byDatetime()` 真实排盘，输出完整九宫数据（三奇六仪天地盘、九星、八门、八神、值符值使、空亡、马星、旺相休囚、十二长生、六仪击刑、十干生克、吉凶格局自动检测）；3meta 未加载时回退简化版。
- `QimenAdapter` 从 `local-approx` 升级为 `local-exact`。
- `QimenWorkspace.tsx` 全面升级：排盘概要（阴阳遁/局数/元/季节/四柱干支/值符值使）+ 吉凶格局卡片 + 九宫排盘卡片（每宫门/星/神/天地盘天干/五行/旺相/内外盘/空亡马星标记/值符值使标记/十干生克/本宫吉凶格局）。

### 与简化版对比

| 能力 | 简化版 | 3meta 真实排盘 |
|------|--------|---------------|
| 阴阳遁 | 按月份近似 | 精确节气定遁 |
| 三奇六仪 | 无 | ✅ 完整天地盘 |
| 值符值使 | 取首个 | ✅ 正规推算 |
| 吉凶格局 | 无 | ✅ 自动检测 |
| 旺相休囚 | 无 | ✅ |
| 空亡马星 | 无 | ✅ |
| 十二长生 | 无 | ✅ |
| 六仪击刑 | 无 | ✅ |
| 十干生克 | 无 | ✅ |

### 验证

- `tsc -b` 通过；单元 71/71、冒烟 249/249；构建成功（3meta 357KB 打包）。
- Node 实测：2026-07-08 17:30 → 阴遁8局，值符天冲落2宫，值使伤门落2宫，9 宫完整数据 + 格局检测。

---

## 2026-07-08 奇门遁甲模块落地（suanle-me P3 补齐）

### 变更

- 新增 `visual/js/engines/qimen-engine.js`：自研简化时家奇门遁甲排盘——按年月日时取数定局、阴阳遁按月份近似、九宫（洛书）排布八门/九星/八神、值符值使、吉凶方位。
- `engine-adapters.js` 注册 `QimenAdapter`（local-approx，标注非专业奇门排盘）。
- `loadLegacyScripts.ts` 加载 qimen-engine.js。
- `modules.ts` 新增 `qimen` 模块（术数排盘组），ModuleId 类型扩展。
- `workspaceRegistry.tsx` 注册 QimenWorkspace。
- 新增 `QimenWorkspace.tsx`：读全局生辰→调 adapter→展示排盘概要 + 九宫排盘卡片（每宫门/星/神+吉凶色）。

### 取舍

- 自研简化规则（非 suanle-me seed 随机，也非专业超神接气置闰），标注 local-approx + confidenceNote 明确边界。

### 验证

- `tsc -b` 通过；单元 71/71、冒烟 249/249、e2e smoke 10/10（nav-item 数更新为 19）。

---

## 2026-07-08 fate 暂缓项补齐：字义出处 + 生肖喜忌用字

> 项目定位从 Skill 演进为全套工作流，不再以体积为由跳过功能项。

### 字义出处（P3 补齐）

- 新增 `charMeanings.json`（19931 字字义，1.6MB），从 fate `character.json` meaning 字段全量提取（与 kangxiStrokes 取交集）。
- `nameStrokes.ts` 新增 `getCharMeaning()`；`NameChar` 新增 `meaning` 字段。
- 字元卡片显示字义出处（line-clamp-2 截断 + hover title 全文），如「张：形声。从弓，长声。本义把弦安在弓上」。

### 生肖喜忌用字（P2 补齐）

- 新增 `zodiacNameChars.json`（12 生肖 Xi/Ji 用字表，39KB），从 fate `zodiac.go` 提取。
- `nameRating.ts` 生肖契合度改用真实喜忌表：名字字在忌用字表扣 40 分、喜用字表加 40 分，无命中回退五行相生近似。
- 鼠有喜用字表（1378 字），其余生肖主要用忌用字表（fate 数据本身如此）。

### 验证

- `tsc -b` 通过；单元 71/71、冒烟 249/249。
- 张/伟/涵/梓/睿/子/明/宝/彦 等常用字字义全部覆盖。

---

## 2026-07-08 fate P3 落地：五维评分体系（简化自建版）

### 变更

- **新增 `nameRating.ts`**：参考 `babyname/fate` 的 `internal/rating/rating.go` 五维框架与权重，用本项目已有数据简化计算：
  - 五格数理 30%：5 格吉凶计分（吉100/半吉60/凶20）
  - 三才配置 15%：三才吉凶（大吉100/吉80/半吉50/凶20）
  - 五行平衡 25%：五行分布均匀度（标准差归一化）
  - 字义五行 20%：字义五行多样性 + 未收录字扣分
  - 生肖契合 10%：出生年生肖五行与名字字义五行相生关系
- **等级表对齐 fate scoreToGrade**：≥90上上 / ≥80上吉 / ≥70中吉 / ≥60中平 / ≥50中下 / <50下下。
- **`NamewuxingWorkspace.tsx`**：输入区加「出生年」（可选，用于生肖契合度）；新增五维评分卡片（总分+等级+5 维分数+进度条+口径说明）。
- 标注「简化自建口径，非 fate 令分数体系」。

### 验证

- 张伟 + 1990 年：五格34（多凶）/三才100（木木木大吉）/五行60/字义90/生肖90 → 总分 67 中平，符合五格差但三才补救的预期。
- `tsc -b` 通过；单元 71/71。

### 字义出处暂缓

- fate `character.json` 的 meaning 字段：全量 19931 字 1.6MB 过大；regular 2511 字 298KB 但「梓/睿/子/明」等常用名用字缺失（fate regular 标记不全）。性价比低，记为后续按需查询或精简手工表增强项。

---

## 2026-07-08 fate P2 落地：喜用神算法

### 变更

- **新增 `xiyong.ts`**：参考 `babyname/fate` 的 `internal/bazi/xiyong.go` 实现简化版喜用神：
  - 同类 = 日主五行 + 生我五行（印）；异类 = 其余五行。
  - 日主强弱：同类总分 > 异类 → 身强，反之身弱，相等平衡。
  - 喜用神：身弱取同类最弱；身强取异类最弱；平衡取全局最弱。
- **口径简化**：fate 的 point() 用「令」分数权重（tiangan/dizhi 表），本项目改用八字 adapter 已有的五行计数（elements）作为分数，标注「基于五行计数近似口径」与 fate 令分数的区别，避免双口径混淆。
- **`BaziWorkspace.tsx`**：「推算边界」卡片新增日主强弱（含同类/异类分数）、喜用神（含补法说明）、同类/异类五行列表。

### 验证

- 1990-06-15 12时男（辛金日主，五行木3火9土3金4水5）：同类金+土=7，异类木+火+水=17，身弱，喜用神=土（印，补身）。符合命理「身弱喜印比」。
- `tsc -b` 通过；单元 71/71。

### 生肖喜忌用字暂缓

- fate `zodiac.go` 每生肖 Xi/Ji 各几千字，体积大且更适合起名推荐引擎；本项目姓名模块是测算现有姓名，契合度低。记为后续起名功能增强项。

---

## 2026-07-08 fate P1 落地：81 数理详注 + 三才配置详描

### 变更

- **81 数理详注表**：从 `babyname/fate` 的 `internal/wuge/dayan.go` 提取 81 条到 `apps/visual/src/legacy/dayanList.json`（13.2KB），含 Number/Lucky/SkyNine/Comment/FemaleUnsuitable/MaxLuck。
- **三才配置详描**：从 `internal/analysis/sancai_data.go` 提取 118 组到 `sancaiDetails.json`（12.4KB），天-人-地五行配置完整长句。
- **`nameWuxing.ts`**：`WuGeEntry` 新增 skyNine/comment/femaleUnsuitable/maxLuck 字段；五格构建改用 `dayanFind()` 取真实数理记录（替代旧硬编码吉凶 Set）；三才 desc 优先用 fate 完整详描，缺失回退简短 desc。
- **`NamewuxingWorkspace.tsx`**：五格数理卡片显示九星名 + 详注 + 「女性不宜」「最大好运」徽章；三才解读显示 fate 完整长句。

### 验证

- 张伟五格显示「掘井无泉/秋草逢霜/太极之数」等九星名 + 完整详注；三才「木木木」显示 fate 完整详描。
- `tsc -b` 通过；单元 71/71。

### 归档

- `tool-index.md` 外部来源归档表新增 81 数理表与三才详描两条 fate MIT 记录。

---

## 2026-07-08 Adapter 样例测试 + 外部来源归档（补齐 ROADMAP 缺口）

### Adapter 固定样例测试（验收标准补齐）

- 新增 `visual/js/tests/test-adapter-samples.js`：覆盖八字/紫微/梅花/五运六气各 3 组固定样例（普通日期、节气/年份边界、性别/时辰差异）+ 确定性校验，共 25 项。
- 注册到 `BROWSER_TEST_SPECS` 与 `testRegistry`，可在 TestRunnerConsole 页内运行。
- 实跑验证 25/25 全过。

### 外部参考来源归档（suanle-me 第 7 项补齐）

- `tool-index.md` 新增「外部参考来源归档」节：已接入运行依赖（lunar-javascript MIT、iztro MIT、fate MIT）、仅参考思路未复用文案（suanle-me/wuyun-liuqi-skills/najia/meihua-yishu）、不复用原因。
- 核实结论：本项目梦境意象表 `DREAM_SYMBOLS` 为自建五字段结构（symbol/category/meanings/emotion/context），与 suanle-me `dreamKeywords`（key/meaning 单句）结构完全不同；「水/火/山」意象 key 属周公解梦公知分类，未复制其文案。

---

## 2026-07-08 Phase 11 主入口切换回归 + privacy 真实 bug 修复

### Phase 11 Gate（主入口切换前回归）

- 新增 `e2e/phase11-gate.spec.ts`：11 工具 tab 全部可打开+工作区可见、CommandBar 切换、Copy context 按钮存在、375px 不溢出、暗黑模式 contrast、Mermaid fallback 无致命错误。
- 修复真实重复 testid：almanac/namewuxing/dream/rhythm 工作区内部 `workspace-xxx` testid 与 AppShell 外层 wrapper 重复，移除内层冗余，统一由外层提供。

### Privacy 真实 bug 修复

- `exportReportData`（capabilities.js）的 ziwei/yunqi 部分含明文出生日期（birthInfo.month/day/hour、chart.solarDate/lunarDate/rawDates、queryDate/dahan），违反 sourceNotes 声明。
- 新增 `anonymizeZiwei`/`anonymizeYunqi` 脱敏函数，仅保留 birthYear + 排盘结果（宫位/星曜/四化/岁运/司天在泉），移除明文生日字段。
- 重写 `privacy.spec.ts` 2 项占位假测试为真实校验：文件名/subject.label 无完整生日 + ziwei.birthInfo 无 month/day + 无 solarDate/lunarDate/queryDate；30 条历史限制通过 HistoryStore.add 验证。

### 验证

- e2e chromium 72/72 全过（从 56 提升）；单元 71/71、冒烟 249/249、契约 62/62。
- React Shell 主入口切换前所有门禁项达标。

---

## 2026-07-08 Phase 11 后续：测试套件扩展

### 单元测试扩展（+21 项，50 → 71）

- `copy-context.test.tsx`：`toMarkdown` 生成 + CopyContextButton 点击复制 + commandScope 匹配 COPY_CONTEXT_INTENT 事件。
- `command-bar.test.tsx`：`fuzzyMatch`（label/hint/keywords）+ CommandBar 渲染。
- `legacy-adapter.test.ts`：calculate/renderData/reading 桥接在无 registry/无 adapter/有 adapter 时的行为。
- 为可测性导出 `CopyContextButton.toMarkdown`、`CommandBar.fuzzyMatch` 与 `CommandItem` 接口。

### E2E 扩展

- 新增 `interactions.spec.ts`：CommandBar 命令面板（点击/Ctrl+K/搜索/Esc）+ SVG 双击放大 + 右键复制。
- 重写 `canvas-render.spec.ts` 适配 Phase 10 SVG 化：各 SVG `data-testid` 替代 canvas 选择器，新增 `waitForLegacy`，覆盖 9 工具渲染 + 跨工具无致命错误 + 响应式。
- chromium 项目 54/56 通过。

### 顺手修真实 bug

- 飞星 KnowledgeReferencePanel 的 terms 在中宫星为「一白」时与列表里「一白」重复，触发 React key 重复警告。用 `Array.from(new Set(...))` 去重。

### 已知预先失败（非本轮引入）

- `privacy.spec.ts` 2 项：旧 Dashboard 报告导出文件名含完整生日、历史 30 条限制。属旧 `visual/index.html` 隐私口径问题，记为后续待修。

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

- `pnpm test`: 162 项通过（2026-07-13 后增至 visual 229 + mcp-server 70 ≈ 299 项）
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
