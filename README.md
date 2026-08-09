<p align="center">
  <img src="chinese-traditional-wisdom-ai-agent-workflow.png" alt="Chinese Traditional Wisdom AI Agent Workflow" width="140" />
</p>

<h1 align="center">Chinese Traditional Wisdom AI Agent Workflow</h1>
<h3 align="center">中国传统文化整体智慧 AI Agent 工作流系统</h3>

<p align="center"><em style="font-family: 'KaiTi', 'STKaiti', 'SimSun', serif; font-size: 1.3em; color: #999;">究天人之际，通古今之变</em></p>

<p align="center">BaZi / Ziwei / Liuyao / Meihua / Qimen / Liuren / Taiyi / Fengshui / WuYun-LiuQi / Constitution / Daoism / Buddhism — 全融合 AI Agent 咨询工作流<br/>
本地排盘 · 不上传生辰 · 全功能免费 · 三层路由 · 25 引擎推算（16 排盘 + 9 联合分析）· 知识库引用 · React+SVG 可视化 Dashboard</p>

<p align="center">
  <a href="https://github.com/dhicoc/chinese-traditional-wisdom-ai-agent-workflow/stargazers"><img src="https://img.shields.io/github/stars/dhicoc/chinese-traditional-wisdom-ai-agent-workflow?style=flat&logo=github" alt="stars"></a>
  <a href="https://github.com/dhicoc/chinese-traditional-wisdom-ai-agent-workflow/forks"><img src="https://img.shields.io/github/forks/dhicoc/chinese-traditional-wisdom-ai-agent-workflow?style=flat&logo=github" alt="forks"></a>
  <a href="https://github.com/dhicoc/chinese-traditional-wisdom-ai-agent-workflow/issues"><img src="https://img.shields.io/github/issues/dhicoc/chinese-traditional-wisdom-ai-agent-workflow?style=flat&logo=github" alt="issues"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="license"></a>
</p>

<br/>

<p align="center">
  <a href="#关于项目">关于</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="README_AI.md">AI 引导</a> ·
  <a href="#使用说明">使用说明</a> ·
  <a href="#架构设计">架构设计</a> ·
  <a href="#贡献">贡献</a> ·
  <a href="#许可证">许可证</a>
</p>

<p align="center">
  🌐 <a href="#english-version">English</a>
</p>

<br/>

<a id="关于项目"></a>

## 关于项目

> **如果你是 AI Agent，直接跳转到 [README_AI.md](README_AI.md)，严格按照内容要求执行。**

当 AI Agent（Claude Code、Codex CLI、Cursor 等）遇到用户的人生困惑、健康调养、事业决策、婚姻合婚、择吉选址等问题时，本工作流系统提供从输入检查 → 三层路由 → 排盘推算 → 知识库检索 → 综合分析 → 可视化报告 → 经验沉淀的全链路能力。

```
用户问题 → 三层路由(问题→学科→融合深度) → 六引擎推算 → 知识库引用 → 可视化报告 → 经验沉淀
```

**为什么需要这个项目：**

> 市面上多数命理平台需付费解锁完整解读，且生辰等敏感信息要上传服务器、安全性未知。本项目正是为解决这个问题而设计：**所有排盘在浏览器本地完成，不上传完整生辰，核心能力全部免费开放**。

- **本地优先 · 不上传生辰**：所有引擎纯 TS 本地计算（lunar-javascript/iztro/3meta 内置），生辰只收集年/月/日/时拆分字段，不存完整日期、不传服务器，比要你上传的平台隐私风险更低
- **零付费 · 全功能开放**：无解锁、无会员、无付费墙，确定性计算与可视化全部免费；MCP server 也是本地 stdio，不依赖任何付费远端
- **多学科统一入口**：八字、紫微、六爻、梅花、风水、五运六气、体质等散落不同工具，此处统一聚合，AI Agent 可直接调用
- **古籍可检索**：内置 16+ 部风水经典全文，同一问题不必每次重新查证
- **零安装即刻体验**：纯前端可视化，打开即用

<p align="right">(<a href="#关于项目">返回顶部</a>)</p>

### 技术栈

