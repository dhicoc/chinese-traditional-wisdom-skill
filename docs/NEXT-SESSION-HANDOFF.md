# 下一会话交接

> 更新时间：2026-08-20
> 分支：`main`
> 状态：P0 已收口；P1-01、P1-03 已完成；P1-02 按产品决定不实施。下一项为 P1-04：完整 Tool Descriptor Registry。

## 新会话恢复步骤

请先阅读：

1. `AGENTS.md`
2. `docs/IMPLEMENTATION-PLAN.md`
3. `SKILL.md`
4. `RULES.md`
5. `tool-index.md`

然后查看：

```bash
git status --short
git diff -- docs/IMPLEMENTATION-PLAN.md docs/NEXT-SESSION-HANDOFF.md AGENTS.md ROADMAP.md
```

## 已完成的工作

- 盘点了 Agent Skill、32 个 CLI 工具、24 个 Dashboard 工作区、知识库、报告和测试体系。
- 追踪了 `run-engine.ts → toolContracts.ts → directRunner.ts → Engine → ToolEnvelope`。
- 追踪了 Dashboard 的 `workspaceRegistry → engine-api → Engine`。
- 审阅了 claims verifier、真太阳时、隐私历史、报告层、搜索、古籍阅读和大数据资源。
- 验证了 Skill frontmatter。
- 形成了 `docs/IMPLEMENTATION-PLAN.md`。

## 关键结论

优先级最高的四个问题：

1. Skill 要求 Agent 调用 `validate*Claims()`，但目前没有公开 claims 校验 CLI，Agent 链路没有真正闭环。
2. 健康、风水和部分引擎文案仍存在“易患脏腑”“主灾病”“大凶”“催旺财运”等与安全规则冲突的表达。
3. `reportLayers.ts` 从自由文本关键词推断吉凶和行动类别，可能出现“风险很高→吉”“相冲→吉”等误判。
4. `scripts/setup.sh/.bat` 仍把旧 Python 近似算法放在 Quick Start，与当前 TypeScript 权威链路冲突。

第二优先级：

- 静态模块状态与本次实际 exact/approx/fallback 混合；
- CLI 部分工具隐式读取系统年份；
- `legacy/` 仍被 features/components 直接导入；
- 古籍搜索主要搜元数据，阅读器只内嵌《八宅明镜》；
- 缺少知识 frontmatter、第三方许可证清单和完整 provenance；
- 字义与解梦资源体积较大。

## 已验证基线

- `pnpm typecheck`：通过。
- `pnpm test:unit`：59 文件、686 测试通过。
- React smoke：225 通过。
- 文档契约：288 通过。
- Knowledge references：39 通过。
- Mapping schema：506 通过。
- React migration：62 通过。
- Search index：55 通过。
- `pnpm build`：通过。
- Chromium E2E smoke 未执行成功，因为本机缺 Playwright Chromium binary；不是产品断言失败。

## 推荐下一任务

执行 `CTW-P0-01` 的最小垂直切片：

1. 增加 `engine:list`；
2. 增加 `engine:describe bazi_calculate`；
3. 增加 `engine:verify bazi_calculate`；
4. 加入单元和 CLI 集成测试；
5. 更新 `SKILL.md` 和 `tool-index.md`；
6. 运行全量质量门。

不要一开始重构全部 32 个工具；先让八字单工具端到端闭环，再扩展飞星与黄历。

## 不可破坏的架构边界

- Agent/CLI 使用输入契约和 `runLocalTool()`；Dashboard 直接调用纯引擎。
- 模型不能自行排盘或补算。
- claims 不能验证自由文本、预测、建议或现实效果。
- 真太阳时必须有可信外部证据；否则明确民用时间降级。
- 不引入远程账户、服务端状态、持久 token 或远程计算。
- Python 只用于离线交叉验证。
- 不在日志、历史或报告中保存完整生辰、地点、姓名和原始问题。

## 当前文档改动

预期新增/修改：

- `AGENTS.md`
- `docs/IMPLEMENTATION-PLAN.md`
- `docs/NEXT-SESSION-HANDOFF.md`
- `ROADMAP.md`（增加实施入口链接）

当前没有生产代码修改。
## 2026-08-20 阶段记录

