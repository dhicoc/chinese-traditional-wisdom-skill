<p align="center">
  <img src="chinese-traditional-wisdom-ai-agent-workflow.png" alt="Chinese Traditional Wisdom Skill" width="140" />
</p>

<h1 align="center">Chinese Traditional Wisdom Skill</h1>
<p align="center">中国传统文化整体智慧咨询 Skill</p>

<p align="center">
  面向人生困惑、健康调养、事业决策、婚恋、择居、占问与传统文化学习的本地参考工具。
</p>

<p align="center">
  🌐 <a href="README_en.md">English</a>
</p>

<p align="center">
  <a href="#能做什么">能做什么</a> ·
  <a href="#开始使用">开始使用</a> ·
  <a href="#准备哪些信息">准备哪些信息</a> ·
  <a href="#如何理解结果">如何理解结果</a> ·
  <a href="#进阶使用">进阶使用</a>
</p>

> **传统文化参考，非绝对预测。** 本 Skill 提供结构化计算、传统文化解释与建设性建议；不构成医疗诊断、治疗方案、投资建议或对现实结果的保证。

## 这是什么

Chinese Traditional Wisdom Skill 是一个本地优先的传统文化咨询 Skill。它帮助你把问题整理为适合查询的输入，使用本地确定性引擎生成可复核的盘面、日期、干支或规则结果，再将这些结果与传统文化解释、现实中的审慎建议分层呈现。

你可以将它用于理解传统文化框架，也可以把它当作一次咨询的辅助工具：先看结构化事实，再看传统解释，最后结合自己的实际处境作出判断。

```text
你的问题
  → 选择合适的传统文化场景
  → 本地引擎计算可复核事实
  → 传统文化解释与建设性建议
  → 明确限制、免责声明与下一步行动
```

- **本地优先**：核心计算在本地运行，不需要把完整生辰上传至远程服务。
- **不让模型猜算**：盘面、干支、数值、映射与规则匹配由本地引擎产生；模型不得自行推演或补全。
- **结果可区分**：区分本地计算事实、传统解释和现实建议，避免把文化阐释误当作确定结论。
- **适合持续使用**：可在 Dashboard 浏览，也可由支持本地 Skill 的 AI Agent 调用。

## 能做什么

| 你的问题或目标 | 可使用的传统文化场景 | 你会获得什么 |
|---|---|---|
| 想了解出生时间对应的四柱结构 | 八字、喜用神、神煞、流年与动态层 | 四柱、五行、十神、大运、小运及指定日期的流年、流月、流日 |
| 想从紫微视角整理人生议题 | 紫微斗数 | 宫位、星曜与结构化盘面信息 |
| 面对一个具体问题，希望借助占问整理思路 | 六爻、梅花易数、奇门遁甲、大六壬、太乙、测字 | 起局或起卦结果、可复核规则事实与传统解释边界 |
| 想选择日期或规划日常节律 | 黄历、择日、星宿、节律、五运六气 | 日期信息、宜忌参考、节律与季节性文化参考 |
| 想了解居家环境的传统文化视角 | 飞星、八宅、形势与方位参考 | 本地映射与规则结果，供空间整理时参考 |
| 想了解体质倾向或日常调养思路 | 体质问卷、五运六气、养生联合分析 | 文化参考与生活方式建议；症状或疾病问题应先咨询医生 |
| 想讨论姓名、梦境、婚恋或人生选择 | 姓名、解梦、合婚、年度/月度联合分析 | 结构化参考信息与非宿命化的讨论框架 |

完整工具与输入说明见 [tool-index.md](tool-index.md)。

## 开始使用

### 方式一：在 Dashboard 中使用

适合希望浏览盘面、修改输入并查看可视化结果的用户。

```bash
cd apps/visual
pnpm install
pnpm dev
```

打开本地地址后，选择相应页面并填写必要信息。Dashboard 使用本地 TypeScript 引擎计算；结果中的 `local-exact`、`local-approx`、民俗体验、演示或降级状态会说明其计算口径与可用性。

### 方式二：通过 AI Agent 使用 Skill

将本仓库作为本地 Skill 安装或加载后，先让 Agent 阅读 [SKILL.md](SKILL.md) 与 [RULES.md](RULES.md)。Agent 应当：

1. 先理解你的问题、场景和所缺信息；缺少必要输入时向你追问，而不是猜填。
2. 选择本地工具计算确定性事实；不得把模型记忆或参考文本冒充为本次计算结果。
3. 将计算事实、传统文化解释、现实建议和免责声明分开说明。

AI Agent 的完整调用约定见 [README_AI.md](README_AI.md)。

## 准备哪些信息

不同场景所需信息不同。只提供与问题有关的信息即可；不确定的字段应明确说明，不要为了“凑全”而猜测。

| 场景 | 通常需要的信息 | 使用前提示 |
|---|---|---|
| 八字、紫微、合婚等出生盘 | 公历出生年月日、时分、性别；必要时包括出生地 | 出生时分会影响结果；不知道时分时，应使用明确的限制说明 |
| 真太阳时复核 | 出生记录、已核验的出生地点经度、IANA 时区、出生当日 UTC 偏移、夏令时和 `utcOffsetEvidence` | 无法可靠核验时，只能按民用时间计算，并标注“未完成真太阳时复核” |
| 占问 | 清晰的问题、起卦/起局时间或指定方式 | 一次只聚焦一个可描述的问题，避免把占问代替现实决策程序 |
| 风水与空间 | 坐向、建造/入住年份、空间信息或照片描述 | 不要据此替代建筑安全、消防、法律或专业装修意见 |
| 体质与调养 | 问卷回答、日常习惯和主观感受 | 症状、疾病、用药或急性不适应优先咨询医生 |