<p align="left">
  <img src="https://skillicons.dev/icons?i=ts,react,vite,nodejs,js,html,css,git&theme=light" /><br/>
  <code>React + Vite + TypeScript</code> · <code>SVG 可视化</code> · <code>Tailwind CSS</code> · <code>lunar-javascript</code> · <code>iztro</code> · <code>3meta</code> · <code>MCP SDK</code>
</p>

<p align="right">(<a href="#关于项目">返回顶部</a>)</p>

<a id="快速开始"></a>

## 快速开始

### 方式 A：AI 对话（默认）

向 AI 提出你关心的任何问题即可。AI 会自动：
1. 基于三层路由匹配最佳工具组合
2. 排盘推算 → 调用知识库 → 综合分析 → 生成结构化咨询报告
3. 询问是否生成可视化 HTML 报告

### 方式 B：Web Dashboard

无需安装任何依赖，启动 React Dashboard：

```
cd apps/visual && pnpm dev      # React + SVG Dashboard（vite dev server）
# 或构建产物：
cd apps/visual && pnpm build && pnpm preview
```

工作区按功能分组：术数排盘（八字/紫微/六爻/梅花/奇门/大六壬/二十八星宿/太乙/联合分析）、堪舆风水（罗盘/流年飞星/八宅）、医道运气（五运六气/体质）、日用工具（黄历/姓名/解梦/节律）、知识检索（图谱/古籍）、开发者（历史/测试）。

### 方式 C：MCP Server（AI 客户端直接调用）

MCP server 提供 **43 个工具**：32 个确定性计算工具，以及 `agent_guidance` 参数引导、`validate_bazi_presentation` 八字呈现依据校验、`validate_ziwei_presentation` 紫微呈现依据校验、`validate_bazhai_presentation` 八宅呈现依据校验、`validate_feixing_presentation` 流年飞星呈现依据校验、`validate_calendar_presentation` 历法与年度盘面呈现依据校验、`validate_divination_presentation` 占测／卦象呈现依据校验、`validate_daily_presentation` 日用与民俗呈现依据校验、`validate_combo_presentation` 组合工具呈现依据校验、`validate_numeric_assertions` 数值断言依据校验与 `wisdom_dispatch` 意图路由。日用校验仅核验姓名分数/等级/维度、喜用神日主/同异类五行及分数/强弱/用神、五运六气体质倾向的岁运/司天/在泉与倾向类型、梦象命中状态及条目标题/分类/吉凶标签、测字笔画/数理/五行/结构/八字补益、称骨骨重/版本、节律日期/节气/经络、体质主体质/转化分；置信说明、倾向理由、边界说明、现代释义、古文断语、心理学解释、调养方案与医疗建议不进入 claims。组合择日校验仅核验用途、搜索范围、已排序候选条目与方位基础字段；评分理由、淘汰理由、黄历全文、首选结论、吉时、行动建议及任何吉凶保证不进入 claims。组合养生校验可核验本次节气、体质、时辰经络、方位提示及节气饮食/起居/运动/穴位、体质加减与时辰养护等传统规则／知识输出；`valid: true` 仅表示与本次传统规则输出一致，不代表现实效果、医疗安全性或个体结果保证，结果仅供传统文化与日常参考，切勿盲目相信。组合月度基础事实校验仅核验本次目标年月、流月干支、节气和 `local-exact`/`local-approx` 模式；运势结论、子系统摘要、综合文本和建议不进入 claims。数值校验仅核验显式结构化 `data.*` 数值 claims，不解析或验证自由文本。它可挂载到 Claude Code、Claude Desktop、Cursor、Cline 等 MCP 客户端，供 AI 调用本地计算能力。

**一键自动配置**（无需手动编辑配置文件）：

```bash
node scripts/setup-mcp.mjs
```

脚本自动检测已安装的客户端并写入对应配置（幂等不覆盖）。配置后重启客户端，`chinese-wisdom` server 即连接，对话中说「排个八字」「解梦」等 AI 自动调用工具。

如需手动配置或脚本未覆盖的客户端，参考 `apps/mcp-server/examples/` 与 `apps/mcp-server/README.md`：

```json
{
  "mcpServers": {
    "chinese-wisdom": {
      "command": "npx",
      "args": ["tsx", "/绝对路径/apps/mcp-server/src/index.ts"]
    }
  }
}
```

