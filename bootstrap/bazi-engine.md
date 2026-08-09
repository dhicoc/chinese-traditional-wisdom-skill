# 八字排盘引擎集成指南

> 八字的确定性数据必须由本地引擎产生；模型仅解释结果。

## 本地直调

```bash
cd apps/visual && pnpm engine bazi_calculate <input-json-file>
```

实现：`apps/visual/src/legacy/baziEngine.ts`；统一输出 `ToolEnvelope`。`lunar-javascript` 可提供 `local-exact` 节气干支；无法使用精确历法时，结果必须标识为 `local-approx`。

## 真太阳时默认预处理

民用出生时间不能直接称为真太阳时。固定流程如下：

1. 外部核验出生地点经度、IANA 时区、出生当日 UTC 偏移、夏令时和 `utcOffsetEvidence`。
2. 运行 `resolve_true_solar_time`，取得 `trueSolarBirth` 与 `trueSolarResolution`。
3. 将这两个字段直接传给 `bazi_calculate`。
4. 无法可靠核验时，只能在用户知情下使用民用出生记录，并标注“未完成真太阳时复核”。

模型与 Dashboard 都不得猜测地点、历史时区、夏令时或均时差。

## 输入

| 字段 | 说明 |
|---|---|
| year/month/day/hour/minute | 公历出生时间；时分边界必须准确 |
| gender | 男或女 |
| trueSolarBirth / trueSolarResolution | 已完成外部核验时使用 |

## 输出与校验

结果包含四柱、十神、五行、大运、神煞及警告。最终呈现确定性字段前，只从本次 `ToolEnvelope.data` 组织结构化 claims，并调用本地 `validateBaziClaims(data, claims)`（以实际导出函数为准）。校验不覆盖格局解释、用神建议、健康含义或其他自由文本。

## 解读边界

- 四柱、干支、五行计数和大运等事实必须逐项来自引擎。
- 格局、性格、事业、婚恋和健康相关文本均为传统文化解释，须与事实分开书写。
- 健康内容不能构成诊断或治疗建议；遵守 `RULES.md`。
