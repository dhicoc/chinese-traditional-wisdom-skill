<p align="center"><img src="chinese-traditional-wisdom-ai-agent-workflow.png" alt="Chinese Traditional Wisdom AI Agent Workflow" width="140" /></p>

<h1 align="center">Chinese Traditional Wisdom AI Agent Workflow</h1>
<h3 align="center">中国传统文化整体智慧 AI Agent 工作流系统</h3>

<p align="center">BaZi / Ziwei / Liuyao / Meihua / Qimen / Liuren / Taiyi / Fengshui / WuYun-LiuQi / Constitution / Daoism / Buddhism</p>

## 关于项目

本项目提供本地优先的传统文化咨询工作流：AI 负责路由、补问与语言化解读；**确定性盘面、干支、数值、规则匹配与结构化事实必须由本地引擎计算，模型不得自行推演或补全。**

```
用户问题 → Skill 三层路由 → 本地 Engine/CLI → ToolEnvelope → 本地 validate*Claims(data, claims) → 解读与报告
```

- **本地优先**：核心引擎在 `apps/visual/src/legacy/`，不上传完整生辰。
- **免费开放**：无账户、无付费墙；Dashboard 与本地命令行均可离线运行。
- **可复核**：引擎返回统一 `ToolEnvelope`；校验只比对结构化事实，不把自由文本当作可验证数据。
- **文化参考**：所有结果仅供传统文化与日常参考，不构成医疗、投资或绝对预测结论。

## 快速开始

### AI 直调本地引擎

在仓库根目录准备一个 JSON 输入文件后执行：

```bash
cd apps/visual && pnpm install
cd apps/visual && pnpm engine <tool> <input-json-file>
```

例如，`<tool>` 使用引擎注册表中的工具名。CLI 输出 JSON `ToolEnvelope`；AI 必须从本次结果提取结构化事实，再调用同一工具库中的本地 `validate*Claims(data, claims)` 函数核验拟呈现的 claims。

### Web Dashboard

```bash
cd apps/visual && pnpm dev
# 或
cd apps/visual && pnpm build && pnpm preview
```

Dashboard 是浏览器端本地计算与可视化入口。它不是语言模型推演，仍应明确显示 `local-exact`、`local-approx`、演示或降级状态。

## 本地直调架构

| 层 | 职责 | 边界 |
|---|---|---|
| Skill / Agent | 三层路由、参数补问、选择工具、解释结果 | 不自行计算或改写确定性事实 |
| Local Engine / CLI | 运行确定性 TypeScript 引擎 | `pnpm engine <tool> <input-json-file>` |
| ToolEnvelope | 返回规范化输入、数据、摘要、警告与能力模式 | 是确定性事实的唯一数据源 |
| Local verifier | `validate*Claims(data, claims)` 比对本次结构化结果 | 仅校验 claims，不校验自由文本、建议或预测 |

当前引擎覆盖 32 个本地工具，包括时间校准、排盘、日用工具和联合分析。工具列表与输入约定见 [tool-index.md](tool-index.md)。

### 校验边界

所有呈现校验均遵循同一规则：

- 只能从**本次** `ToolEnvelope.data` 提取结构化 claims；不得沿用旧结果或自行构造事实。
- `validate*Claims(data, claims)` 返回通过，只说明这些结构化 claims 与该结果一致。
- 传统释义、倾向、应期、策略、医疗建议、综合结论和其他自由文本不进入 claims，也不能被宣称“已自动校验”。
- 校验失败时，删除该断言或回到本次 `ToolEnvelope` 重新提取；不得改写后继续当作计算事实。

### 真太阳时

八字默认尝试真太阳时，但不允许假精确：Agent 必须先通过外部可靠来源核验出生地点经度、IANA 时区、出生当日 UTC 偏移、夏令时状态及 `utcOffsetEvidence`，然后调用本地 `resolve_true_solar_time`。只将返回的 `trueSolarBirth` 与 `trueSolarResolution` 传给八字引擎。

无法可靠核验时，只有在用户知情下才可按民用出生记录计算，并在报告中明确写出**“未完成真太阳时复核”**。民用时间结果不得称为真太阳时结果。

## 能力边界

| 类型 | 含义 | 示例 |
|---|---|---|
| `local-exact` | 本地精确历法或已接入真实排盘 | 八字、紫微、六爻、奇门、五运六气 |
| `local-approx` | 本地确定性规则，不同流派口径可能不同 | 梅花、风水罗盘、飞星、八宅 |
| `folk-experience` | 本地民俗规则，不做现实结果保证 | 黄历、姓名、解梦、节律 |
| 演示/降级 | 依赖不可用时的展示或回退 | 必须在界面和报告中明示 |

## 关键文件

| 文件 | 用途 |
|---|---|
| [SKILL.md](SKILL.md) | AI 工作流、路由与直调契约 |
| [RULES.md](RULES.md) | 伦理规则、输入完整性、不得自行推演的硬规则 |
| [tool-index.md](tool-index.md) | 32 个本地工具、CLI 和校验边界 |
| [README_AI.md](README_AI.md) | AI 执行入口与故障处理 |
| [EVOLUTION.md](EVOLUTION.md) | 架构演进记录 |
| [ROADMAP.md](ROADMAP.md) | 后续路线图 |
| `bootstrap/` | 各领域引擎接入指南 |
| `apps/visual/` | React Dashboard、引擎和 CLI |

## 仓库结构

```text
apps/visual/
  scripts/run-engine.ts        # 直调 CLI 入口
  src/legacy/                  # 纯 TypeScript 引擎、ToolEnvelope 与本地校验器
bootstrap/                     # 引擎使用指南
knowledge-base/                # 古籍与确定性映射表
templates/                     # 报告模板
```

## 免责声明

本项目提供传统文化学习、生活参考与哲学思辨。涉及健康症状时应先就医；不得把任何传统规则解释为医疗诊断、投资建议或必然结果。

## English Summary

A local-first traditional-wisdom workflow. Agents route requests and explain results, while deterministic chart data must come from the local engine:

```bash
cd apps/visual && pnpm engine <tool> <input-json-file>
```

The command returns a `ToolEnvelope`. Validate only structured claims with local `validate*Claims(data, claims)` functions; free-form interpretation is not machine-verified. True-solar-time inputs require externally verified location and historical time-zone evidence; otherwise disclose the civil-time fallback.
