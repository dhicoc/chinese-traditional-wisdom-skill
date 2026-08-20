# tool-index.md — 本地引擎与直调索引

## 直调入口

所有确定性计算通过本地 CLI 执行：

```bash
cd apps/visual && pnpm engine <tool> <input-json-file>
```

实现位置：`apps/visual/scripts/run-engine.ts`。CLI 读取 JSON 输入并调用 `src/legacy/directRunner.ts`；除 `resolve_true_solar_time` 直接输出 `TrueSolarTimeResolution` 外，输出一个 JSON `ToolEnvelope`。没有可复核的本地输出时，AI 不得自行推演。

### Agent 自描述与校验入口

```bash
cd apps/visual
pnpm engine:list
pnpm engine:describe bazi_calculate
pnpm engine:verify bazi_calculate <envelope-json-file> <claims-json-file>
pnpm engine:present bazi_calculate <input-json-file>
```

- `engine:list` 输出 32 个工具的类别、结果类型、claims verifier 类型和风险域。
- `engine:describe` 输出单个工具的 schema 版本、标准 fixture、可用 claim kinds 与限制；当前八字提供完整 JSON Schema，其余工具在 registry 迁移期间保留契约说明和 fixture 路径。
- `engine:verify` 对 registry 中 `claimVerifier` 非 `none` 的工具公开可用，覆盖八字、紫微、飞星、八宅、历法、占测、日用和已接入的联合分析；会拒绝篡改 claim、跨工具 claim 和错误来源的 envelope。无 verifier 的预处理、问卷清单和部分联合工具会明确返回 `UNSUPPORTED_INPUT`。
- `engine:present` 当前公开支持 `bazi_calculate`，输出已核验事实、传统解释、限制、免责声明和 provenance，不输出 `input_normalized`。
- 原有 `pnpm engine <tool> <input-json-file>` 与 stdin 行为保持不变。

`apps/visual/src/legacy/localToolRegistry.ts` 是完整工具定义单一来源：每个工具声明必填输入键、类别、结果类型、实际 `resultToolId`、claims verifier、风险域和 presenter。`LOCAL_TOOL_NAMES`、Agent introspection、Runner 穷尽绑定、公开 verifier、fixture 路径和文档检查均由该定义或其键集合派生；新增工具遗漏任一绑定会在 TypeScript 或契约测试中失败。

公开输入 fixture 位于 `apps/visual/src/__fixtures__/local-tools/`。每个本地工具都有 `.success.json` 可执行示例；它同时是 CLI 回归的标准成功输入。每个工具也有 `.boundary.json` 与 `.failure.json`，分别覆盖业务边界和必须被 CLI 契约拒绝的输入。工具名、三类 fixture 与 CLI 工具表由 `apps/visual/src/legacy/localToolRegistry.ts` 的 `LOCAL_TOOL_REGISTRY` / `LOCAL_TOOL_NAMES` 统一派生，文档检查会阻止任何遗漏。

从 stdin 调用时，将同一 JSON 内容传给 `-`：

```bash
cd apps/visual && pnpm engine bazi_calculate - < src/__fixtures__/local-tools/bazi_calculate.success.json
```

`resolve_true_solar_time` 是预处理工具：输入为已核验的 `birth` 和 `location`，输出 `TrueSolarTimeResolution` 的 `trueSolarBirth` 与证据明细，供后续八字 CLI 调用传入；它不使用 `ToolEnvelope.data`。

### 真太阳时固定 fixture 矩阵

以下固定输入将已核验校正与无法核验时的民用时间 fallback 分开覆盖。除最后一项外，均以 `resolve_true_solar_time` 输出 `TrueSolarTimeResolution`；民用 fallback 不伪造该 resolution，而由 `bazi_calculate` 明确披露时间来源。

