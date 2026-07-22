# 代码修改总结

> 覆盖区间：P1 清理 → nameWuxing 字典削峰 → 八字神煞体系（新功能）→ e2e 重复 key 修复
> 项目：`chinese-traditional-wisdom-skill` / `apps/visual`（React Dashboard）+ `apps/mcp-server`（MCP Server）
> 日期：2026-07-19 ~ 2026-07-21

---

## 一、P1 阶段清理（前序轮次）

| 项 | 内容 | 状态 |
|----|------|------|
| 任务1 | 移除根 `package.json` 死依赖 `bazi-ziwei-skill` | ✅ 已完成并验证 |
| 任务2 | `apps/mcp-server` 工具数注释对齐 19 → 实际 25 + 2 | ✅ 已完成并验证 |
| 任务3 | 类型碎片统一 | 调研后判定无可安全合并项，**未改代码** |

---

## 二、nameWuxing 字典削峰（方案 A）

**目标**：将 2.13MB 字典（charMeanings.json 1.69MB + kangxiStrokes.json 0.55MB）从静态打包改为按需懒加载，**不影响五维评分**（评分只依赖 kangxiStrokes 的 `{k,w}`，与 charMeanings 字义文本零关系）。

| 文件 | 改动 |
|------|------|
| `apps/visual/src/legacy/charMeanings.ts` | **新建**。包装 `charMeanings.json`，规避 tsx 直接 import JSON 的 assertion 坑 |
| `apps/visual/src/legacy/nameStrokes.ts` | `getCharMeaning` 改 async，经 `await import('./charMeanings')` + 模块级缓存实现动态按需加载 |
| `apps/visual/src/legacy/nameWuxing.ts` | `parseChars` / `analyzeName` 改 async（内部加 `await`） |
| `apps/visual/src/legacy/envelopeAdapters.ts` | `calcNameRatingEnveloped` 改 async |
| `apps/visual/src/legacy/ceziEngine.ts` | `calcCezi` / `calcCeziEnveloped` 改 async；`getCharMeaning` 调用加 `await` |
| `apps/visual/src/legacy/marriageCombo.ts` | `calcMarriageCombo` 改 async；两处 `calcNameRatingEnveloped` 加 `await` |
| `apps/visual/src/features/namewuxing/NamewuxingWorkspace.tsx` | `handleAnalyze` 改 async |
| `apps/visual/src/features/cezi/CeziWorkspace.tsx` | `useMemo` → `useEffect` + `useState`（含 cancelled flag 防竞态） |
| `apps/visual/src/features/combo/ComboWorkspace.tsx` | 同上适配异步计算 |
| `apps/mcp-server/src/index.ts` | `tool.handler(input)` → `await tool.handler(input)`（避免 async handler 被 stringify 成 `{}`） |
| `apps/mcp-server/src/tools.test.ts` | 测试调用加 `await`，`it` 回调改 async |
| `apps/visual/src/__tests__/ceziEngine.test.ts` `envelope.test.ts` `marriageCombo.test.ts` | 各引擎调用加 `await`，`it` 回调改 async |
| `apps/visual/src/__tests__/commandIntents.test.ts` | **修复预存在回归**：加 `beforeEach` 还原 `window.HistoryStore` + `localStorage.clear()` |

**验证**：`typecheck` 0 错；`vitest` 325/325；`apps/mcp-server` vitest 80/80；e2e 142/142 全绿。

---

## 三、八字神煞体系（新功能播种）

**目标**：在八字主线补充 ROADMAP 点名的「神煞」维度，纯干支规则、零外部依赖、可见增量最高。

