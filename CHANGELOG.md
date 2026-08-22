# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与语义化版本。发布前阶段没有正式 tag；`v1.0.0` 是首个稳定版本。

## [1.0.0] - 2026-08-21

### Added

- 32 个本地 TypeScript 工具的统一 registry、输入契约、CLI 分发与标准 fixture。
- Agent 自描述命令：`engine:list`、`engine:describe`、`engine:verify`、`engine:present`。
- 隐私安全 provenance、canonical JSON、结果包生成与完整性验证。
- `engine:plan` 参数规划器、`engine:bazi-time-sensitivity` 时辰不确定性及 `engine:compare-rules` 六域规则比较。
- 24 个 Dashboard 工作区、完整命令面板、结构化报告、古籍全文检索与 95 个稳定章节深链接。
- 知识 Manifest、第三方来源清单、字义/古籍索引/解梦数据分片与 bundle budget。
- 本地历史 opt-in 保存预览、自动过期、一键清空和可复核结果包导入/导出。
- 19 项离线 Skill 行为评测并接入 GitHub Actions。

### Changed

- TypeScript 成为 Agent 与 Dashboard 唯一用户可见计算来源；Python 仅作离线 oracle。
- `bazi_calculate` 必须显式声明 `timeBasis`；真太阳时仅接受完整且可复算的核验证据。
- 飞星、八宅和联合工具的年份、月份与目标日期改为显式输入，不再由 CLI 读取系统时间。
- 生产报告全面使用类型化语义，不再从自由文本关键词推断 tone 或 action。
- 本地历史从自动保存改为默认不保存、确认后保存。

### Privacy

- 结果包固定 `inputIncluded: false`、`replayable: false`。
- 历史、报告、fixture 和评测报告不保存真实完整生辰、地点、姓名或原始问题。
- 不提供远端账户、同步、服务端 session、持久 token 或远程计算。

### Security

- 将 `postcss` 的传递依赖 `nanoid` 从 3.3.17 强制升级到已修复的 3.3.18，消除 GHSA-2v37-7h3g-55p8。
- 默认 Python oracle requirements 改为可在 Python 3.13 冷安装的固定版本；原生六爻 oracle 移为可选。
- 新增发布契约、官方 npm audit、隔离 Python 安装与密钥扫描证据。

### Performance

- 字义拆分为 32 片、古籍搜索索引拆分为 4 片、解梦数据拆分为 22 片。
- 所有 JavaScript gzip 均低于 250KB；发布基线最大 gzip 为 217461 bytes。

### Verification

- 69 个测试文件、800 项单元测试。
- 19/19 Skill 行为评测。
- 四浏览器全量 E2E 456/456。
- 发布级真实用户全链路与四浏览器证据已归档在 v1.0.0 GitHub Release。

### Product Decisions

- P0-03 细粒度安全文案扫描不实施；保留全局免责声明。
- P1-02 能力状态四维拆分不实施。
- P3-04 `riskSafetyGate` 不实施，不新增工具执行阻断。
- 完整输入历史持久化不实施，采用更严格的“不保存”。

[1.0.0]: https://github.com/dhicoc/chinese-traditional-wisdom-skill/releases/tag/v1.0.0
