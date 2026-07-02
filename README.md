<p align="center">
  <img src="chinese-traditional-wisdom-skill.png" alt="chinese-traditional-wisdom-skill" width="140" />
</p>

<h1 align="center">Chinese Traditional Wisdom</h1>
<h3 align="center">中国传统文化整体智慧 AI Agent 技能包</h3>

<p align="center"><em style="font-family: 'KaiTi', 'STKaiti', 'SimSun', serif; font-size: 1.3em; color: #999;">究天人之际，通古今之变</em></p>

<p align="center">BaZi / Ziwei / Liuyao / Meihua / Fengshui / WuYun-LiuQi / Constitution / Daoism / Buddhism — 全融合智慧引擎<br/>
11 标签页可视化 Dashboard · 能力边界标识 · 古籍知识库 · 纯前端排盘引擎 · 自动化测试</p>

<p align="center">
  <a href="https://github.com/dhicoc/chinese-traditional-wisdom-skill/stargazers"><img src="https://img.shields.io/github/stars/dhicoc/chinese-traditional-wisdom-skill?style=flat&logo=github" alt="stars"></a>
  <a href="https://github.com/dhicoc/chinese-traditional-wisdom-skill/forks"><img src="https://img.shields.io/github/forks/dhicoc/chinese-traditional-wisdom-skill?style=flat&logo=github" alt="forks"></a>
  <a href="https://github.com/dhicoc/chinese-traditional-wisdom-skill/issues"><img src="https://img.shields.io/github/issues/dhicoc/chinese-traditional-wisdom-skill?style=flat&logo=github" alt="issues"></a>
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

当 AI Agent（Claude Code、Codex CLI、Cursor 等）遇到用户的人生困惑、健康调养、事业决策、婚姻合婚、择吉选址等问题时，本技能包提供从排盘推算 → 知识库检索 → 综合分析 → 可视化报告的全链路能力。

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
  <img src="https://skillicons.dev/icons?i=js,html,css,py,nodejs,git&theme=light" /><br/>
  <code>Canvas 2D</code> · <code>Mermaid.js</code> · <code>bazi-ziwei-skill</code> · <code>iztro-py</code>
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

无需安装任何依赖，直接双击 `visual/index.html` 或从浏览器打开：

```
file://<SKILL_ROOT>/visual/index.html
```

11 标签页：八字 / 五行 / 紫微 / 六爻 / 梅花 / 风水罗盘 / 流年飞星 / 八宅 / 五运六气 / 体质 / 知识图谱

双击 `visual/test-runner.html` 可运行自动化测试套件，页面会展示浏览器环境、失败详情、总数统计和截图建议。

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
| 本地规则计算 | 浏览器内可重复、确定性规则 | 流年飞星、八宅、风水罗盘 |
| 本地近似计算 | 可离线运行，但存在节气/历法近似 | 八字、五运六气 |
| 演示数据 | 用于可视化结构展示，不代表真实排盘 | 紫微、六爻、梅花 |
| 需外部引擎 | 真实排盘需要接入外部库或人工规则 | 紫微、六爻、梅花精算 |
| 可选 CDN | 仅增强知识图谱展示，失败时有离线提示 | Mermaid 知识图谱 |

公开入口保持 `window.FORTUNE`，新增 `getCapabilities()` 和 `exportReportData()`。后者返回脱敏快照，可直接填入 `REPORT_DATA`，并包含 `version`、`generatedAt`、`sourceNotes`。
### 关键文件

| 文件 | 用途 |
|------|------|
| [SKILL.md](SKILL.md) | 总控入口 + 三层路由契约（AI 必读） |
| [RULES.md](RULES.md) | 行为规则链（§9 Fail-Two / §10 输入完整性） |
| [tool-index.md](tool-index.md) | 六引擎 + 六映射 + 可视化依赖表 |
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
├── bootstrap/                  # 六引擎接入引导
├── templates/                  # 7 种咨询报告模板
├── knowledge-base/fengshui/    # 古籍知识库（30 文件 / 16+ 部经典）
│   └── mappings/               # 6 个 JSON 确定性映射表
├── reference-*.md              # 玄学 / 佛教 / 道家 / 中医参考
│
├── visual/                     # 可视化系统（纯前端）
│   ├── index.html              # 11 标签页 Dashboard
│   ├── test-runner.html        # 测试运行器
│   ├── js/engines/             # 纯 JS 排盘引擎
│   ├── js/capabilities.js      # 能力标识、报告导出、诊断入口
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
- **2 纯前端排盘引擎**：八字（1900-01-01=己亥基准）、五运六气（丙辛水运/乙庚金运等），零 npm/pip 依赖

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
- 八字引擎 [bazi-ziwei-skill](https://github.com/novertime/bazi-ziwei-skill)（MIT）
- 紫微引擎 [iztro-py](https://github.com/syncretism/iztro-py)（MIT）
- 六爻引擎 [ichingshifa](https://github.com/winetree94/ichingshifa)（MIT）
- 梅花易数 [meihua-yishu](https://github.com/shtan1992/meihua-yishu)（CC BY-NC-SA）
- 五运六气 [wuyun-liuqi-skills](https://github.com/dhicoc/wuyun-liuqi-skills)（MIT）

<p align="right">(<a href="#许可证">返回顶部</a>)</p>

<a id="english-version"></a>

---

> **English Version — README.md is bilingual. Chinese content is above. Below is a summary.**

---

# Chinese Traditional Wisdom — AI Agent Skill Pack

A holistic life consulting AI Agent Skill Pack integrating BaZi, Ziwei, Liuyao, Meihua, Fengshui, WuYun-LiuQi, TCM Constitution, Daoist philosophy, and Buddhist psychology.

**Features:**
- 11-tab Canvas 2D visualization dashboard with capability badges and offline Mermaid fallback
- Pure frontend BaZi and WuYun-LiuQi calculation engines
- 30-file classic text knowledge base (16+ Fengshui classics)
- 6 deterministic JSON mapping tables
- Enhanced browser test runner and JSON mapping schema checks
- 7 professional consulting report templates
- Global search across 284 terms, 6 mappings, and 30 classic texts

**Quick Start:** Double-click `visual/index.html` to open the dashboard, or let the AI handle everything.

**Tech Stack:** JavaScript, HTML5 Canvas 2D, Mermaid.js

**License:** MIT

---

<p align="center">
  <a href="https://linux.do">AI Community: linux.do</a>
</p>