| 文件 | 改动 |
|------|------|
| `apps/visual/src/legacy/shensha.ts` | **新建**。`calcShenSha(pillars)` 覆盖 10 类神煞：天乙贵人、文昌贵人、禄神、羊刃、桃花(咸池)、驿马、华盖、将星、月德贵人、魁罡。输出 `ShenShaItem[]{ name, category, branch, pillar, meaning }`，自动标注所在宫位 |
| `apps/visual/src/legacy/baziEngine.ts` | `BaziResult` 加 `shenSha` 字段；`buildResultFromPillars` 内调用 `calcShenSha`；`calcBaziEnveloped` 的 `export_snapshot.sections` 新增「神煞」一节（经 `{...result}` 展开，MCP 端自动带上，**无需改 MCP server**） |
| `apps/visual/src/features/bazi/BaziWorkspace.tsx` | 复用 `InterpretationCard` 在左侧栏加「神煞」卡片（名称 + 地支·宫位 + 释义，badge 显示项数）；本地 `BaziResult` 接口补 `shenSha` 字段并 import 类型 |
| `apps/visual/src/__tests__/baziEngine.test.ts` | 新增神煞确定性用例（甲日干·午日支 fixture：禄神/驿马/将星/月德贵人及所在宫位；魁罡仅特定四日才计）+ envelope 含神煞节断言 |

**边界说明**：神煞定位为文化参考与命理意象，已在卡片副标题与引擎注释写明「不构成绝对吉凶判断」。

**验证**：`tsc -b` 0 错；`baziEngine.test.ts` 13/13（新增 2 项）；**全量单测 327/327 全过**（原 325 + 新增 2）。

---

## 四、e2e 神煞卡片重复 key 修复

**根因**：`InterpretationCard` 列表用 `key={item.label}`。天乙贵人同时落在年柱与日柱 → 同名重复 key → React `console.error`（重复 key 警告），被 e2e「No Console Errors」断言捕获。

| 文件 | 改动 |
|------|------|
| `apps/visual/src/components/shared/InterpretationCard.tsx` | 列表 `key` 从 `item.label` 改为 `${item.label}-${idx}`（对现有所有 label 唯一的调用方零影响，且一劳永逸避免这类重复 key） |

**验证**：
- e2e 首轮（chromium + Mobile Chrome）：140 passed / 2 failed（同源，均为此重复 key）
- 修复后 `canvas-render.spec.ts` 双项目：**22/22 全过**，失败两项转绿
- 全量复跑（本轮）：**142/142 全过 ✅**

---

## 五、本地开发服务器

- `npm run dev` 实际端口为 **5174**（项目 `vite.config` 改过，非默认 5173）
- 已启动供预览，含全部上述改动
- playwright `webServer` 配置 `reuseExistingServer: !process.env.CI` → 非 CI 下复用已起的 5174，无端口冲突

---

## 验证总览

| 维度 | 结果 |
|------|------|
| `tsc` 类型检查 | 0 错 |
| `vitest` 单测（apps/visual） | 327/327 ✅ |
| `vitest`（apps/mcp-server） | 80/80 ✅ |
| e2e 首轮 | 140 passed / 2 failed（已定位修复） |
| `canvas-render.spec.ts`（修复后） | 22/22 ✅ |
| **e2e 全量复跑（本轮）** | **142 passed / 0 failed ✅** |

---

## 修改文件清单（共 17 个）

新建 2：
- `apps/visual/src/legacy/charMeanings.ts`
- `apps/visual/src/legacy/shensha.ts`

修改 15：
- `apps/visual/src/legacy/nameStrokes.ts`
- `apps/visual/src/legacy/nameWuxing.ts`
- `apps/visual/src/legacy/envelopeAdapters.ts`
- `apps/visual/src/legacy/ceziEngine.ts`
- `apps/visual/src/legacy/marriageCombo.ts`
- `apps/visual/src/legacy/baziEngine.ts`
- `apps/visual/src/features/namewuxing/NamewuxingWorkspace.tsx`
- `apps/visual/src/features/cezi/CeziWorkspace.tsx`
- `apps/visual/src/features/combo/ComboWorkspace.tsx`
- `apps/visual/src/features/bazi/BaziWorkspace.tsx`
- `apps/visual/src/components/shared/InterpretationCard.tsx`
- `apps/mcp-server/src/index.ts`
- `apps/mcp-server/src/tools.test.ts`
- `apps/visual/src/__tests__/baziEngine.test.ts`
- （测试类）`ceziEngine.test.ts` / `envelope.test.ts` / `marriageCombo.test.ts` / `commandIntents.test.ts`
