## 目标

以紫微斗数作为第二个防编造试点：Agent 在呈现本次 `ziwei_chart` 的确定性盘面事实前，必须使用本次 MCP 进程签发的凭证校验结构化断言。校验器只核对引擎已返回的事实，不生成、补全或改写解读。

## 范围

- `ziwei_chart` 在成功生成本命盘时签发进程内有效的 `presentationToken`。
- 新增 `validate_ziwei_presentation` MCP 元工具。
- 新增紫微专用校验器，独立于既有八字校验器。
- 更新 Agent 全局规则和紫微工具工作流。
- 为校验器、MCP stdio 同会话闭环和公开工具契约增加测试。

不在本次范围内：重构八字校验器、抽象通用 registry、合并为单一验证工具、修改 Dashboard，或对传统解释、倾向、建议施加硬校验。

## 校验边界

`validate_ziwei_presentation` 接收本次 `ziwei_chart` 返回的 `presentationToken` 与 claims。只接受以下确定性断言：

- `palace`：指定宫位的位置或庙旺。
- `palaceStar`：指定星曜是否位于指定宫位。
- `sihua`：指定星曜的化禄、化权、化科或化忌。
- `mainStar`：指定星曜是否出现在本命主星集合。
- `metadata`：五行局、命主、身主、身宫地支、来因宫地支。
- `transit`：本次目标年月的大限、流年、流月、小限、流年命宫或对应四化。

文化背景、星曜释义、因果解释、条件性推论与行动建议不属于 claims。

## 数据流

1. `ziwei_chart` 调用既有 `calcZiweiEnveloped`。
2. 仅当 envelope 为 `ok: true` 时生成 UUID，并将 `ZiweiData` 保存在当前 MCP 进程的 token map。
3. 工具在 `result_meta.presentationToken` 返回该 UUID。
4. Agent 从该 ToolEnvelope 提取拟呈现的确定性事实，组装 claims 后调用 `validate_ziwei_presentation`。
5. 校验器按 claim 逐项比较 map 中的 `ZiweiData`；任意不一致则返回 `valid: false` 与 violation。无效、跨进程或未签发 token 同样拒绝。
6. Agent 仅在 `valid: true` 时将 claims 呈现为本次排盘结论；否则删除断言或从同一 ToolEnvelope 重新提取。

## MCP 契约

新增 `validate_ziwei_presentation`，并保持八字的 `validate_bazi_presentation` 不变。每个工具都有独立 schema、title 和 deterministic annotations，避免将两个引擎的 claim 语义混合。

`ziwei_chart` 的公开 output schema 仍为 ToolEnvelope；新增的 `result_meta.presentationToken` 是可选元数据，仅在成功本命盘结果中存在。

## 测试与验收

1. 紫微校验器接受来自同一 `ZiweiData` 的有效宫位、星曜、四化、元资料和动态层 claims。
2. 紫微校验器拒绝伪造的宫位星曜、四化与动态层 claims，并返回对应 kind 的 violation。
3. 无效 token 被拒绝。
4. 真实 MCP stdio 同一会话先调用 `ziwei_chart`，再用其 token 发送有效和篡改 claims；前者通过，后者拒绝。
5. tools/list 快照、工具数量、MCP typecheck/tests、visual typecheck/tests、六项 visual contract checks 和 visual build 全部通过。
