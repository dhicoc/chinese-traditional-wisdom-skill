# 五运六气集成指南

> 岁运、司天、在泉、客气与结构化体质倾向必须由本地引擎计算。

## 本地直调

```bash
cd apps/visual && pnpm engine calc_yunqi <input-json-file>
```

实现：`apps/visual/src/legacy/yunqiEngine.ts`。传入精确 Solar 时使用大寒定年等 `local-exact` 路径；未传入时使用 `local-approx`，必须在结果中保留模式标记。

## 输入

| 字段 | 说明 |
|---|---|
| year | 目标年份 |
| birthMonth / birthDay | 需要体质关联时使用 |
| currentMonth | 需要当前步气时使用 |
| solar | 可选精确历法输入 |

## 输出与校验

`ToolEnvelope.data` 可包含年度干支、岁运、司天、在泉、客气步骤、客主加临和体质倾向。呈现这些基础事实前，使用本地 `validateCalendarClaims(data, claims)` 或相应日用校验函数核对结构化 claims。

置信说明、传统病机解释、调养、饮食、穴位和医疗建议不属于 claims；通过校验也不代表医疗安全性或现实疗效。

## 安全边界

五运六气与体质内容仅供传统文化和日常参考。出现症状时必须优先建议就医。外部 Python 或 API 可作交叉验证，不替代当前本地 Engine/CLI 输出。