### CTW-P0-01 ✅

- 交付 `engine:list`、八字 `engine:describe`、`engine:verify`、`engine:present`。
- 本地 CI：60 个测试文件、693 个测试通过；225 React smoke、288 文档契约、39 知识引用、506 映射 schema、62 React migration、55 搜索契约均通过；生产构建通过。
- 浏览器：首轮完整矩阵 425/428；3 个 WebKit/Mobile Safari 超时用例随后单线程复跑全部通过。命令面板用例改为稳定的键盘确认路径，Playwright 全局使用 `reducedMotion: reduce`。
- Playwright 浏览器目录固定为 `D:\Caches\ms-playwright`。
### CTW-P0-02 ✅

- Skill 触发已限定为用户明确请求传统文化、古籍或传统计算；普通医疗、法律、财务、心理和一般人生建议不自动术数化。
- Dashboard 路由新增 `routeKind`、`missingInputs`、`riskNotices`，确认面板显示文化知识/本地计算/高风险边界。
- 新增古典思想、急性健康、投资保证、第三人授权和缺失生辰确认测试。
- 本地 CI：60 个测试文件、698 个测试通过；全部文档/知识/构建门禁通过。
- E2E：四浏览器导航套件 69/72 并发通过；3 个 WebKit 启动超时在单线程完整 WebKit 套件中 18/18 通过，新增加的两个场景在四浏览器均通过。

### CTW-P0-03 ⏭️

- 2026-08-20 产品决定不实施。理由：已有全局免责声明，无需继续细化安全词典、模板和用户可见文案扫描。
### CTW-P0-04 ✅

- 根 `package.json` 统一提供 dev/build/typecheck/test/E2E/engine 入口并锁定 Node 24.12.x、pnpm 10.26.1。
- `setup.sh` / `setup.bat` 默认同时安装 Python 离线 oracle 与 TypeScript 权威运行时，并以 typecheck + engine:list 验证 TypeScript 就绪。
- Python Quick Start 已移除，新增 `scripts/README.md` 明确 Python 不得替代 ToolEnvelope。
- 文档契约从 288 增至 297 项，覆盖根入口和双运行时安装边界。
- 本地 CI：698 单测、225 React smoke、297 文档契约、生产构建通过。
- E2E：指定 `D:\Caches\ms-playwright`，四项目 smoke 32/32 通过。
### P1-01 类型化语义 ✅

- `reportLayers.ts` 新增 `TypedSemanticPresentation`；`toUserPresentation` 在提供 typed contract 时不再从 summary/body 关键词反推 tone 或 actions。
- 八字 Dashboard 已接入显式 neutral tone、类型化 highlights/details/actions/limitations/disclaimers。
- 新增反例测试：文本含“风险很高”“相冲”等词时，显式 tone 仍保持 `中`。
- 本地 CI：60 个测试文件、699 项测试、225 React smoke、297 文档契约、生产构建通过。
- E2E：语义报告与八字动态层四浏览器 16/16 通过。
- 完成：所有 `toUserPresentation` 生产调用默认转换为 typed neutral；飞星/黄历确认不使用文本推断；`toFourLayer` 和 `toFocusedReport` 仅保留为显式 legacy API。
- 验证：702 项单测、225 React smoke、299 文档契约、生产构建通过；完整 E2E 432/436，并发超时的 4 项单线程复跑全部通过。

### P1-02 ⏭️

- 2026-08-20 产品决定不实施能力状态四维拆分；保留现有 ModuleStatus、Dashboard 标签、报告元数据和历史 Schema。
### P1-03 显式 CLI 时间 ✅

- `calc_feixing.year`、`calc_bazhai.year`、`combo_annual_fortune.targetYear/currentMonth`、`combo_space_time.targetYear` 现为公共 CLI 必填字段。
- Dashboard 继续提供当前日期便利，但在 UI 层解析后显式传入纯引擎。
- 4 个工具的 Agent describe schema、boundary/failure fixture 与 input_normalized 回归已同步。
- 本地 CI：706 项单测、225 React smoke、300 文档契约、全部知识检查和生产构建通过。
- E2E：飞星、八宅、联合高频咨询四浏览器 20/20 通过。