| 场景 | fixture | 固定验收语义 |
|---|---|---|
| 已核验标准校正 | `resolve_true_solar_time.success.json` | 纽约经度、IANA 时区和夏令时 UTC 偏移经证据核验，输出 `trueSolarBirth`。 |
| 跨日期 | `resolve_true_solar_time.cross-date.success.json` | 校正后为 1990-06-14 12:10，`crossedDate: true`。 |
| 跨时辰与子初 | `resolve_true_solar_time.shichen-zi-chu.success.json` | 校正后为 23:05，`crossedShichen: true` 且 `crossedZiChu: true`。 |
| 无证据民用 fallback | `bazi_calculate.civil-fallback.success.json` | 使用 `timeBasis: "civil-unverified"` 与 `civilFallbackConfirmed: true`，结果必须标记“未完成真太阳时复核”。 |

可用如下方式执行任一真太阳时 fixture：

```bash
cd apps/visual && pnpm engine resolve_true_solar_time src/__fixtures__/local-tools/resolve_true_solar_time.cross-date.success.json
```

民用 fallback 通过八字入口执行：

```bash
cd apps/visual && pnpm engine bazi_calculate src/__fixtures__/local-tools/bazi_calculate.civil-fallback.success.json
```

### 八字动态层 fixture

`bazi_calculate` 可选接收严格格式的 `transitDate: "YYYY-MM-DD"`。需要查询指定日期的大运、小运、流年、流月或流日时，运行：

```bash
cd apps/visual && pnpm engine bazi_calculate - < src/__fixtures__/local-tools/bazi_calculate.transit.success.json
```

结果仍为 `ToolEnvelope`，动态事实位于 `data.transit`。`bazi_calculate.transit.boundary.json` 覆盖节气边界，`bazi_calculate.transit.failure.json` 用于确认非法日期会被 CLI 契约拒绝。详细字段、claims 和解释边界见 `bootstrap/bazi-engine.md`。

## 显式时间输入

公共 CLI 不读取系统当前年份来补全结果。以下字段必须显式提供：

- `calc_feixing.year`；
- `calc_bazhai.year`；
- `combo_annual_fortune.targetYear` 与 `currentMonth`；
- `combo_space_time.targetYear`。

Dashboard 可以读取设备当前日期以便操作，但必须在调用纯引擎前转换为显式字段。`get_almanac.date`、`get_daily_rhythm.date/hour`、`combo_daily_wellness.now` 和其他日用日期字段同样由现有输入契约显式校验。所有最终采用的日期或年份必须出现在 `input_normalized`，不得在 Agent 层猜测。

## CLI 错误语义

