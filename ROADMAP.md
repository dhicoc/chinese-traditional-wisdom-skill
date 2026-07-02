# Chinese Traditional Wisdom 项目优化与新功能演进路线图

> 面向开发维护者，规划周期为 3 个月。目标是把当前“Skill 文档 + 静态 Dashboard + 知识库”的项目，从可演示状态推进到更稳定、可验证、可扩展的产品化状态。

## Summary

核心方向：

- 稳定现有 11 标签可视化 Dashboard，降低 CDN、演示数据、近似计算带来的不确定性。
- 明确真实推算、近似推算、演示数据、外部引擎接入四类能力边界。
- 增强报告生成、知识检索、数据校验和测试体系。
- 新增面向实际咨询流程的向导式体验、报告导出、知识引用浏览等功能。

## 第 1 个月：稳定化与可信度优化

- 统一文档口径：同步 `README.md`、`README_AI.md`、`SKILL.md`、`tool-index.md`、`EVOLUTION.md` 中关于“真实计算 / 近似计算 / 演示数据 / 外部引擎”的描述。
- 给 Dashboard 增加能力标识：每个标签页显示“本地规则计算”“本地近似计算”“演示数据”“需外部引擎”等状态。
- 修复离线可用性问题：Mermaid CDN 不可用时显示降级提示，不阻塞 Canvas 标签页。
- 强化输入校验：全局生辰输入增加年月日时范围校验、错误提示、非法日期拦截；不再静默回退到默认值。
- 优化测试入口：`visual/test-runner.html` 增加测试详情展开、失败原因、浏览器环境信息、总数统计与截图建议。
- 建立质量基线：记录测试总数、通过率、已知近似项和不可验证项，作为后续版本对照。

## 第 2 个月：核心能力增强

- 抽象引擎适配层：为八字、五运六气、紫微、六爻、梅花定义统一 Adapter 接口，字段包括 `engineName`、`mode`、`inputSchema`、`calculate()`、`toRenderData()`、`confidenceNote`。
- 八字引擎增强：保留当前纯 JS 引擎作为本地快速模式，优先接入 `6tail/lunar-javascript` 作为精确节气、干支、八字基础；输出中明确区分 `local-fast` 与 `lunar-javascript` 精确历法模式。
- 五运六气增强：补充当前步气、客主加临关系字段；先用 `6tail/lunar-javascript` 补精确大寒定年和节气边界，再参考 `dhicoc/wuyun-liuqi-skills` 校验 JSON 输出结构。
- 搜索能力升级：将 `search.js` 的内置古籍索引与实际 `knowledge-base/fengshui` 文件清单对齐；结果展示增加来源、完整性、类别。
- 报告生成规范化：固化 `REPORT_DATA` 版本号，静态 HTML 报告模板增加字段缺失提示、模块隐藏规则和数据来源说明。
- 风水映射校验：为 6 个 JSON 映射表增加 schema 文档和可执行校验脚本，保证字段完整、方位覆盖、九星/八宅规则可查。
- 紫微真实排盘：优先接入 `SylarLong/iztro`，把当前 `generateZiweiDefault()` 演示数据替换为可选真实排盘 Adapter；保留演示 fallback 和能力标识。
- 六爻与梅花路线：六爻先参考 `bopo/najia` 抽象纳甲数据契约，梅花优先自研小型 JS 起卦规则；不直接嵌入许可证受限或成熟度不足的项目。

## 第 3 个月：新功能与发布沉淀

- 新增“咨询向导”模式：在 Dashboard 首页提供健康、事业、婚恋、占卜、择居、综合六类入口，引导用户填写必要信息，再跳转对应标签页或生成报告数据。
- 新增报告导出：支持从当前 `FORTUNE` 数据快照生成静态 HTML 报告；导出文件名采用脱敏标识和日期，不保存完整生辰到长期日志。
- 新增知识引用浏览器：在风水、八宅、飞星相关标签页中点击术语或方位时，展示匹配的映射表条目和古籍索引，不只显示通用 tooltip。
- 新增案例沉淀工具：基于 `field-journal/_template.md` 生成脱敏案例草稿，强制只保留年份、问题类型、主要学科、失败/成功经验。
- 新增开发者诊断页：展示当前浏览器能力、脚本加载状态、引擎可用性、CDN 状态、测试入口链接。
- 发布 `v0.2`：更新 `EVOLUTION.md`，新增 `ROADMAP.md`，整理贡献说明和已知限制，形成可对外展示的稳定版本。


## 外部引擎候选与接入策略

> 调研日期：2026-07-02。以下项目作为后续开发候选，不代表已接入；接入前必须固定版本、补 Adapter 测试，并在 Dashboard 能力标识中展示实际模式。

