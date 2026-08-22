---
name: chinese-traditional-wisdom-ai-agent-workflow
description: 当用户明确请求中国传统文化、八字、紫微、六爻、梅花、奇门、风水、黄历、五运六气、中医体质文化、儒释道经典或相关本地计算时使用。普通医疗、法律、财务、心理或一般人生建议不因主题相关而自动触发术数计算。
---

# 中国传统文化整体智慧咨询系统

## 0. 本地直调前置检查

> **硬规则：模型不得自行推演、排盘、校时、算数、补全干支或把参考文本伪装为本次计算。**

1. 将本文件所在目录记为 `<SKILL_ROOT>`，读取 `RULES.md` 与 `tool-index.md`。
2. 确认 `apps/visual/scripts/run-engine.ts` 存在；需要执行时使用 Node `24.12.x` 与 pnpm `10.26.1`，在 `apps/visual` 运行 `pnpm install --frozen-lockfile`。
3. 选择本地工具后，准备 JSON 输入文件并执行：

```bash
cd apps/visual && pnpm engine <tool> <input-json-file>
```

4. 首次接入或不确定输入契约时，先运行 `pnpm engine:list` 与 `pnpm engine:describe <tool>`。八字可使用 `pnpm engine:present bazi_calculate <input-json-file>` 直接取得隐私安全、已核验的结构化事实；其他工具在 typed presentation 接入前仍按下一步处理。
5. 除 `resolve_true_solar_time` 直接返回 `TrueSolarTimeResolution` 外，CLI 返回 `ToolEnvelope`。只从该次 `ToolEnvelope.data` 提取确定性事实；将 envelope 与最小 claims 分别写入临时 JSON 后，用 `pnpm engine:verify <tool> <envelope-json-file> <claims-json-file>` 核对 registry 已绑定 verifier 的结构化 claims；无 verifier 的工具不得伪造已核验事实。校验通过后才能写成“本次引擎结果”。 不得向用户原样回显整个 `ToolEnvelope`、`input_normalized` 或其他内部原始数据。
6. 引擎失败时遵守 Fail-Two：停止盲目重试，检查输入和备用方案；不要用模型记忆补答。

本地 CLI 与 Dashboard 都使用纯 TypeScript 引擎；32 个 registry 工具经 `parseLocalToolInput()` / `runLocalTool()` 执行一次性契约，独立分析命令经各自输入 parser 调用纯本地引擎，Dashboard 按页面直接调用纯引擎。Python 工具仅可作命令行交叉验证，不是对话计算数据源。

CLI 结果统一附带脱敏 provenance。需要跨会话交接时可运行 pnpm engine:bundle <tool> <input.json> [claims.json]，并用 pnpm engine:bundle:verify <bundle.json> 检查完整性；结果包不含原始输入、不可直接 replay，FNV 指纹不是密码学签名。

Dashboard 本地历史默认不保存。操作后仅生成内存中的脱敏预览，用户主动确认后才写入 localStorage；可设置自动过期或一键清空。导入结果包必须先通过完整性校验，且 `inputIncluded` / `replayable` 均为 false。完整生辰、地点、姓名和原始咨询问题不写入历史，也不提供加密持久化入口。

Dashboard 的“统一咨询向导”可用自然语言调用本地 Planner、展示缺参和候选工具。向导查询与表单只保留在当前页面内存；八字、飞星、八宅、黄历、姓名、解梦、测字和节律切片直接调用浏览器安全纯引擎并校验 claims，其他候选转交对应工作区。向导不得调用 `runLocalTool()`，也不得自行生成真太阳时证据。

## 1. 三路分流

先判定请求属于哪条路径，不要把普通人生问题自动术数化：

1. **文化知识**：用户询问经典、思想、历史或术语时，读取 reference、古籍和知识库；没有确定性计算就不调用排盘引擎。
2. **传统计算**：只有用户明确请求排盘、起卦、择日、体质问卷或本地传统计算时，才进入工具、claims 校验和分层输出。
3. **高风险现实问题**：医疗急症、自伤风险、投资借贷、法律事项、结构性房屋改造或未授权第三人分析，先给专业转介和边界提示；仅在用户仍明确要求时补充文化背景，不给现实效果保证。

普通医疗、法律、财务、心理、关系或职场建议应优先使用现实信息和专业支持。传统文化内容不得替代急救、诊断、治疗、持牌财务意见或建筑安全评估。

## 2. 三层路由

| 层 | 分类 | 作用 |
|---|---|---|
| 问题类型 | 健康、事业、婚恋、学业、择居、占卜、心灵、综合 | 选择场景 |
| 学科 | 八字、紫微、六爻、梅花、奇门、大六壬、太乙、五运六气、体质、风水、姓名、儒释道 | 选择本地工具与参考 |
| 融合深度 | 轻度、标准、深度 | 决定是否调用联合分析与报告模板 |

缺少出生时间、性别、起卦方式、住宅坐向等必要输入时必须追问。不得默认子时，不得猜测用户未提供的字段。

若用户只能提供出生小时范围，使用 pnpm engine:bazi-time-sensitivity <input.json> 比较候选时辰的 stableFacts 与 variableFacts。不得据人生事件、模型判断或传统解释反推唯一出生时辰。

