# Chinese Traditional Wisdom AI Agent Workflow

> **这是 AI Agent 的配置引导文件。如果你是 AI Agent，严格按以下流程执行。**

## 0. 安装与核心执行流程

> **AI Agent 请严格按以下流程执行。人类用户可参考「安装说明」手动操作。**

---

### 0.1 安装说明（人类用户手动安装用）

> 2026-07-10 架构重构后，计算主路径为**纯 TypeScript 引擎 + MCP 薄壳**，默认工作流零 Python 依赖。

=== Chinese Traditional Wisdom AI Agent Workflow - Setup ===

[1/2] 计算引擎（纯 TS，零 Python 依赖）:
  - apps/visual/src/legacy/*Engine.ts  22 个纯 TS 引擎
    （八字/紫微/六爻/奇门/大六壬/星宿/太乙/梅花/五运六气/姓名/喜用神/体质/解梦 + 8 联合分析）
  - 精确历法: lunar-javascript (npm ESM import)
  - 紫微: iztro v2.5.8 (npm ESM)    奇门: 3meta v2.6.0 (npm ESM)
  - 可视化: apps/visual (React + Vite + SVG)，pnpm dev 启动
  安装: cd apps/visual && pnpm install   # 或 cd apps/mcp-server && npm install

[2/2] 可选 Python oracle（仅命令行交叉验证用，默认不需要）:
  pip install -r requirements.txt   # lunar-python / iztro-py / ichingshifa（可选）

Setup complete!

Quick start:
  # 让 AI 客户端直接调用排盘（推荐）:
  node scripts/setup-mcp.mjs         # 一键自动配置 Claude Code/Desktop/Cursor/Cline
  # 或本地可视化:
  cd apps/visual && pnpm dev         # React + SVG Dashboard（vite dev server）

---

### 0.2 AI Agent 自动安装与配置（AI 读完本文件后立即执行）

> **AI Agent 执行以下流程，用户无需手动操作。**

```text
0. 检测本包实际路径：由当前文件所在目录推导，记为 <SKILL_ROOT>
1. 验证包结构完整性：
   - 必须存在：SKILL.md, RULES.md, tool-index.md
   - 必须存在：bootstrap/ 目录及至少 3 个引擎引导文件
   - 必须存在：apps/visual（React Dashboard，vite 入口 apps/visual/index.html）
2. 读取 SKILL.md → 理解三层路由（问题类型 → 学科 → 融合深度）
3. 读取 RULES.md → 理解行为规则（§9 Fail-Two / §10 输入完整性）
4. 读取 tool-index.md → 确认各引擎安装状态（默认纯 TS 引擎已就绪）
5. 读取用户问题 → 匹配最佳路由路径
6. 如需可视化 → 询问用户选择模式 A（静态 HTML 报告）/ 模式 B（Web Dashboard）/ 模式 C（MCP 直接调用）
7. 若用户选模式 C 或表达"启用 MCP / 让 AI 直接排盘"→ 执行 node <SKILL_ROOT>/scripts/setup-mcp.mjs 自动配置客户端（详见 SKILL.md「MCP 自动激活」节）
8. 开始执行任务
```

> **MCP 自动激活**（2026-07-10 架构重构后新增）：当用户在支持 MCP 的客户端（Claude Code/Desktop/Cursor/Cline）中想直接调用排盘工具时，AI 跑 `node scripts/setup-mcp.mjs` 一键自动检测并配置客户端，用户无需手动编辑 JSON。配置后 `chinese-wisdom` server 提供 24 个工具（22 计算 + agent_guidance 参数引导 + wisdom_dispatch 意图路由），统一返回 ToolEnvelope。详见 `apps/mcp-server/README.md`。

## 1. 三层路由矩阵

| 维度 | 分类 | 路由逻辑 |
|------|------|---------|
| 问题类型 | 健康 / 事业 / 婚恋 / 占卜 / 择居 / 学业 / 综合 | 匹配最佳咨询场景模板 |
| 学科 | 八字 / 紫微 / 六爻 / 梅花 / 奇门 / 大六壬 / 太乙 / 二十八星宿 / 五运六气 / 体质 / 风水 / 姓名 | 调用对应推算引擎 |
| 融合深度 | 单一学科 / 跨学科交叉 / 儒释道整体智慧 | 决定知识引用范围 |

### 路由决策逻辑

```
if 用户明确学科 → 直接进入该学科引擎
elif 用户提到问题类型 → 匹配场景 → 推荐学科组合
elif 综合咨询 → 多系统联合分析（combo_* 工具）
else → 提示用户提供更多信息（参照 §10 输入完整性）
```

## 2. 引擎架构

| 引擎 | 类型 | 接入方式 | 用途 |
|------|------|---------|------|
| 八字 | 纯 TS | `apps/visual/src/legacy/baziEngine.ts` + lunar-javascript | 四柱/十神/大运/五行 |
| 紫微斗数 | 纯 TS | `ziweiEngine.ts` + iztro v2.5.8 (ESM) | 十二宫/主星/四化 |
| 六爻 | 纯 TS | `liuyaoEngine.ts` 自研京房八宫 + lunar-javascript | 纳甲/六亲/世应/六神/用神 |
| 奇门遁甲 | 纯 TS | `qimenEngine.ts` + 3meta v2.6.0 (ESM) | 八门/九星/八神/值符值使/格局 |
| 大六壬 | 纯 TS | `daliurenEngine.ts` + lunar-javascript | 天地盘/四课/三传/神煞/格局 |
| 二十八星宿 | 纯 TS | `xingxiuEngine.ts` + lunar-javascript | 值宿/吉凶宜忌/四象禽星 |
| 太乙神数 | 纯 TS | `taiyiEngine.ts` + lunar-javascript | 积年/局数/落宫/主客算/格局 |
| 梅花易数 | 纯 TS | `meihuaEngine.ts` 自研 | 体用/生克/互变错综 |
| 五运六气 | 纯 TS | `yunqiEngine.ts` + lunar-javascript 大寒定年 | 岁运/客气/司天在泉 |
| 姓名 | 纯 TS | `envelopeAdapters.ts` + fate 数据 | 五格/三才/五维评分/字义/生肖 |
| 喜用神 / 体质倾向 / 解梦 | 纯 TS | `envelopeAdapters.ts` / `envelopeSample.ts` | 查表 |
| 联合分析 | 纯 TS | `comboEngine.ts` 聚合各引擎 | 年度运势/事件决策/空间时间/三式互参/三式合一 |
| 体质 | 问卷 | bootstrap/constitution-questionnaire.md | 九种体质辨识 |

### 引擎调用优先级

1. **纯 TS enveloped 引擎**（`apps/visual/src/legacy/*Engine.ts`，2026-07-10 架构重构后主路径）：零 DOM 依赖，统一返回 `ToolEnvelope`，MCP server 与 React Dashboard 共享。22 个引擎：bazi/ziwei/liuyao/qimen/liuren/xingxiu/taiyi/huangji/meihua/yunqi/analyzeName/xiyong/constitutionTendency/dream + 8 combo。React Dashboard 经 `pnpm dev` 启动，零 Python 依赖。
2. **可选 Python oracle**（命令行交叉验证）：`ichingshifa`（六爻）/ `iztro-py`（紫微），默认不需要
3. **引擎缺失**：按 bootstrap/ 目录下引导文件接入，或走 MCP/纯 TS 路径

> MCP 调用时：所有计算工具走纯 TS 引擎，精确历法需传入 lunar-javascript `Solar`（MCP server 已内置）。`agent_guidance` 工具可查必填参数防瞎猜，`wisdom_dispatch` 工具可从自然语言路由到对应工具。


## 2.1 能力边界声明

AI Agent 输出结论时必须区分以下状态：

| 状态 | 说明 | 当前模块 |
|------|------|----------|
| 本地精确历法（`local-exact`） | 内置 lunar-javascript 节气干支/大寒定年，或接入 iztro/3meta 真实排盘 | 八字、五运六气、紫微、六爻、奇门、大六壬、二十八星宿、太乙 |
| 本地规则（`local-approx`） | 内置确定性规则/映射表，离线运行；流派口径可能有差异 | 梅花易数、风水罗盘、流年飞星、八宅 |
| 多系统聚合（`local-exact`） | 跨系统联合分析 + 各术数看法对照 | 联合分析（combo_*） |
| 民俗体验（`folk-experience`） | 纯本地规则，不做吉凶预测 | 黄历、姓名五行、周公解梦、每日节律 |
| 知识映射 / 派生 | 查表或评分派生 | 风水罗盘、体质辨识、本地历史 |

Dashboard 中能力状态由 `apps/visual/src/lib/modules.ts` 的 `MODULES` 注册表统一管理（`getModuleById` 查询）；报告导出由 `ExportReportButton` 生成脱敏 JSON 快照，含 `version`、`generatedAt`、`sourceNotes` 与 `birth.year`（不导出完整出生日期）。

## 3. 可视化报告生成

### 模式 A：静态 HTML 报告（对话内联）

```markdown
1. 打开 templates/visual-report.md
2. 将推算结果填充到 REPORT_DATA JSON 区块，并保留 `version`、`generatedAt`、`sourceNotes`
3. 取消不需要的模块注释（如 ziwei/liuyao 等）
4. 保存为独立 .html 文件
5. 在对话中呈现文字报告摘要 + 提供 HTML 文件链接
```

### 模式 B：交互式 Web Dashboard

```markdown
1. 引导用户启动 React Dashboard：cd apps/visual && pnpm dev
2. 用户可在多个工作区（术数排盘/堪舆风水/医道运气/日用工具/知识检索）间切换
3. 支持全局生辰联动、CommandBar 命令面板、报告导出、本地历史
```

### 模式 C：MCP 直接调用

```markdown
1. 执行 node scripts/setup-mcp.mjs 自动配置客户端
2. 重启 Claude Code/Desktop/Cursor/Cline
3. 对话中直接说「排个八字」「解梦」「今日养生」等，AI 自动调用 22 个计算工具之一
4. 工具返回 ToolEnvelope（含 export_snapshot 段表），AI 据此生成解读
```

## 4. 关键入口文件

| 文件 | 用途 |
|------|------|
| [SKILL.md](SKILL.md) | 总控入口 + 三层路由契约 |
| [RULES.md](RULES.md) | 行为规则链（必读） |
| [tool-index.md](tool-index.md) | 引擎安装状态与备用方案 |
| [EVOLUTION.md](EVOLUTION.md) | 演进记录与架构决策 |
| [ROADMAP.md](ROADMAP.md) | 演进路线图 |
| [bootstrap/](bootstrap/) | 引擎接入引导 |
| [templates/visual-report.md](templates/visual-report.md) | 静态 HTML 报告模板 |
| [apps/visual/](apps/visual/) | React + Vite + TS Dashboard（SVG 可视化，主开发入口） |
| [apps/visual/](apps/visual/) | React + SVG Dashboard（vite，`pnpm dev` 启动） |
| [apps/mcp-server/](apps/mcp-server/) | MCP Server（24 工具薄壳）+ `README.md` 挂载指南 |
| [scripts/setup-mcp.mjs](scripts/setup-mcp.mjs) | MCP 一键自动配置脚本（AI 自主激活） |

## 5. 全局搜索

索引三源数据（`apps/visual/src/legacy/searchEngine.ts`）：
- **termExplanations**：303 条专业术语解释（`legacy/termExplanations.json`）
- **MAPPING_INDEX**：6 个 JSON 确定性映射表（knowledge-base/fengshui/mappings/）
- **KB_INDEX**：31 个古籍文件（knowledge-base/fengshui/）

搜索入口：React Dashboard 的 CommandBar「全局搜索」命令打开搜索浮层，或在 AI 对话中直接询问。

## 6. 故障处理

### §9 Fail-Two 规则

同一操作失败两次 → 停止 → 记录到 field-journal → 查 tool-index.md 备用方案 → 切换或告知用户。

### §10 输入完整性

AI **必须先补问**以下信息，不得猜测：

| 字段 | 必填条件 | 默认值 |
|------|---------|--------|
| 出生日期 | 始终必填 | N/A |
| 出生时辰 | 始终必填 | 若未知 → 子时 (23:00-01:00) |
| 性别 | 始终必填 | N/A |
| 咨询问题 | 始终必填 | N/A |
| 体质信息 | 体质分析时必填 | N/A |
| 房屋朝向 | 风水分析时必填 | N/A |

### 引擎不可用时的降级方案

| 引擎缺失 | 降级方案 |
|---------|---------|
| MCP server 未配置 | 走纯 TS 引擎 + React Dashboard（`cd apps/visual && pnpm dev`） |
| lunar-javascript 加载失败 | 八字/五运六气/六爻回退本地近似节气表 |
| iztro (紫微) 加载失败 | 回退演示排盘结构，标注 `fallback-demo` |
| 3meta (奇门) 加载失败 | 回退简化奇门排盘 |
| 命令行 ichingshifa | 走本地六爻纳甲引擎 `liuyaoEngine.ts`，无需 Python |
| 大寒边界 | 内置大寒近似日期（1月20日） |

## 7. 输出规范

### 结构化报告格式

```markdown
## 命理分析报告

**出生信息**: [日期] [时辰] [性别]

### 1. 八字排盘
[四柱 + 十神 + 五行统计]

### 2. 核心分析
[用神喜忌 / 格局 / 大运走势]

### 3. 学科交叉（可选）
[八字×体质 / 八字×风水 / 八字×五运六气]

### 4. 综合建议
[针对用户问题的具体建议]

### 5. 可视化
[是否生成 HTML 报告]

*免责声明：以上内容由 AI 生成，仅供传统文化学习参考。*
```

### 语言要求

- 术语出现时必须附带简短解释（例："七杀（事业压力/竞争）"）
- 避免纯学术化的长篇引用，先给结论再给依据
- 对问健康者，末尾必须添加医疗免责声明
- 所有推算结果必须标注"仅供学习参考"

---

> **执行完成后，如发现流程缺陷或新的经验，记录到 field-journal/。**
