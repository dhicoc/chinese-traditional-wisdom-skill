# Agent 参数规划器实施与调用契约

> 状态：CTW-P3-03 已完成（2026-08-21）
> 权威实现：`apps/visual/src/legacy/agentParameterPlanner.ts`
> CLI：`apps/visual/scripts/run-engine-agent.ts plan`

## 1. 目的

参数规划器把自然语言请求转换为**下一步需要准备什么**，而不是转换为盘面结果。它复用现有本地模块路由和 32 工具 descriptor，输出：

- 路由类型与目标模块；
- 0–4 个候选 registry 工具；
- 已识别的字段存在性；
- 缺失字段及原因；
- 风险提示和执行策略；
- `light` / `standard` / `deep` 建议深度。

规划器不会调用 `runLocalTool()`、历法库或任何排盘 Engine，不产生四柱、干支、星曜、映射、数值或传统解释。

## 2. CLI

直接查询：

```bash
pnpm engine:plan --query "想看今年事业"
```

仅传递字段存在性，不传值：

```bash
pnpm engine:plan --query "八字事业" --provided birth,timeBasis
```

JSON 输入：

```bash
pnpm engine:plan --input src/__fixtures__/analysis/agent-plan.success.json
```

`providedFields` 只允许公开字段名；未知字段、空 query、超过 500 字或错误 flag 返回 stderr `INVALID_INPUT`。

## 3. 输入契约

```ts
interface AgentParameterPlanInput {
  query: string;
  providedFields?: string[];
}
```

`providedFields` 是 presence-only 提示，例如 `birth`、`timeBasis`、`date`。规划器不接收这些字段的实际值，因此不能绕过后续 `parseLocalToolInput()`。

## 4. 输出契约

```ts
interface AgentParameterPlan {
  schemaVersion: '1.0.0';
  routeKind: 'knowledge' | 'calculation' | 'high-risk' | 'unrecognized';
  routeTarget: { module: ModuleId | null; reason: string };
  executionPolicy: 'plan-only' | 'refer-first' | 'knowledge-only' | 'no-traditional-calculation';
  suggestedDepth: 'light' | 'standard' | 'deep';
  candidates: PlannedToolCandidate[];
  recognizedInputs: string[];
  missingInputs: Array<{ field: string; reason: string }>;
  riskNotices: string[];
  limitations: string[];
}
```

每个候选包含 registry 元数据、必填键、候选自身缺失字段、标准 success fixture 和两个独立状态：

- `inputReady`：只表示必填字段**名称**齐全；
- `executionAllowed`：高风险请求固定为 `false`。

即使两者均为 true，Agent 也只能把真实输入交给对应 CLI 契约；规划器本身永不自动执行。

## 5. 确定性边界

### 日期和年份

- `2026-08-21` 可识别为明确日期。
- “今天”“明天”不会被换算，候选仍缺 `date`。
- “今年”“明年”不会变成系统年份；需要调用方先提供明确年份。
- 规划输出不含运行时当前日期。

### 生辰与时间基准

完整 `birth` 至少需要年、月、日、小时、性别；不得默认子时。八字另需明确 `timeBasis`。真太阳时请求先候选 `resolve_true_solar_time`，并要求：经度、IANA 时区、出生当日 UTC 偏移、夏令时和证据。

### 专业与高风险请求

- 普通医疗、法律、财务和心理请求在未明确传统文化意图时返回 `no-traditional-calculation`，候选为空。
- 急性健康、自伤、投资保证或未授权第三人请求返回 `refer-first`；所有候选 `executionAllowed: false`。
- 古籍和思想请求返回 `knowledge-only`，不要求生辰或排盘参数。

## 6. 隐私

- 输出不包含 `query`，CLI 不回显原始咨询文本。
- `recognizedInputs` 只列字段名，不列值。
- 规划结果不写入历史、日志、报告或浏览器存储。
- fixture 使用合成请求，不包含真实姓名、地点、生辰或原始咨询记录。

## 7. Fixture 与测试

| 类型 | fixture | 语义 |
|---|---|---|
| success | `agent-plan.success.json` | 事业请求 → 八字候选，缺 birth/timeBasis |
| boundary | `agent-plan.boundary.json` | 普通医疗问题不自动术数化 |
| failure | `agent-plan.failure.json` | 空 query → `INVALID_INPUT` |

定向测试：

```bash
pnpm --dir apps/visual exec vitest run \
  src/__tests__/agentParameterPlanner.test.ts \
  src/__tests__/agentParameterPlannerCli.test.ts
```

完整质量门仍按 `docs/IMPLEMENTATION-PLAN.md` 第 9 节执行。该阶段没有 Dashboard 交互改动，但按项目阶段约定继续运行四浏览器 smoke E2E。