MCP server 是三层架构 Layer 2 的薄壳，复用 `apps/visual/src/legacy` 的纯 TS 引擎。常规计算返回 `ToolEnvelope`；对话 Agent 必须经 `wisdom_dispatch` 路由、`agent_guidance` 核对参数后再调用计算工具，不得凭模型知识自行推演。

八字默认先尝试真太阳时：用户提供可定位出生地后，Agent 核验地点、历史时区、夏令时与 `utcOffsetEvidence`，调用 `resolve_true_solar_time`，再将返回的 `trueSolarBirth` 与 `calibrationToken` 用于 `bazi_calculate`。呈现四柱、日主、五行计数、日主强弱、大运或神煞前，Agent 必须以本次结果的 `presentationToken` 调用 `validate_bazi_presentation`，仅呈现校验通过的 claims。紫微呈现宫位、星曜、四化、命主、身主或本次动态层等确定性事实前，也必须以本次 `ziwei_chart` 的 `presentationToken` 调用 `validate_ziwei_presentation`。八宅呈现命卦、八方游年星与吉凶，以及本次年份的太岁、岁破、三煞、五黄方位前，必须以本次 `calc_bazhai` 的 `presentationToken` 调用 `validate_bazhai_presentation`；传统释义、布局建议、门主灶与化解建议不进入 claims。飞星呈现本次年度、元运、中宫或指定九宫的飞星与吉凶前，必须以本次 `calc_feixing` 的 `presentationToken` 调用 `validate_feixing_presentation`；化解、布局、财位、个人命卦解释与综合推论不进入 claims。五运六气呈现年度、干支、岁运、司天、在泉或客气步骤前，必须以本次 `calc_yunqi` 的 `presentationToken` 调用 `validate_calendar_presentation`。星宿和黄历仅在显式传入 `queryDate` 或 `date` 后取得可校验凭证；仅可校验基础历法字段，宜忌、疾病/养生建议、歌诀与传统解释不进入 claims。六爻、梅花、奇门、大六壬、太乙与皇极呈现卦名、动爻、局式、宫位、干支、三传或周期等基础盘面事实前，必须以本次 `presentationToken` 调用 `validate_divination_presentation`；吉凶、应期、策略、传统解释与行动建议不进入 claims。无法可靠核验时，仅在用户明确确认后使用民用出生时间，并标注“未完成真太阳时复核”。Dashboard 只展示等待核验、已核验和民用降级状态，不要求用户填写经度或历史 UTC 偏移。

<p align="right">(<a href="#快速开始">返回顶部</a>)</p>

<a id="使用说明"></a>

## 使用说明

### 支持场景

| 场景 | 入口 |
|------|------|
| 八字命理 / 四柱排盘 | `bootstrap/bazi-engine.md` |
| 紫微斗数 / 十二宫 | `bootstrap/ziwei-engine.md` |
| 六爻占卜 / 纳甲断卦 | `bootstrap/liuyao-engine.md` |
| 梅花易数 / 体用生克 | `bootstrap/meihua-yishu-engine.md` |
| 五运六气 / 运气推算 | `bootstrap/yunqi-integration.md` |
| 中医体质 / 九种体质 | `bootstrap/constitution-questionnaire.md` |
| 风水堪舆 / 八宅飞星 | 知识库 + JSON 映射表 |
| 全局搜索 | 303 术语 + 6 映射 + 31 古籍 |
| 可视化报告 | `templates/visual-report.md` |
| 自动化测试 | `pnpm test` / `pnpm test:unit` / `pnpm test:e2e`（apps/visual） |


### 能力边界与 v0.2 接口

Dashboard 会在每个标签页显示能力状态，避免把演示数据误认为精确排盘：

| 类型 | 含义 | 当前覆盖 |
|------|------|----------|
| 本地精确历法（`local-exact`） | 内置 `lunar-javascript` 节气干支/大寒定年，或接入 iztro/3meta 真实排盘 | 八字、五运六气、紫微、六爻、奇门、大六壬、二十八星宿、太乙神数 |
| 本地规则（`local-approx`） | 内置确定性规则或映射表，离线运行；不同流派口径可能有差异 | 梅花易数、风水罗盘、流年飞星、八宅 |
| 多系统聚合（`local-exact`） | 跨系统联合分析，各术数看法对照 | 联合分析（年度运势/月度运势/事件决策/空间时间/三式互参/三式合一/今日养生/综合择日） |
| 民俗体验（`folk-experience`） | 纯本地规则，不做吉凶预测 | 黄历、姓名五行、周公解梦、每日节律 |
| 本地近似 fallback | 精确历法关闭或加载失败时的离线回退 | 八字、五运六气、紫微、六爻 |

