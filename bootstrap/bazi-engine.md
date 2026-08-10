# 八字排盘引擎集成指南

> 八字的确定性数据必须由本地引擎产生；模型仅解释结果。

## 本地直调

```bash
cd apps/visual && pnpm engine bazi_calculate <input-json-file>
```

实现：`apps/visual/src/legacy/baziEngine.ts`；CLI 由 `lunar-typescript` 提供精确历法入口，结果按实际路径标识为 `local-exact` 或 `local-approx`。

## 真太阳时默认预处理

民用出生时间不能直接称为真太阳时。先执行：

```bash
cd apps/visual && pnpm engine resolve_true_solar_time <input-json-file>
```

输入必须包含 `birth` 与经外部核验的 `location`（`displayName`、`longitude`、`ianaTimeZone`、`utcOffsetMinutes`、`utcOffsetEvidence`）。该工具是 CLI 的返回例外，直接返回 `TrueSolarTimeResolution`，不包裹在 `ToolEnvelope.data` 中。固定流程如下：

1. 外部核验出生地点经度、IANA 时区、出生当日 UTC 偏移、夏令时和 `utcOffsetEvidence`。
2. 运行 `resolve_true_solar_time`，取得 `trueSolarBirth` 与完整 `trueSolarResolution`。
3. 将真太阳时出生记录同时作为 `birth` 与 `trueSolarBirth` 或 `trueSolarResolution` 传给 `bazi_calculate`，并设置 `timeBasis: 'true-solar-verified'`。
4. 无法可靠核验时，只能在用户知情下使用民用出生记录，设置 `timeBasis: 'civil-unverified'` 与 `civilFallbackConfirmed: true`，并标注“未完成真太阳时复核”。

模型与 Dashboard 都不得猜测地点、历史时区、夏令时或均时差。

## 输入

| 字段 | 说明 |
|---|---|
| birth.year/month/day/hour/minute | 公历出生时间；时分边界必须准确 |
| birth.gender | 男或女 |
| timeBasis | 必填：`true-solar-verified` 或 `civil-unverified` |
| trueSolarBirth / trueSolarResolution | `true-solar-verified` 时必填；出生记录必须与 `birth` 一致 |
| civilFallbackConfirmed | `civil-unverified` 时必须为 `true` |
| shenShaTrineSource | 可选：`year` 或 `day` |

## 输出与校验

结果包含四柱、十神、五行、大运、神煞及警告。最终呈现确定性字段前，只从本次 `ToolEnvelope.data` 组织结构化 claims，并调用本地 `validateBaziClaims(data, claims)`（以实际导出函数为准）。保留 `result_meta.calculationConfig`，其中包含实际历法、神煞与起运口径；Runner 会补充实际 `timeBasis`。校验不覆盖格局解释、用神建议、健康含义或其他自由文本。

## 解读边界

- 四柱、干支、五行计数和大运等事实必须逐项来自引擎。
- 格局、性格、事业、婚恋和健康相关文本均为传统文化解释，须与事实分开书写。
- 健康内容不能构成诊断或治疗建议；遵守 `RULES.md`。