CLI 成功时仍只在 stdout 输出 `ToolEnvelope` 或 `TrueSolarTimeResolution`。读取输入、JSON 解析、工具名或输入契约失败时，stdout 为空、进程以 `1` 退出，并在 stderr 输出以下稳定 JSON：

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_INPUT",
    "tool": "calc_chenguz",
    "message": "version 必须是 standard、folk 或 full。"
  }
}
```

`code` 可为 `INVALID_JSON`、`INPUT_READ_FAILURE`、`UNKNOWN_TOOL`、`INVALID_INPUT` 或 `ENGINE_FAILURE`。其中 `ToolEnvelope` 内的 `ok: false` 是工具的正常业务结果，不是 CLI 异常，CLI 仍以 `0` 退出并原样输出该 envelope。

## 统一 provenance 与隐私安全结果包

所有 `runLocalTool()` 结果（含真太阳时预处理）都附带 `provenance`：工具与实际 result ID、工具/规则版本、锁定依赖版本、实际 calculationConfig、脱敏 input fingerprint、稳定引用 ID 和限制说明。`inputFingerprint` 与 bundle `integrity` 使用 canonical JSON + FNV-1a 32 位，只用于本地一致性和意外篡改检测，不是密码学签名。

```bash
cd apps/visual
pnpm engine:bundle bazi_calculate <input-json-file> [claims-json-file]
pnpm engine:bundle:verify <bundle-json-file>
```

结果包默认 `inputIncluded: false`、`replayable: false`，不包含 `input_normalized`、完整生辰、地点、姓名或原始问题。提供 claims 时只收录本次 verifier 全部通过的脱敏结构化 facts；任何篡改 claim 都会阻止生成。若需要重新计算，用户仍须在本地重新提供原始输入，当前版本不把原始输入写入结果包。

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

## 32 个本地 CLI 工具与标准输入

每行均可按以下形式直接执行：

```bash
cd apps/visual && pnpm engine <tool> <fixture>
```

| 工具 | 标准成功输入 fixture | 类别 |
|---|---|---|
| `resolve_true_solar_time` | `src/__fixtures__/local-tools/resolve_true_solar_time.success.json` | 时间校准 |
| `bazi_calculate` | `src/__fixtures__/local-tools/bazi_calculate.success.json` | 排盘 |
| `ziwei_chart` | `src/__fixtures__/local-tools/ziwei_chart.success.json` | 排盘 |
| `calc_feixing` | `src/__fixtures__/local-tools/calc_feixing.success.json` | 风水 |
| `calc_bazhai` | `src/__fixtures__/local-tools/calc_bazhai.success.json` | 风水 |
| `cast_liuyao` | `src/__fixtures__/local-tools/cast_liuyao.success.json` | 占测 |
| `arrange_qimen` | `src/__fixtures__/local-tools/arrange_qimen.success.json` | 占测 |
| `liuren_calculate` | `src/__fixtures__/local-tools/liuren_calculate.success.json` | 占测 |
| `taiyi_calculate` | `src/__fixtures__/local-tools/taiyi_calculate.success.json` | 占测 |
| `cast_meihua` | `src/__fixtures__/local-tools/cast_meihua.success.json` | 占测 |
| `xingxiu_daily` | `src/__fixtures__/local-tools/xingxiu_daily.success.json` | 日用 |
| `calc_yunqi` | `src/__fixtures__/local-tools/calc_yunqi.success.json` | 日用 |
| `calc_chenguz` | `src/__fixtures__/local-tools/calc_chenguz.success.json` | 日用 |
| `get_almanac` | `src/__fixtures__/local-tools/get_almanac.success.json` | 日用 |
| `get_daily_rhythm` | `src/__fixtures__/local-tools/get_daily_rhythm.success.json` | 日用 |
| `calc_xiyong` | `src/__fixtures__/local-tools/calc_xiyong.success.json` | 解读 |
| `dream_interpret` | `src/__fixtures__/local-tools/dream_interpret.success.json` | 解读 |
| `analyze_name` | `src/__fixtures__/local-tools/analyze_name.success.json` | 姓名 |
| `cast_cezi` | `src/__fixtures__/local-tools/cast_cezi.success.json` | 测字 |
| `huangji_calculate` | `src/__fixtures__/local-tools/huangji_calculate.success.json` | 排盘 |
| `get_constitution_tendency` | `src/__fixtures__/local-tools/get_constitution_tendency.success.json` | 体质 |
| `list_constitution_questionnaire` | `src/__fixtures__/local-tools/list_constitution_questionnaire.success.json` | 体质 |
| `assess_constitution` | `src/__fixtures__/local-tools/assess_constitution.success.json` | 体质 |
| `combo_annual_fortune` | `src/__fixtures__/local-tools/combo_annual_fortune.success.json` | 联合分析 |
| `combo_monthly_fortune` | `src/__fixtures__/local-tools/combo_monthly_fortune.success.json` | 联合分析 |
| `combo_daily_wellness` | `src/__fixtures__/local-tools/combo_daily_wellness.success.json` | 联合分析 |
| `combo_decision` | `src/__fixtures__/local-tools/combo_decision.success.json` | 联合分析 |
| `combo_space_time` | `src/__fixtures__/local-tools/combo_space_time.success.json` | 联合分析 |
| `combo_sanshi` | `src/__fixtures__/local-tools/combo_sanshi.success.json` | 联合分析 |
| `combo_sanshi_classic` | `src/__fixtures__/local-tools/combo_sanshi_classic.success.json` | 联合分析 |
| `combo_zeri` | `src/__fixtures__/local-tools/combo_zeri.success.json` | 联合分析 |
| `combo_marriage` | `src/__fixtures__/local-tools/combo_marriage.success.json` | 联合分析 |

该表由 `apps/visual/scripts/check-doc-contracts.mjs` 校验：工具契约清单、Runner 分发、文档条目和 success fixture 必须一一对应。

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