能力状态由 `apps/visual/src/lib/modules.ts` 的 `MODULES` 注册表统一管理（`getModuleById` 查询）；报告导出由 `ExportReportButton` 生成脱敏 JSON 快照，含 `version`、`generatedAt`、`sourceNotes` 与 `birth.year`（不导出完整出生日期）。
### 关键文件

| 文件 | 用途 |
|------|------|
| [SKILL.md](SKILL.md) | 总控入口 + 三层路由契约（AI 必读） |
| [RULES.md](RULES.md) | 行为规则链（§9 Fail-Two / §10 输入完整性） |
| [tool-index.md](tool-index.md) | 18 引擎 + 六映射 + 可视化依赖表 |
| [EVOLUTION.md](EVOLUTION.md) | 三阶段演进记录与架构决策理由 |
| [ROADMAP.md](ROADMAP.md) | v0.2 优化与新功能演进路线图 |

### 仓库结构

```
.
├── README.md                   # 本文件
├── SKILL.md                    # 总控入口 + 三层路由契约
├── RULES.md                    # 行为规则
├── EVOLUTION.md                # 演进记录
├── tool-index.md               # 工具索引
├── LICENSE                     # MIT 许可证
│
├── bootstrap/                  # 引擎接入引导
├── templates/                  # 咨询报告模板
├── knowledge-base/fengshui/    # 古籍知识库（30 文件 / 16+ 部经典）
│   └── mappings/               # 6 个 JSON 确定性映射表
├── reference-*.md              # 玄学 / 佛教 / 道家 / 中医参考
│
├── apps/                       # 主架构（React Shell + MCP Server）
│   ├── visual/                 # React + Vite + TS Dashboard（SVG 可视化，主开发入口）
│   │   └── src/legacy/         # 纯 TS 引擎与 ToolEnvelope 适配器
│   └── mcp-server/             # MCP Server（三层架构 Layer 2，38 工具薄壳）
│       ├── src/index.ts        # McpServer + StdioServerTransport 入口
│       ├── src/tools.ts        # 32 个计算工具定义（zod schema）
│       ├── examples/           # Claude Desktop / Cursor / Cline 配置示例
│       └── README.md           # 安装与挂载指南
│
├── visual/                     # 可视化系统（纯前端，旧入口，留 fallback）
│   ├── index.html              # 旧 Dashboard（Canvas）
│   ├── test-runner.html        # 旧测试运行器
│   ├── js/engines/             # 纯 JS 排盘引擎（旧，留 fallback）
│   ├── vendor/                 # 内置第三方浏览器库（lunar-javascript/iztro/3meta）
│   └── js/tests/               # 自动化测试与 schema 校验
│
└── field-journal/              # 经验沉淀
```

<p align="right">(<a href="#使用说明">返回顶部</a>)</p>

<a id="架构设计"></a>

## 架构设计

### 三层路由矩阵

| 维度 | 分类 | 说明 |
|------|------|------|
| 问题类型 | 健康 / 事业 / 婚恋 / 占卜 / 综合 | 匹配最佳咨询场景 |
| 学科 | 八字 / 紫微 / 六爻 / 梅花 / 五运六气 / 体质 / 风水 | 调用对应推算引擎 |
| 融合深度 | 单一学科 / 跨学科交叉 / 儒释道整体智慧 | 决定知识引用范围 |

### 推理路径

```
用户输入 → 三层路由
  ↓
bootstrap/ → 加载对应引擎引导
  ↓
推算引擎执行（纯JS / npm / PyPI / API）
  ↓
JSON 映射表 / 古籍知识库 → 确定性查询 + 全文引用
  ↓
templates/ → 选择报告模板
  ↓
询问可视化模式 → A: 静态HTML报告 / B: Web Dashboard
  ↓
field-journal/ → 经验沉淀
```

### 数据层