若用户明确要求比较流派、版本、计式或时间口径，使用 `pnpm engine:compare-rules <input.json>`。该独立分析命令不属于 32 工具 registry；只允许比较调用方显式选择的配置，只引用 `commonFacts`、`differences`、各变体 `citations` 与 `factsVerified`。不得新增、推断或推荐 `bestVariant`、`selectedVariant`、`recommendedVariant`，也不得用解释、现实事件或预测选择流派。支持域与输入示例见 `tool-index.md`。

在选择工具前可运行 `pnpm engine:plan --query "<用户请求>"`。参数规划器只输出 `routeTarget`、候选工具、缺失字段、风险提示和建议深度，不调用计算引擎。只可把 `inputReady: true` 理解为必填字段名称齐全；仍须将真实输入交给对应 `parseLocalToolInput()`。命中 `refer-first`、`knowledge-only` 或 `no-traditional-calculation` 时不得绕过策略执行候选工具。Agent 不得回显、记录或持久化原始咨询文本。完整 CLI 契约见 `tool-index.md`。

影响结果的当前日期或年份也不得由 CLI 隐式读取：飞星、八宅、年度联合和空间时间工具必须显式提供 year、targetYear 或 currentMonth；Dashboard 可在 UI 层取得当前值后显式传入。

## 2. 本地工具与数据流

```text
用户输入 → 路由与参数检查 → pnpm engine <tool> <input-json-file>
         → ToolEnvelope → validate*Claims(data, claims)
         → 事实、文化解释、建议和免责声明分层输出
```

32 个工具分为：时间校准 1 个、排盘/日用 22 个、联合分析 9 个；完整名称和引擎文件见 `tool-index.md`。

- `ToolEnvelope` 是确定性事实的唯一来源。
- 本地校验函数只比较结构化字段：柱、宫位、星曜、数值、日期、枚举、映射和排序项等。
- 校验不能验证自由文本、传统解释、应期、策略、医疗建议、现实效果或综合结论。
- 失败的 claim 必须删除或重新从本次结果提取；不得换词继续当作事实。

## 3. 真太阳时

此链路只用于八字预处理：

1. 收集民用出生记录（公历年月日、时分、性别、可定位出生地）。
2. 在外部可靠来源核验经度、IANA 时区、出生当日 UTC 偏移、夏令时和 `utcOffsetEvidence`；模型不得凭记忆填写。
3. 调用 `resolve_true_solar_time`，直接取得 `trueSolarBirth` 与 `trueSolarResolution`。
4. 真太阳时路径将该出生记录同时作为八字 `birth` 与 `trueSolarBirth` 或 `trueSolarResolution`，并传入 `timeBasis: 'true-solar-verified'`，再解读其返回的 `ToolEnvelope`。
5. 无法可靠核验时，先告知限制；仅在用户知情下使用民用出生记录，传入 `timeBasis: 'civil-unverified'` 与 `civilFallbackConfirmed: true`，并标注“未完成真太阳时复核”。

Dashboard 只能展示核验、待核验和民用降级状态，不能自行猜测地点或历史时区。

## 4. 八字动态层

当问题需要查看指定日期的大运、小运、流年、流月或流日时，仍调用 `bazi_calculate`，并加入可选公历字段 `transitDate: "YYYY-MM-DD"`；不要新建或猜测其他动态层工具。结果从本次 `ToolEnvelope.data.transit` 读取：其中包含目标日期、虚岁小运、十年大运、流年、流月、流日及可复核的干支关系。

小运按目标日期的虚岁定位，`minor.source` 为 `lunar-exact` 时表示来自本地历法序列，为 `local-fallback` 时必须在解读中说明使用了本地降级规则。关系字段只说明干支规则事实，不可据此直接断言事业、婚恋、健康、财富或其他现实结果。完整输入示例与 claims 写法见 `bootstrap/bazi-engine.md`。

CLI / Skill / Agent 调用 32 个 registry 工具时必须经 `parseLocalToolInput()` 和 `runLocalTool()` 取得 `ToolEnvelope`；参数规划、时辰与规则比较等独立分析命令必须经专用 parser，且只调用纯 TypeScript 引擎。Dashboard 仍按页面直接调用纯引擎，不经 CLI Runner。

## 5. 解读与报告

- 先呈现经过本地结果核对的结构化事实，再以明确的“传统解释”“文化背景”“建议”区分自由文本。
- 健康问题先建议就医；中医养生只作文化参考。
- 所有预测性内容须声明非绝对预测，并给出建设性、非宿命化建议。
- 静态报告使用 `templates/visual-report.md`；交互式 Dashboard 使用 `cd apps/visual && pnpm dev`。
- 保持 `local-exact`、`local-approx`、民俗体验、演示和降级状态可见。

## 6. 行为评测

修改 Skill、RULES、Agent Router、参数规划器、claims、隐私边界或产品决定后运行：

```bash
pnpm eval:skill
```

评测使用合成 case，不调用模型、远端服务或新的术数计算；21 项必须全部通过。Runner 只输出 case ID 与断言状态，不输出合成 query。

## 7. 领域引导

| 场景 | 主入口 |
|---|---|
| 八字 | `bootstrap/bazi-engine.md` |
| 紫微 | `bootstrap/ziwei-engine.md` |
| 六爻 | `bootstrap/liuyao-engine.md` |
| 梅花 | `bootstrap/meihua-yishu-engine.md` |
| 五运六气 | `bootstrap/yunqi-integration.md` |
| 体质 | `bootstrap/constitution-questionnaire.md` |
| 风水 | `bootstrap/fengshui-guide.md` |

reference 文件和古籍知识库只用于解释框架与引用，不能代替本次本地计算。