| 能力 | 候选项目 | 许可证 / 成熟度 | 建议接入方式 | 风险与边界 |
|------|----------|----------------|--------------|------------|
| 紫微斗数真实排盘 | `SylarLong/iztro`（GitHub: `https://github.com/SylarLong/iztro`） | MIT；TypeScript/JavaScript；活跃度高；支持 npm、CDN、独立 JS 包 | 第一优先级。新增 `ZiweiIztroAdapter`，输入全局生辰，输出当前 `VizModules.ziwei.render()` 所需 12 宫结构；可先用本地 vendor JS，避免 CDN 依赖 | 紫微流派存在差异，需在 `confidenceNote` 写明采用 iztro 默认配置；保留演示数据 fallback |
| 八字精确节气 / 干支基础 | `6tail/lunar-javascript`（GitHub: `https://github.com/6tail/lunar-javascript`） | MIT；纯 JS；无第三方依赖；支持节气、干支、八字、五行、十神 | 第一优先级。新增 `BaziLunarAdapter`，用于替换当前月柱节气近似和日期边界；当前引擎保留为 `local-fast` fallback | 仍需对比一组固定样例，确认时辰、子初换日、节气边界策略符合项目口径 |
| 高精度历法备选 | `yuangu/sxtwl_cpp`（GitHub: `https://github.com/yuangu/sxtwl_cpp`） | BSD-3-Clause；C++/SWIG；基于寿星天文历 | 作为后端、CLI 或测试 oracle 备选，不作为静态 Dashboard 首选依赖 | C++ 构建和跨平台成本高，会破坏“纯前端双击可用”的默认架构 |
| 五运六气推算参考 | `dhicoc/wuyun-liuqi-skills`（GitHub: `https://github.com/dhicoc/wuyun-liuqi-skills`） | MIT；Python 主链路 + JS 可选接口；覆盖大寒定年、当前步位、客主加临、JSON 输出 | 第二优先级。先借鉴字段契约和测试样例；本项目保留轻量 JS 实现，必要时做 `YunqiExternalAdapter` | 不能直接把 Agent/RAG 工作流整体搬入 Dashboard；医学相关输出继续只做文化参考，不做诊疗建议 |
| 六爻纳甲 | `bopo/najia`（GitHub: `https://github.com/bopo/najia`） | MIT；Python；支持卦名、变爻、卦宫、六亲、六神、世应、纳甲 | 第三优先级。作为规则校验参考或 Python adapter；前端优先沉淀纳甲 JSON 表和 JS 规则 | 项目较小且活跃度一般，不宜直接成为核心运行依赖 |
| 梅花易数 | `muyen/meihua-yishu`（GitHub: `https://github.com/muyen/meihua-yishu`）等 | `muyen/meihua-yishu` 为 CC BY-NC-SA 4.0，含非商业限制；其他项目成熟度较低 | 不直接嵌入。优先自研时间起卦、数字起卦、动爻、互卦、变卦、错综规则的小型 JS 引擎 | 许可证限制和项目形态不适合直接进入产品代码；可作为规则说明参考 |

### 接入顺序

1. `6tail/lunar-javascript`：先解决八字节气近似和五运六气大寒定年边界，是当前可信度收益最高、架构影响最小的改动。
2. `SylarLong/iztro`：把紫微从演示数据升级为本地真实排盘，优先使用本地 vendor 文件或可选 npm 构建产物。
3. 五运六气字段增强：以本地 JS 为主，参考 `dhicoc/wuyun-liuqi-skills` 的 JSON 字段和测试样例补当前步气、客主加临。
4. 六爻：先抽象 `LiuyaoAdapter` 和纳甲数据契约，再决定是否接 Python adapter；默认 Dashboard 仍可使用演示 fallback。
5. 梅花：自研轻量 JS 引擎，避免非商业许可证项目进入运行代码。

### Adapter 验收标准

- 每个外部引擎 adapter 必须输出统一字段：`engineName`、`mode`、`version`、`inputSchema`、`sourceProject`、`license`、`calculate()`、`toRenderData()`、`confidenceNote`。
- 每个 adapter 至少提供 3 组固定样例测试：普通日期、节气边界日期、性别/时辰差异样例。
- Dashboard 能力标识必须区分 `local-exact`、`local-approx`、`demo`、`external-required`、`fallback-demo`。
- 外部引擎加载失败时不得阻塞 Dashboard；必须回退到当前演示或近似模式，并在标签页显示降级原因。
- 不得把完整姓名、完整出生日期、具体出生地写入长期日志或导出文件名。

## Public Interfaces / Data Contracts

- `window.FORTUNE` 保持公开入口，新增只读方法：
  - `getCapabilities()`：返回各模块能力状态。
  - `exportReportData()`：返回可填入 `REPORT_DATA` 的脱敏数据快照。
- `REPORT_DATA` 增加 `version`、`sourceNotes`、`generatedAt` 字段；旧字段保持兼容。
- 每个可视化模块继续通过 `registerVizModule()` 注册，不改变现有 `render*()` 调用方式。
- JSON 映射表保持现有文件路径，新增 schema 文档和测试，不直接改动业务含义。
- 所有报告模板继续内置免责声明、医疗边界和预测边界，不允许生成绝对化结论。

## Test Plan

- 单元测试：八字、五运六气、命卦、飞星、八宅、JSON schema、输入校验。
- 可视化测试：每个 Canvas 模块至少验证“可渲染、不报错、非空画布”。
- 文档一致性测试：检查 README/SKILL/tool-index 中列出的入口文件、模板、映射表真实存在。
- 离线测试：断网打开 `visual/index.html`，核心 Canvas 模块可用，Mermaid 降级有提示。
- 隐私测试：报告导出和案例沉淀不得写入完整姓名、完整出生日期、具体出生地。
- 验收标准：测试页面全部通过；Dashboard 无控制台致命错误；每个标签页都有能力标识；可成功导出一份静态 HTML 报告。

## 当前 v0.2 落地范围

- 已落地：能力注册、标签页能力标识、输入校验、脱敏报告导出、脱敏案例草稿、开发者诊断页、Mermaid 离线降级、搜索索引对齐、测试页增强、JSON schema 校验脚本、文档契约检查脚本、全局命盘同步回归测试。
- 仍为边界说明：紫微、六爻、梅花在 Dashboard 中仍使用演示数据；真实计算需要外部引擎接入。
- 仍为近似计算：八字本地引擎未接入精确节气库，五运六气未接入精确大寒定年 API。
