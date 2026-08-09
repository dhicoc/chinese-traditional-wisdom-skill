# ROADMAP.md — 本地直调架构路线图

## 当前基线

项目以本地 TypeScript 引擎、React Dashboard 与 Skill 路由为核心：

```text
Skill / Agent → Local Engine CLI → ToolEnvelope → validate*Claims(data, claims) → Report / Dashboard
```

已具备：32 个本地工具、统一 `ToolEnvelope`、`local-exact` / `local-approx` 能力标识、真太阳时民用降级标记、脱敏报告导出和映射表契约检查。

## P0：直调契约稳定化

- 保持 `apps/visual/scripts/run-engine.ts` 作为唯一命令行入口。
- 为每个本地工具维护可机读的输入示例和稳定错误信息。
- 让 `directRunner.ts` 的工具注册表与文档中的 32 工具清单持续一致。
- 文档契约检查验证本地 Runner、ToolEnvelope、32 工具、真太阳时与“模型不得自行推演”规则。

## P1：结构化事实校验

- 统一各领域的本地 `validate*Claims(data, claims)` 签名与 violation 输出。
- 只为稳定、结构化、可重复计算的字段建立 claims；不为解释性文本创建伪校验。
- 为八字、紫微、八宅、飞星、历法、占测、日用及联合结果补齐有效/篡改 claims 的单元测试。
- 报告中将“结构化事实核对”与传统解释、建议、医疗免责声明明确分层。

## P2：真太阳时与输入可信度

- 保持外部核验在引擎之外：引擎不解析地名、不猜历史时区或夏令时。
- CLI 通过 `resolve_true_solar_time` 接收并生成 `trueSolarBirth` 和 `trueSolarResolution`，并保留“未完成真太阳时复核”的民用时间 fallback 显式状态。
- 覆盖跨日期、时辰边界、子初边界及无可靠证据时的降级测试。

## P3：可视化与报告

- Dashboard 持续显示 `local-exact`、`local-approx`、民俗体验、演示和降级状态。
- 静态报告只导出脱敏数据；不保存完整出生日期、具体地点或身份信息。
- 为四层报告保留事实、背景、解释和行动建议的明确边界。

## 质量门槛

CI 只运行 `apps/visual`：安装依赖、typecheck、单元测试、文档与数据契约检查、build。每次变更至少应运行：

```bash
node apps/visual/scripts/check-doc-contracts.mjs
```

并在涉及引擎时运行相应的 `pnpm typecheck`、`pnpm test:unit` 与 `pnpm build`。