### 关于真太阳时

民用出生时间不等于真太阳时。本 Skill 提供 `resolve_true_solar_time` 作为本地校正入口，但只有在地点与历史时区证据已经外部核验时，才能使用 `trueSolarBirth` 或 `trueSolarResolution` 并标记为真太阳时结果。

无法可靠核验时，可以在知情前提下使用民用时间路径：`timeBasis: 'civil-unverified'` 与 `civilFallbackConfirmed: true`。该结果必须显示“未完成真太阳时复核”，不能称为真太阳时结果。

## 如何理解结果

一次好的使用方式，是将输出分为三层阅读：

1. **本地计算事实**：如四柱、日期、干支、宫位、映射、数值和规则关系。这些来自本次本地引擎结果。
2. **传统文化解释**：如不同流派对结构的含义、象征和思考角度。它们属于文化参考，不是客观预测。
3. **现实行动建议**：如沟通、记录、休息、寻求专业协助或重新评估选择。它们应保持建设性、非宿命化，并由你结合实际情况决定是否采用。

### 八字动态层

需要查看指定日期的大运、小运、流年、流月或流日时，使用既有 `bazi_calculate` 并提供严格格式的 `transitDate: "YYYY-MM-DD"`。结果仍为本次 `ToolEnvelope`，动态事实位于 `ToolEnvelope.data.transit`。

小运按虚岁定位。若 `minor.source` 为 `lunar-exact`，表示结果来自本地历法序列；若为 `local-fallback`，表示采用确定性本地降级规则，解读时必须披露。干支关系只说明可复核的规则事实，不能直接推出事业、婚恋、健康、财富或其他现实结果。

详细的动态层输入、输出和 claims 说明见 [bootstrap/bazi-engine.md](bootstrap/bazi-engine.md)。

## 使用边界与隐私

- 不把传统文化结果当作绝对预测，也不以此替代个人判断、法律意见、财务建议或医疗服务。
- 健康问题出现症状、急性不适或持续困扰时，应优先就医；本 Skill 不提供诊断、处方或替代治疗建议。
- 不要在长期日志、公开案例或提交记录中保存完整生辰、精确地点或可识别身份信息。
- 不确定、不完整或无法核验的输入必须保留限制说明；不得将近似、演示或民用时间结果表述为精确结论。

完整伦理与安全规则见 [RULES.md](RULES.md)。

## 进阶使用

### 本地 CLI

开发者或支持 CLI 的 Agent 可直接运行本地工具：

```bash
cd apps/visual
pnpm install
pnpm engine <tool> <input-json-file>
```

除 `resolve_true_solar_time` 直接返回 `TrueSolarTimeResolution` 外，CLI 返回 JSON `ToolEnvelope`。呈现确定性事实前，应只从本次 `ToolEnvelope.data` 提取结构化 claims，再调用对应本地 `validate*Claims(data, claims)` 核验；该校验不能验证自由文本、传统解释、建议或预测。

标准 success fixture、所有工具名与 CLI 示例见 [tool-index.md](tool-index.md)。

### 关键资源

| 资源 | 用途 |
|---|---|
| [SKILL.md](SKILL.md) | Skill 路由、调用顺序与输出规范 |
| [RULES.md](RULES.md) | 伦理、隐私、健康与输入完整性边界 |
| [README_AI.md](README_AI.md) | AI Agent 的本地调用说明与故障处理 |
| [tool-index.md](tool-index.md) | 32 个本地工具、标准 fixture 与 CLI 参考 |
| [`bootstrap/`](bootstrap/) | 八字、紫微、六爻、梅花、风水等领域的详细说明 |
| [`apps/visual/`](apps/visual/) | Dashboard、纯 TypeScript 引擎与测试 |

### 开发验证

改动引擎、输入契约或公开文档后，在 `apps/visual` 运行：

```bash
node scripts/check-doc-contracts.mjs
npm run test:unit
npm run typecheck
npm run build
```

文档契约检查会确保公开工具清单、CLI、fixture 和关键使用约定保持一致。

## 仓库结构

```text
apps/visual/
  scripts/run-engine.ts        # 本地 CLI 入口
  src/legacy/                  # 纯 TypeScript 引擎、ToolEnvelope 与校验器
  src/__fixtures__/local-tools/# CLI 标准输入样例
bootstrap/                     # 分领域使用说明
knowledge-base/                # 传统文化资料与本地确定性映射表
templates/                     # 报告模板
SKILL.md                       # Skill 主入口
RULES.md                       # 安全与伦理规则
```

## English Summary

**Chinese Traditional Wisdom Skill** is a local-first Skill for traditional-culture consultation and reflection. It supports BaZi, Ziwei, divination, date selection, Fengshui, constitution reference, and related topics.

Deterministic facts come from the local engine, not model inference. The CLI is:

```bash
cd apps/visual && pnpm engine <tool> <input-json-file>
```

Most commands return a `ToolEnvelope`; `resolve_true_solar_time` returns `TrueSolarTimeResolution`. Validate only structured claims with local `validate*Claims(data, claims)` functions. Treat all interpretations as cultural reference, disclose civil-time fallback when true-solar time cannot be verified, and never use results as medical, financial, or absolute predictive advice.
