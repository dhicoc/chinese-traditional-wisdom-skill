# Skill 全链路真实用户模拟测试报告

> 日期：2026-08-21  
> 被测提交：`6e3b4b5 test(skill): add deterministic behavior evals`  
> 分支：`main`  
> 测试类型：发布级全链路验收、真实用户旅程模拟、跨浏览器回归

## 一句话结论

✅ **建议放行。** Skill 的知识路由、参数规划、Agent CLI、32 个本地工具、claims、呈现、结果包、真太阳时、独立分析、24 个 Dashboard 工作区、隐私历史与报告导出均通过；未发现产品缺陷或阻断项。

## 1. 测试范围

### Skill / Agent 真实用户旅程

- 文化知识请求保持 knowledge-only，不调用排盘候选；
- 缺少生辰与时间基准时返回明确缺失字段；
- 工具发现与八字 descriptor；
- 八字 `发现 → 输入契约 → 计算 → claims 校验 → 用户呈现 → 结果包 → 完整性验证`；
- 已核验真太阳时预处理；
- 12 时辰不确定性比较；
- 6 个规则差异域；
- Skill 行为和产品决定契约。

### 全部计算与 Dashboard 功能

- 32 个 registry 工具的 success / boundary / failure / CLI 错误语义；
- 所有 verifier 家族与跨工具拒绝；
- 24 个 Dashboard 工作区及首页、命令面板、图表、报告、搜索、古籍、历史、响应式和隐私；
- Chromium、WebKit、Mobile Chrome、Mobile Safari。

## 2. 关键验收结果

| 层级 | 结果 | 证据 |
|---|---:|---|
| Skill 行为评测 | 19/19 | `pnpm eval:skill` |
| 手工 Agent 全链路 | 10/10 检查点 | 本报告第 3 节 |
| 核心 Agent/Runner 契约 | 256/256 | 9 个定向 Vitest 文件 |
| 全量单元与契约测试 | 800/800 | 69 个 Vitest 文件 |
| React smoke | 225/225 | `smoke-react-shell.mjs` |
| 文档契约 | 319/319 | `check-doc-contracts.mjs` |
| Knowledge provenance | 726/726 | `check-knowledge-provenance.mjs` |
| 搜索契约 | 59/59 | `check-search-index.mjs` |
| Mapping schema | 506/506 | `check-mapping-schema.mjs` |
| React migration | 62/62 | `check-react-migration.mjs` |
| Bundle budget | 269/269 | 最大 gzip 217461 bytes |
| 本地 Chromium 全量 E2E | 114/114 | 31 个 spec，单 worker |
| 远端四浏览器全量 E2E | 456/456 | 每项目 114/114 |

## 3. Agent 完整闭环实测

使用合成 fixture，不记录真实用户资料。结果：

- `engine:list`：32 个工具；
- `engine:describe bazi_calculate`：包含 `birth`、`timeBasis`；
- 《庄子》请求：`routeKind=knowledge`，候选工具为 0；
- 事业请求缺参：返回 `birth,timeBasis`；
- 八字计算：`local-exact`；
- claims：3 项全部校验通过；
- typed presentation：11 项已核验事实，不含 `input_normalized`；
- SafeResultBundle：`inputIncluded=false`、`replayable=false`，完整性通过；
- 真太阳时：`status=resolved`、`source=agent-verified`；
- 时辰敏感性：12 个候选，不存在 `selectedHour`；
- 规则比较：6 个 domain 均至少两个显式变体并包含限制说明。

## 4. Dashboard 全功能覆盖

全量 E2E 覆盖：

- 主要图表：八字、紫微、六爻、梅花、罗盘、飞星、八宅、五运六气、体质；
- 命令面板导航、自然语言建议、年份/生辰输入、复制摘要；
- 八字动态层、时辰不确定性、规则差异实验室；
- 紫微、六壬、太乙、奇门、星宿、皇极、称骨、姓名、解梦、节律、测字；
- 黄历与择日、风水、联合分析；
- 古籍全文检索与阅读器；
- 本地历史默认不保存、保存预览、过期、清空、结果包导入导出；
- 报告导出隐私、完整出生日期/姓名/地点不进入历史或报告；
- 桌面和移动端响应式、无横向溢出、核心可访问性与控制台错误。

## 5. 浏览器证据

本地指定缓存：

```text
D:\Caches\ms-playwright
```

本地 Chromium：

```text
114 passed (3.9m)
```

本地四项目合并运行超过 30 分钟外层命令上限；单独 WebKit 运行超过 15 分钟工具调用上限，均未返回断言失败，故记为“本地执行超时、无结论”，不伪装为通过。

相同提交的 GitHub Actions 全量矩阵：

- Chromium：114 passed；
- WebKit：114 passed；
- Mobile Chrome：114 passed；
- Mobile Safari：114 passed。

证据：<https://github.com/dhicoc/chinese-traditional-wisdom-skill/actions/runs/32458350889>

## 6. 缺陷与风险

| 等级 | 数量 | 说明 |
|---|---:|---|
| S0 阻断 | 0 | 无 |
| S1 严重 | 0 | 无 |
| S2 一般 | 0 | 无 |
| S3 轻微 | 0 | 无 |
| 测试环境约束 | 1 | 本地四浏览器串行总时长超过工具调用上限；远端同 SHA 全矩阵通过 |

未覆盖且不属于产品缺陷：

- 不测试远端账户、同步、session 或 token，因为项目明确不提供；
- Python 只作为离线 oracle，不作为用户可见计算源；
- P0-03、P1-02、P3-04 按产品决定不实施；
- 不测试完整输入历史加密，因为产品采用更严格的“不持久化完整输入”。

## 7. 放行 Checklist

- ✅ 32 个工具可发现且 registry 数量稳定；
- ✅ Agent 确定性事实来自本地 Engine/CLI；
- ✅ claims 校验和篡改拒绝通过；
- ✅ 真太阳时证据边界通过；
- ✅ knowledge/reference 不冒充计算；
- ✅ typed presentation 与结果包隐私通过；
- ✅ 24 个 Dashboard 工作区全量 E2E 覆盖；
- ✅ 四浏览器远端矩阵 456/456；
- ✅ S0/S1/S2/S3 产品缺陷均为 0；
- ✅ 建议放行。
