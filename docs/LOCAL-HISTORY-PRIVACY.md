# 本地历史、保留策略与结果包契约

> 状态：CTW-P3-05 已完成（2026-08-21）

## 核心行为

- 默认不保存：导航或 Agent 路由只生成内存预览。
- 保存前预览：用户点击“保存脱敏摘要”才写入 localStorage。
- 只保存匿名摘要、报告元信息、可选的已核验结构化事实。
- 不保存完整生辰、具体地点、姓名或原始咨询问题；不提供加密后保存这些完整输入的入口。
- 无账户、无远端同步、无服务端 session、无持久 token。

## Schema v3

`HistoryEntry` 新增：

- `expiresAt: string | null`；
- `verifiedFacts: { label; value; tool }[]`；
- 可选 `resultBundle`，但必须是完整性有效、`inputIncluded: false`、`replayable: false` 的 `SafeResultBundle`。

旧 v0/v1/v2 条目继续读取、重新脱敏，且不会因升级被自动设置过期时间。

## 保留与清理

用户可选择 7、30、90 天或永不过期。默认是 30 天，但因为默认不保存，只有主动保存的新条目才产生到期时间。支持清空历史、清空收藏以及“一键清空全部”。

## 结果包导入/导出

导入流程：选择 JSON → canonical integrity 校验 → 检查隐私标志 → 显示导入预览 → 用户确认保存。导出时再次校验；篡改包不会保存或导出。结果包不包含原始输入，不能 replay。

## 验收

- `history-store.test.ts`：预览不写入、显式保存、脱敏、迁移、过期、一键清空。
- `provenance.test.ts`：结果包完整性与篡改拒绝。
- `p13x-history-user-acceptance.spec.ts`：默认不保存、预览保存、收藏删除、结果包导入预览与下载。
- `privacy.spec.ts`：localStorage 不含完整出生日期、姓名、地点，最多 30 条。
