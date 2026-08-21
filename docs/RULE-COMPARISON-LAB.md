# 规则差异实验室实施与调用契约

> 状态：CTW-P3-02 已完成（2026-08-21）
> 权威实现：`apps/visual/src/legacy/ruleComparison.ts`
> 浏览器安全 API：`apps/visual/src/engine-api/ruleComparison.ts`

## 1. 目标与边界

规则差异实验室在**同一份基础输入**上运行调用方明确选择的规则配置，然后只比较结构化事实。它用于回答“两个版本具体哪些字段不同”，不回答“哪个流派更准”。

硬边界：

- 所有排盘、干支、映射与数值由本地 TypeScript 引擎产生，模型不得补算。
- `factsVerified: true` 只表示该变体的结构化 facts 通过现有 `validate*Claims()`；不验证解释、建议、吉凶、应期或现实效果。
- 每个变体必须至少有一个 `citations[]` 规则来源。
- 输出没有 `bestVariant`、`selectedVariant` 或 `recommendedVariant`。
- Python 不参与用户可见计算，只可用于离线交叉验证。
- `engine:compare-rules` 是独立分析命令，不加入 `LOCAL_TOOL_REGISTRY`，工具总数保持 32。

## 2. 运行路径

```text
Agent comparison JSON
  → parseRuleComparisonRequest()
  → runRuleComparison(..., Solar)
  → 显式配置的本地纯引擎
  → validate*Claims()
  → compareStructuredVariants()
  → RuleComparisonResult

Dashboard
  → 用户展开规则差异实验室
  → 动态 import engine-api/ruleComparison
  → 浏览器安全纯引擎（不调用 runLocalTool）
  → RuleComparisonResult
```

比较核心按键名规范化对象；用于集合语义的数组按 canonical JSON 排序后比较。顺序具有业务意义的结构（如四课、三传）先转换为带位置键的对象，避免丢失位置。

## 3. 输出契约

```ts
interface RuleComparisonResult {
  schemaVersion: '1.0.0';
  domain: string;
  variants: Array<{
    id: string;
    label: string;
    config: Record<string, StructuredValue>;
    citations: Array<{ id: string; title: string; source: string; note?: string }>;
    facts: Record<string, StructuredValue>;
    factsVerified: boolean;
    provenance?: ResultProvenance;
  }>;
  commonFacts: Array<{ field: string; label: string; value: StructuredValue }>;
  differences: Array<{
    field: string;
    label: string;
    values: Array<{ variantId: string; label: string; value: StructuredValue }>;
  }>;
  limitations: string[];
}
```

不得把缺失字段当作相同值：某变体未提供的字段会以 `null` 进入 diff。比较结果不包含原始输入；provenance 只保留脱敏输入指纹。

## 4. 支持域

| domain | 显式配置 | 结构化范围 | 校验器 | fixture |
|---|---|---|---|---|
| `bazi-shensha` | `year` / `day` | 四柱、日主、五行计数、强弱、神煞集合 | `validateBaziClaims` | `rule-comparison-bazi.success.json` |
| `chenguz-version` | `standard` / `folk` / `full`，选 2–3 个 | 年月日时骨重、总重、版本 | `validateDailyClaims` | `rule-comparison-chenguz.success.json` |
| `daliuren-school` | `classic` / `gufa` / `daxquan`，选 2–3 个 | 基础历法、天地盘、十二天将、四课、三传 | `validateDivinationClaims` | `rule-comparison-daliuren.success.json` |
| `taiyi-config` | `jiStyle` + `acumYear`，选 2–4 组 | 干支、局式、主客算、太乙/文昌/始击/定目落宫 | `validateDivinationClaims` | `rule-comparison-taiyi.success.json` |
| `bazi-time-basis` | 民用时间 / 已核验真太阳时 | 定盘时间、四柱、五行、神煞与跨边界标记 | `validateBaziClaims` | `rule-comparison-time-basis.success.json` |
| `ziwei-dynamic-scope` | 仅本命 / 本命加目标月动态层 | 本命元、主星、四化、日期锚点、大限/流年/流月/小限 | `validateZiweiClaims` | `rule-comparison-ziwei.success.json` |

称骨歌、六壬断语、太乙格局解释、紫微现实推断等自由文本不进入 diff。

## 5. Agent CLI

从仓库根目录运行：

```bash
pnpm engine:compare-rules src/__fixtures__/analysis/rule-comparison-bazi.success.json
```

从 `apps/visual` 目录运行时使用相对路径：

```bash
pnpm engine:compare-rules src/__fixtures__/analysis/rule-comparison-daliuren.success.json
```

错误均写入 stderr，并以稳定错误结构返回：

```json
{"ok":false,"error":{"code":"INVALID_INPUT","message":"..."}}
```

以下输入会被拒绝：未知 domain、少于两个变体、重复变体、太乙超过四组、非法版本/流派、紫微缺少目标年月、真太阳时证据不完整或复算不一致。

## 6. 真太阳时专门门禁

时间基准比较只接受：

1. 已外部核验经度；
2. IANA 时区；
3. 出生当日 UTC 偏移与夏令时证据；
4. 非空 `utcOffsetEvidence`；
5. `resolveTrueSolarTime()` 本地复算与传入 resolution 完全一致。

Dashboard 未获得 `true-solar-verified` 状态时禁用该页签，并明确显示“不会自行补造地点证据”。民用时间对照不被描述为已核验真太阳时。

## 7. 验收命令

```bash
pnpm typecheck
pnpm test
node apps/visual/scripts/smoke-react-shell.mjs
node apps/visual/scripts/check-doc-contracts.mjs
node apps/visual/scripts/generate-knowledge-manifest.mjs --check
node apps/visual/scripts/check-knowledge-provenance.mjs
node apps/visual/scripts/generate-char-meaning-shards.mjs --check
node apps/visual/scripts/generate-dream-shards.mjs --check
node apps/visual/scripts/generate-knowledge-search-index.mjs --check
node apps/visual/scripts/check-search-index.mjs
node apps/visual/scripts/check-mapping-schema.mjs
node apps/visual/scripts/check-react-migration.mjs
pnpm build
node apps/visual/scripts/check-bundle-budget.mjs
git diff --check
```

四浏览器 E2E：

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='D:\Caches\ms-playwright'
pnpm --dir apps/visual exec playwright test e2e/p13c-bazi-transit.spec.ts --workers=1
```
