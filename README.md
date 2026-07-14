<p align="center">
  <img src="chinese-traditional-wisdom-ai-agent-workflow.png" alt="Chinese Traditional Wisdom AI Agent Workflow" width="140" />
</p>

<h1 align="center">Chinese Traditional Wisdom AI Agent Workflow</h1>
<h3 align="center">中国传统文化整体智慧 AI Agent 工作流系统</h3>

<p align="center"><em style="font-family: 'KaiTi', 'STKaiti', 'SimSun', serif; font-size: 1.3em; color: #999;">究天人之际，通古今之变</em></p>

<p align="center">BaZi / Ziwei / Liuyao / Meihua / Qimen / Liuren / Taiyi / Fengshui / WuYun-LiuQi / Constitution / Daoism / Buddhism — 全融合 AI Agent 咨询工作流<br/>
三层路由 · 21 引擎推算（13 排盘 + 8 联合分析）· 知识库引用 · React+SVG 可视化 Dashboard · 能力边界标识 · 自动化测试</p>

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
- 八字、紫微、六爻、梅花、风水、五运六气、体质七大学科散落不同工具，缺乏统一入口
- 传统命理软件界面陈旧，AI Agent 无法直接调用
- 古籍全文检索困难，同一问题每次重新查证
- 纯前端可视化方案能让用户零安装即刻体验

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

无需安装任何依赖，直接双击 `visual/index.html`（旧入口）或启动 React Dashboard：

```
cd apps/visual && pnpm dev      # React + SVG Dashboard（主开发入口）
# 或旧入口：
file://<SKILL_ROOT>/visual/index.html
```

工作区按功能分组：术数排盘（八字/紫微/六爻/梅花/奇门/大六壬/二十八星宿/太乙/联合分析）、堪舆风水（罗盘/流年飞星/八宅）、医道运气（五运六气/体质）、日用工具（黄历/姓名/解梦/节律）、知识检索（图谱/古籍）、开发者（历史/测试）。

### 方式 C：MCP Server（AI 客户端直接调用）

把 21 个计算引擎（八字/紫微/六爻/奇门/大六壬/二十八星宿/太乙/梅花/五运六气/姓名/喜用神/体质/周公解梦 + 8 个跨系统联合分析）挂载到 Claude Code、Claude Desktop、Cursor、Cline 等 MCP 客户端，AI 可直接调用排盘工具。

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

MCP server 是三层架构 Layer 2 的薄壳，复用 `apps/visual/src/legacy` 的纯 TS 引擎，统一返回 `ToolEnvelope` 结构化结果，共 23 个工具（21 计算 + `agent_guidance` 防参数瞎猜 + `wisdom_dispatch` 自然语言意图路由）。与 Dashboard 共享同一份计算逻辑，互不依赖。

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
| 全局搜索 | 284 术语 + 6 映射 + 30 古籍 |
| 可视化报告 | `templates/visual-report.md` |
| 自动化测试 | `visual/test-runner.html` |


### 能力边界与 v0.2 接口

Dashboard 会在每个标签页显示能力状态，避免把演示数据误认为精确排盘：

| 类型 | 含义 | 当前覆盖 |
|------|------|----------|
| 本地精确历法（`local-exact`） | 内置 `lunar-javascript` 节气干支/大寒定年，或接入 iztro/3meta 真实排盘 | 八字、五运六气、紫微、六爻、奇门、大六壬、二十八星宿、太乙神数 |
| 本地规则（`local-approx`） | 内置确定性规则或映射表，离线运行；不同流派口径可能有差异 | 梅花易数、风水罗盘、流年飞星、八宅 |
| 多系统聚合（`local-exact`） | 跨系统联合分析，各术数看法对照 | 联合分析（年度运势/月度运势/事件决策/空间时间/三式互参/三式合一/今日养生/综合择日） |
| 民俗体验（`folk-experience`） | 纯本地规则，不做吉凶预测 | 黄历、姓名五行、周公解梦、每日节律 |
| 本地近似 fallback | 精确历法关闭或加载失败时的离线回退 | 八字、五运六气、紫微、六爻 |
| 可选 CDN | 仅增强知识图谱展示，失败时有离线提示 | Mermaid 知识图谱 |

公开入口保持 `window.FORTUNE`，新增 `getCapabilities()` 和 `exportReportData()`。后者返回脱敏快照，可直接填入 `REPORT_DATA`，并包含 `version`、`generatedAt`、`sourceNotes`。
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
│   │   └── src/legacy/         # 纯 TS 引擎 + 21 个 ToolEnvelope 适配器
│   └── mcp-server/             # MCP Server（三层架构 Layer 2，23 工具薄壳）
│       ├── src/index.ts        # McpServer + StdioServerTransport 入口
│       ├── src/tools.ts        # 21 个计算工具定义（zod schema）
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
- **21 纯 TS 排盘引擎**：八字/紫微/六爻/奇门/大六壬/二十八星宿/太乙/梅花/五运六气/姓名/喜用神/体质/解梦 + 8 联合分析，零 DOM 依赖，统一 `ToolEnvelope` 输出，MCP 与 Dashboard 共享

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

**Features:**
- React + Vite + TypeScript dashboard with SVG visualization, capability badges and offline Mermaid fallback
- 21 pure-TS calculation engines (13 divination + 8 cross-system combo) with unified `ToolEnvelope` output, shared by MCP server and Dashboard
- MCP server (23 tools) for Claude Code / Desktop / Cursor / Cline direct invocation
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