- **6 确定性 JSON 映射表**：命卦速查、八宅大游年、二十四山（360° 连续）、流年飞星、阳宅三要、形煞化解
- **30 古籍文件**：16+ 部风水经典全文，覆盖形势/理气/阳宅/综合四大类
- **23 纯 TS 排盘引擎**：八字/紫微/六爻/奇门/大六壬/二十八星宿/太乙/皇极经世/梅花/五运六气/姓名/喜用神/体质/解梦 + 9 联合分析，零 DOM 依赖，统一 `ToolEnvelope` 输出，MCP 与 Dashboard 共享

<p align="right">(<a href="#架构设计">返回顶部</a>)</p>

<a id="贡献"></a>

## 贡献

欢迎任何贡献！Fork 本仓库 → 创建特性分支 → 提交 PR 即可。

1. Fork 项目
2. `git checkout -b feature/AmazingFeature`
3. `git commit -m 'Add some AmazingFeature'`
4. `git push origin feature/AmazingFeature`
5. 提交 Pull Request

<p align="right">(<a href="#贡献">返回顶部</a>)</p>

<a id="许可证"></a>

## 许可证

本项目采用 **MIT License**（详见 [LICENSE](LICENSE)）。

### 致谢

- 架构参考 [reverse-skill](https://github.com/zhaoxuya520/reverse-skill)（zhaoxuya520）
- 历法与排盘引擎（已接入运行依赖，均 MIT）：[lunar-javascript](https://github.com/6tail/lunar-javascript)（节气干支）、[iztro](https://github.com/SylarLong/iztro)（紫微斗数）、[3meta](https://github.com/3metaJun/3meta)（奇门遁甲）
- 姓名数据 [fate](https://github.com/babyname/fate)（MIT，康熙笔画/字义/数理/三才/生肖）
- 六爻纳甲：自研京房八宫纳甲引擎，规则参考 [ichingshifa](https://github.com/winetree94/ichingshifa)（MIT）与《京房易传》
- 大六壬 / 太乙 / 二十八星宿：纯 TS 自研，算法参考 [kinliuren](https://github.com/kentang2017/kinliuren)（MIT）、[kintaiyi](https://github.com/kentang2017/kintaiyi)（MIT）等开源实现
- 梅花易数：自研时间/数字/揲蓍法起卦（[meihua-yishu](https://github.com/muyen/meihua-yishu) 因 CC BY-NC-SA 未接入运行代码）
- 五运六气 [wuyun-liuqi-skills](https://github.com/dhicoc/wuyun-liuqi-skills)（MIT，字段契约参考）

<p align="right">(<a href="#许可证">返回顶部</a>)</p>

<a id="english-version"></a>

---

> **English Version — README.md is bilingual. Chinese content is above. Below is a summary.**

---

# Chinese Traditional Wisdom AI Agent Workflow

A holistic life consulting AI Agent workflow integrating BaZi, Ziwei, Liuyao, Meihua, Qimen, Liuren, Taiyi, Fengshui, WuYun-LiuQi, TCM Constitution, Daoist philosophy, and Buddhist psychology.

> **Why this project exists:** Most metaphysics platforms require paid unlocks for full readings and ask you to upload birth data to their servers with unclear security. This project solves that — **all charts are computed locally in the browser, no full birth datetime is uploaded, and every core capability is free**.

**Features:**
- React + Vite + TypeScript dashboard with SVG visualization, capability badges and offline Mermaid fallback
- Local TypeScript calculation engines with unified `ToolEnvelope` output, shared by MCP server and Dashboard
- MCP server (40 tools: 32 calculation + 8 meta tools) for Claude Code / Desktop / Cursor / Cline direct invocation
- BaZi true-solar-time flow: Agent verifies location and historical offset evidence, then calls `resolve_true_solar_time` before `bazi_calculate`
- 30-file classic text knowledge base (16+ Fengshui classics)
- 6 deterministic JSON mapping tables
- Automated tests (unit + e2e + contract)

**Quick Start:** `cd apps/visual && pnpm dev` for the React dashboard, `node scripts/setup-mcp.mjs` for MCP, or let the AI handle everything.

**Tech Stack:** React, Vite, TypeScript, SVG, Tailwind CSS, lunar-javascript, iztro, 3meta, MCP SDK

**License:** MIT

---

<p align="center">
  <a href="https://linux.do">AI Community: linux.do</a>
</p>
