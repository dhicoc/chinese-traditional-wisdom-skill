# EVOLUTION.md — 架构演进记录

## 2026-08-09：迁移为本地直调架构

### 决策

当前主架构固定为：

```text
Skill → 直接本地 Engine/CLI → ToolEnvelope → 本地 validate*Claims(data, claims) → 解读 / Dashboard
```

`apps/visual/scripts/run-engine.ts` 是命令行入口，调用本地 `directRunner.ts`；命令形式为：

```bash
cd apps/visual && pnpm engine <tool> <input-json-file>
```

### 原则

- 计算、排盘、映射、评分和其他确定性事实只能来自本地引擎。
- 模型只做路由、补问与语言化解读，不能自行推演或修正引擎事实。
- `ToolEnvelope` 是本次可复核结果的载体。
- 本地 `validate*Claims(data, claims)` 只验证结构化 claims；传统解释、建议与其他自由文本不进入校验范围。
- 真太阳时必须先外部核验地点与历史时区证据，再通过 `resolve_true_solar_time` 把 `trueSolarBirth`、`trueSolarResolution` 直接传给八字引擎；不能核验时显式使用“未完成真太阳时复核”的民用时间 fallback。
- 模型不得自行推演确定性盘面、干支、数值或规则匹配。

### CI

CI 收敛到 `apps/visual`，执行类型检查、单元测试、文档/数据契约检查与构建。文档检查不再要求外部适配层、已移除文件或历史工具统计。

## 2026-07：本地 TypeScript 引擎与 Dashboard

- 建立 `apps/visual` React + Vite + TypeScript Dashboard。
- 将八字、紫微、六爻、奇门、大六壬、星宿、太乙、梅花、五运六气、日用与联合分析统一为可复用的本地引擎。
- 统一 `ToolEnvelope`，供报告、Dashboard 和本地命令行消费。
- 引入 `local-exact`、`local-approx`、民俗体验和演示/降级能力标识。
- 保留古籍全文与 6 个确定性风水映射表，强调确定性查询优先。

## 2026-05 至 2026-06：工作流基础

- 形成问题类型 → 学科 → 融合深度的三层路由。
- 建立健康、事业、婚恋、占卜、择居和综合咨询模板。
- 将伦理、隐私、免责声明与积极导向写入 RULES 和报告模板。
- 建立风水知识库与本地映射表，避免把确定性查表问题伪装成开放式生成。

## 持续原则

1. 确定性查询优先于模型记忆。
2. 本地、脱敏和可复核优先于便利性。
3. 校验事实，不伪造自由文本校验。
4. 传统文化定位、医疗安全和积极表达不可退让。
5. 每次架构变化均同步更新文档和 CI 契约。
