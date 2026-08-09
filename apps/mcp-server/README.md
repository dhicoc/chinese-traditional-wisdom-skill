# chinese-wisdom-mcp-server

中国传统智慧计算 MCP Server。它将本地纯 TypeScript 的确定性计算能力暴露为 [MCP](https://modelcontextprotocol.io) 工具，供 Claude Code、Claude Desktop、Cursor、Cline 等客户端调用。

> 三层架构 Layer 2：本服务是薄壳，不在此处重写计算逻辑。引擎来自 `apps/visual/src/legacy/`，常规计算统一返回 `ToolEnvelope`；真太阳时校准返回可审计的校准结果。

## 工具列表

共 **37 个工具**：**32 个计算工具**与 5 个元工具（`agent_guidance` 参数引导、`validate_bazi_presentation` 八字呈现依据校验、`validate_ziwei_presentation` 紫微呈现依据校验、`validate_bazhai_presentation` 八宅呈现依据校验、`wisdom_dispatch` 自然语言意图路由）。

- 时间校准：`resolve_true_solar_time`
- 排盘与日用计算：`bazi_calculate`、`ziwei_chart`、`cast_liuyao`、`arrange_qimen`、`liuren_calculate`、`xingxiu_daily`、`taiyi_calculate`、`huangji_calculate`、`cast_meihua`、`calc_yunqi`、`analyze_name`、`calc_xiyong`、`get_constitution_tendency`、`dream_interpret`、`cast_cezi`、`calc_chenguz`、`get_almanac`、`calc_feixing`、`calc_bazhai`、`get_daily_rhythm`、`assess_constitution`、`list_constitution_questionnaire`
- 跨系统联合分析：`combo_annual_fortune`、`combo_monthly_fortune`、`combo_decision`、`combo_space_time`、`combo_sanshi`、`combo_sanshi_classic`、`combo_daily_wellness`、`combo_zeri`、`combo_marriage`
- 元工具：`agent_guidance`、`validate_bazi_presentation`、`validate_ziwei_presentation`、`validate_bazhai_presentation`、`wisdom_dispatch`

`bazi_calculate`、`ziwei_chart`、`cast_liuyao`、`arrange_qimen`、`liuren_calculate`、`xingxiu_daily`、`taiyi_calculate`、`huangji_calculate`、`cast_meihua`、`calc_yunqi` 等工具由 `lunar-javascript`、`iztro`、`3meta` 或本地规则引擎提供确定性结果。具体参数和 schema 以 MCP 客户端展示的工具定义为准。

常规工具返回统一 `ToolEnvelope`：

```json
{
  "ok": true,
  "tool": "BaziLunarAdapter",
  "version": "local-exact",
  "input_normalized": { "...": "..." },
  "data": {
    "...": "...",
    "export_snapshot": { "summary": "...", "tags": [], "sections": [] }
  },
  "summary": [],
  "warnings": []
}
```

`data.export_snapshot` 是稳定的用户呈现素材。Agent 应以它、`summary` 与用户可见的 `warnings` 组织解释；`evidence`、`result_meta`、`sourceNotes` 等内部字段不应直接混入普通用户文案。

## 八字真太阳时调用顺序

真太阳时是八字的默认预处理路径，但不得以未核验资料制造假精确。对话 Agent 必须遵循以下顺序：

1. 收集民用出生记录和足以定位的出生地。
2. Agent 核验地点经度、IANA 时区、出生当日实际 UTC 偏移、夏令时状态，并保留 `utcOffsetEvidence`；不得凭模型记忆补写这些事实。
3. 将已核验资料调用 `resolve_true_solar_time`，取得 `trueSolarBirth` 与 `calibrationToken`。
4. 将 `trueSolarBirth` 原样传给 `bazi_calculate`，并设置 `timeBasis=true-solar-verified` 与对应 `calibrationToken`。
5. 仅依据工具结果解释排盘；若要呈现四柱、日主、五行计数、日主强弱、大运或神煞，先以本次结果的 `result_meta.presentationToken` 调 `validate_bazi_presentation`，仅呈现返回 `valid: true` 的 claims。
6. 若要呈现紫微宫位、星曜、四化、五行局、命主、身主或本次动态层，先以本次 `ziwei_chart` 的 `result_meta.presentationToken` 调 `validate_ziwei_presentation`；传统解释、条件性推论和建议不进入 claims。
7. 若要呈现八宅命卦、八方游年星与吉凶，或本次年份的太岁、岁破、三煞、五黄方位，先以本次 `calc_bazhai` 的 `result_meta.presentationToken` 调 `validate_bazhai_presentation`；传统释义、布局建议、门主灶与化解建议不进入 claims。

如果地点或历史时区、夏令时无法可靠核验，必须先说明限制。仅在用户明确确认后，才可使用民用出生记录调用 `bazi_calculate`，并设置 `timeBasis=civil-unverified`、`civilFallbackConfirmed=true`；输出必须标注**“未完成真太阳时复核”**。不得把该结果称为真太阳时排盘。

## 安装

```bash
cd apps/mcp-server
npm install
```

依赖：`@modelcontextprotocol/sdk`、`iztro`、`3meta`、`lunar-javascript`、`zod`。Node ≥ 20。

## 客户端配置（推荐：一键自动配置）

在仓库根目录执行：

```bash
node scripts/setup-mcp.mjs
```

该脚本自动检测 Claude Code、Claude Desktop、Cursor、Cline，并合并写入对应配置（幂等，不覆盖已有 server）。Windows 下自动以 `cmd /c npx tsx` 包裹。配置后重启客户端即可。

- 仅检查不写入：`node scripts/setup-mcp.mjs --check`
- 只配指定客户端：`node scripts/setup-mcp.mjs --client=claude-code`

## 客户端配置（手动，备选）

如需手动配置，参考 `examples/` 下对应示例。

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

配置后重启客户端，应能看到 `chinese-wisdom` server 已连接并显示 37 个工具。

## 使用示例

- 「帮我排个八字，1990 年 6 月 15 日 12 时出生，男，出生地为……」→ Agent 先核验资料，调用 `resolve_true_solar_time`，再以 `trueSolarBirth` 调 `bazi_calculate`
- 「张伟这个名字打多少分？1990 年出生」→ `analyze_name`
- 「我梦见蛇是什么意思」→ `dream_interpret`
- 「2024 年五运六气如何」→ `calc_yunqi`

Agent 必须先通过 `wisdom_dispatch` 路由、`agent_guidance` 核对必填参数，再调用相应计算工具；不得根据模型知识自行推演确定性结论。

## 与 Visual Dashboard 的关系

MCP server 与 `apps/visual` Dashboard 共享纯 TS 引擎：

- **MCP server**：供对话 Agent 调用，是 Agent 获得确定性结论的唯一入口。
- **Dashboard**：供用户在浏览器本地输入与查看可视化；它不是对话 Agent 绕过 MCP 的回退入口。

Dashboard 只展示真太阳时的等待核验、已核验或民用降级状态；不要求普通用户输入经度或历史 UTC 偏移，也不自行猜测地点、时区或夏令时。

## 开发

```bash
npm start
npm test
npm run typecheck
```

新增工具时，在 `src/tools.ts` 的 `TOOLS` 数组添加工具定义与 handler；`index.ts` 会自动注册。

## 许可证

继承仓库主许可证。第三方引擎：iztro (MIT)、3meta (MIT)、lunar-javascript (MIT)。
