# 深度调研实施路线图

> 更新日期：2026-08-09。本文记录当前本地 Skill 架构下的后续工程方向。

## 当前架构

```text
SKILL.md / RULES.md
  → Agent 收集并核验必要输入
  → apps/visual/scripts/run-engine.ts
  → apps/visual/src/legacy/directRunner.ts
  → 本地 TypeScript 引擎
  → ToolEnvelope
  → claimVerification 的纯 validate*Claims(data, claims)
  → 用户可读说明或 Dashboard
```

所有确定性计算都在本地执行。`run-engine.ts` 通过 `pnpm engine <tool> <input-json-file>` 接收一次性 JSON 输入并输出结果；它不维护会话状态。呈现校验器直接接收同一次结果的 `data` 与结构化 `claims`，不校验自由文本、解释、建议或预测。

## 已完成基线

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| CI | ✅ | `apps/visual` 的类型检查、单元测试、契约、烟测和构建均在 GitHub Actions 运行。 |
| 本地引擎 | ✅ | 32 个工具名由 `directRunner.ts` 映射到纯 TS 引擎，统一返回 `ToolEnvelope` 或真太阳时校准结果。 |
| 真太阳时 | ✅ | Agent 核验地点与历史时区事实后，直接调用 `resolve_true_solar_time`，并将 `trueSolarBirth` 或 `trueSolarResolution` 传入涉及八字的计算。 |
| 民用时间降级 | ✅ | 无法完成核验时，必须显式确认 `civilFallbackConfirmed=true` 并展示“未完成真太阳时复核”。 |
| 防编造校验 | ✅ | 八字、紫微、八宅、飞星、历法、占测、日用、组合和数值校验器均为无状态纯函数。 |
| P2.4l 年度组合校验 | ✅ | `combo_annual_fortune` 显式输出目标年份和命卦 context；只校验这些原子字段，不校验综合结论或建议。 |

## 后续优先级

### P1：收敛引擎边界

1. 把 `apps/visual/src/legacy` 的公开 API 按领域整理为稳定导出层，减少跨模块直接引用。
2. 为各工具输入建立共享 TypeScript 类型与轻量运行时边界校验，保持 CLI、Dashboard 和测试使用同一份输入契约。
3. 将八字神煞、紫微动态层和风水口径收敛为可披露的 `calculationConfig`，并以固定夹具覆盖不同流派边界。

### P2：强化可验证呈现

1. 扩展结构化 claims 的覆盖范围时，坚持只纳入独立、稳定的基础事实。
2. 为每个校验器增加直接结果、篡改值与跨工具 claims 的回归测试。
3. 保持 `valid: true` 的窄含义：只代表所给结构化 claims 与该次引擎结果一致，不能用于声明自由文本或现实效果已验证。
4. 继续维护古籍条目的稳定引用 ID，使文化背景与确定性计算结果清晰分层。

### P3：产品与分发

1. 提供更完整的本地命令行示例、输入模板和可复现报告导出。
2. 完善 Dashboard 的隐私标识、运限时间轴和本地历史版本化。
3. 评估将引擎拆为独立本地包的成本，但必须保持离线、无服务端和一次性直接调用的运行模型。

## 变更验收

每次修改引擎、运行器、校验器或用户可见架构说明后，至少运行：

```text
cd apps/visual
pnpm typecheck
pnpm test:unit
node scripts/smoke-react-shell.mjs
node scripts/check-doc-contracts.mjs
pnpm build
```

涉及具体盘面规则时，还应运行对应的固定夹具测试。修改测试断言不能替代对上游依赖版本、规则口径和用户可见边界的说明。
