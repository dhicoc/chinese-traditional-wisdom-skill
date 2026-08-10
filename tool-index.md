# tool-index.md — 本地引擎与直调索引

## 直调入口

所有确定性计算通过本地 CLI 执行：

```bash
cd apps/visual && pnpm engine <tool> <input-json-file>
```

实现位置：`apps/visual/scripts/run-engine.ts`。CLI 读取 JSON 输入并调用 `src/legacy/directRunner.ts`，输出一个 JSON `ToolEnvelope`。没有可复核的本地输出时，AI 不得自行推演。

前八批公开输入 fixture 位于 `apps/visual/src/__fixtures__/local-tools/`。每个已覆盖工具都有 `.success.json`、`.boundary.json` 和 `.failure.json`，可直接执行，例如：

```bash
cd apps/visual && pnpm engine bazi_calculate src/__fixtures__/local-tools/bazi_calculate.success.json
cd apps/visual && pnpm engine arrange_qimen src/__fixtures__/local-tools/arrange_qimen.success.json
cd apps/visual && pnpm engine get_almanac src/__fixtures__/local-tools/get_almanac.success.json
cd apps/visual && pnpm engine huangji_calculate src/__fixtures__/local-tools/huangji_calculate.success.json
cd apps/visual && pnpm engine list_constitution_questionnaire src/__fixtures__/local-tools/list_constitution_questionnaire.success.json
cd apps/visual && pnpm engine combo_monthly_fortune src/__fixtures__/local-tools/combo_monthly_fortune.success.json
cd apps/visual && pnpm engine combo_sanshi_classic src/__fixtures__/local-tools/combo_sanshi_classic.success.json
cd apps/visual && pnpm engine combo_marriage src/__fixtures__/local-tools/combo_marriage.success.json
```

## ToolEnvelope 与本地校验

```ts
ToolEnvelope<TData> = {
  ok: boolean;
  tool: string;
  version: string;
  input_normalized: unknown;
  data: TData;
  summary?: string;
  warnings?: string[];
  error?: unknown;
}
```

使用规则：从本次 `data` 提取结构化 claims，调用本地 `validate*Claims(data, claims)`。校验仅覆盖结构化事实，不能验证自由文本、解释、建议或预测。

## 32 个本地工具

| 类别 | 工具 |
|---|---|
| 时间校准（1） | `resolve_true_solar_time` |
| 排盘与日用（22） | `bazi_calculate`、`ziwei_chart`、`cast_liuyao`、`arrange_qimen`、`liuren_calculate`、`xingxiu_daily`、`taiyi_calculate`、`huangji_calculate`、`cast_meihua`、`calc_yunqi`、`analyze_name`、`calc_xiyong`、`get_constitution_tendency`、`dream_interpret`、`cast_cezi`、`calc_chenguz`、`get_almanac`、`calc_feixing`、`calc_bazhai`、`get_daily_rhythm`、`assess_constitution`、`list_constitution_questionnaire` |
| 联合分析（9） | `combo_annual_fortune`、`combo_monthly_fortune`、`combo_decision`、`combo_space_time`、`combo_sanshi`、`combo_sanshi_classic`、`combo_daily_wellness`、`combo_zeri`、`combo_marriage` |

## 引擎实现

| 能力 | 主文件 | 运行模式 |
|---|---|---|
| 八字 | `legacy/baziEngine.ts` | `local-exact`（可用 Solar）或 `local-approx` |
| 真太阳时 | `legacy/trueSolarTime.ts` | 已核验输入的确定性校正 |
| 紫微 | `legacy/ziweiEngine.ts` | iztro 本地排盘 |
| 六爻 | `legacy/liuyaoEngine.ts` | 本地纳甲规则 |
| 梅花 | `legacy/meihuaEngine.ts` | 本地规则 |
| 奇门 | `legacy/qimenEngine.ts` | 3meta 本地排盘 |
| 大六壬、星宿、太乙 | 对应 `*Engine.ts` | 本地历法与规则 |
| 五运六气 | `legacy/yunqiEngine.ts` | 本地历法与规则 |
| 日用与联合分析 | `envelopeAdapters.ts`、`comboEngine.ts` | 本地查表、聚合 |

## 真太阳时输入

`resolve_true_solar_time` 只接收已外部核验的经度、IANA 时区、出生当日 UTC 偏移、夏令时与 `utcOffsetEvidence`。输出 `trueSolarBirth`、`trueSolarResolution` 和校正明细。无法核验时应走民用时间 fallback，并显示“未完成真太阳时复核”。

`calc_chenguz` 使用年干支、农历月日与时支，必须提供 `baziTimeContext`；CLI 输出会标记所用时间来源。`combo_space_time` 的出生年和性别仅用于命卦，出生月日时分仅用于构造奇门起局时刻，`targetYear` 会替换起局年份；它不使用本命八字四柱或八字真太阳时语义。`combo_zeri` 只使用出生年和性别（命卦与生肖冲合），不依赖出生月日时分或本命八字四柱。

## 参考与备用方案

- `bootstrap/`：各领域输入、输出与解释边界。
- `knowledge-base/fengshui/mappings/`：6 个本地确定性 JSON 映射表。
- `apps/visual/scripts/check-mapping-schema.mjs`：映射表 schema 检查。
- Python 包和外部资料只可用于命令行交叉验证或研究，不替代当前本地 Engine/CLI 的对话计算结果。
