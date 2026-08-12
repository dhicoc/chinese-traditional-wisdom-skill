# P1.4b 全局 Shell 用户侧 E2E 验收 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一份独立的四浏览器 Shell 用户验收，验证全局出生资料的离焦提交与确认重置、命令面板至八字工作区的导航闭环，以及移动端出生资料入口和无横向溢出。

**Architecture:** 只在 `apps/visual/e2e` 新建 `p14b-shell-user-acceptance.spec.ts`。该 spec 通过真实用户界面操作 Dashboard，并复用 P1.4a 的 `p13-helpers.ts`；不修改 `smoke.spec.ts`、产品组件、引擎调用链、Playwright 配置或任何模块工作区。

**Tech Stack:** TypeScript、Playwright、React、Vite、Vitest、Node.js。

---

## 文件结构

- 新建：`apps/visual/e2e/p14b-shell-user-acceptance.spec.ts`
  - 桌面出生资料提交 / 重置、命令面板工作区导航、移动出生资料与布局边界的真实用户验收。
- 复用：`apps/visual/e2e/p13-helpers.ts`
  - `BASE_URL`、`openWorkspace()`、`visibleBirthInput()`、`expectNoHorizontalOverflow()`。
- 不修改：`apps/visual/e2e/smoke.spec.ts`
  - 保持快速启动、基础可见性和响应式结构 smoke 职责。
- 不修改：`apps/visual/src/components/shared/BirthPanel.tsx`
- 不修改：`apps/visual/playwright.config.ts`

## Task 1: 编写 Shell 用户验收并取得真实运行基线

**Files:**
- Create: `apps/visual/e2e/p14b-shell-user-acceptance.spec.ts`

- [ ] **Step 1: 创建最小 spec 骨架和公共 helper 导入**

创建文件，导入：

```ts
import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  expectNoHorizontalOverflow,
  openWorkspace,
  visibleBirthInput,
} from './p13-helpers';
```

不要从 `BirthPanel`、`AppShell`、模块注册表或 birth context 导入产品运行时代码。不要定义本地 `BASE_URL`、命令面板导航、可见出生字段或布局 helper。

- [ ] **Step 2: 写桌面出生资料提交、刷新和重置场景**

创建名为 `桌面全局生辰离焦提交会刷新首页命盘，确认后可重置默认资料` 的测试：

1. 设定 `1440×900` 视口，打开 `BASE_URL`，等待 `[data-testid="app-shell"]` 可见。
2. 断言 heading “玄枢”、`[data-testid="sidebar-nav"]`、`[data-testid="home-bazi-plate"]` 和 `visibleBirthInput(page, 'year')` 可见；断言输入初始值为 `1990`。
3. 保存 `home-bazi-plate` 的初始 `textContent()`，且以显式错误保护空字符串。
4. 在年份输入 `fill('1991')` 后执行 `press('Tab')`；不得改用 `blur()` 或 `fillVisibleBirthField()`。
5. 断言年份输入为 `1991`，并在全局生辰面板中断言 `1991-06-15` 可见。
6. 以 `expect.poll()` 读取 `home-bazi-plate` 的 `textContent()`，等待其不再等于初始文本。
7. 注册 `page.once('dialog', async dialog => { ... })`，断言 `dialog.type()` 为 `confirm`，`dialog.message()` 为 `确定重置生辰为默认值（1990-06-15 12时 男）？`，然后 `accept()`。
8. 点击可见的“重置”按钮；断言年份恢复 `1990`、全局生辰面板恢复 `1990-06-15`、默认生辰提示可见。
9. 调用 `await expectNoHorizontalOverflow(page)`。

使用 `page.getByText('全局生辰').locator('..')` 或等价的用户可见容器定位摘要，避免因桌面 / 移动双 DOM 导致全页文本断言歧义。原生 dialog listener 必须在点击“重置”前注册。

- [ ] **Step 3: 写命令面板导航闭环场景**

创建名为 `命令面板搜索八字命盘后抵达目标工作区` 的测试：

```ts
const workspace = await openWorkspace(page, '八字命盘', 'bazi');
await expect(workspace.getByRole('heading', { name: '四柱主盘' })).toBeVisible({ timeout: 60000 });
```

这足以证明命令面板搜索、选择导航结果和 workspace 加载闭环；不要额外覆盖打开按钮、`Ctrl+K`、过滤或 `Escape`，这些属于 `interactions.spec.ts`。

- [ ] **Step 4: 写移动端出生资料入口和布局边界场景**

创建名为 `移动端可访问全局生辰且 Shell 不产生横向溢出` 的测试：

1. 设定 `375×667` 视口，打开 `BASE_URL`，等待 app shell。
2. 断言 `[data-testid="workspace-tabs"]` 可见。
3. 断言 `visibleBirthInput(page, 'year')`、文本“全局生辰”和默认生辰提示可见。
4. 调用 `await expectNoHorizontalOverflow(page)`。

不要在移动场景断言桌面侧栏，也不要修改输入值，避免和该场景的布局目标无关的状态变更。

- [ ] **Step 5: 运行定向 spec，取得真实运行基线**

从 `apps/visual` 运行：

```cmd
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && npx playwright test p14b-shell-user-acceptance --reporter=line
```

预期：现有产品行为已符合规格时，三个场景应直接在四浏览器通过，即 `12 passed`。若失败，记录准确失败信息；不能为制造绿色结果而删除场景、降级为静态存在性断言，或改产品代码。

## Task 2: 仅在真实失败时收敛单一用户验收 spec

**Files:**
- Modify: `apps/visual/e2e/p14b-shell-user-acceptance.spec.ts`

- [ ] **Step 1: 用真实 Shell DOM 调整摘要和重置定位**

如果 Task 1 的失败显示 `全局生辰` 文本、`重置`按钮或默认提示存在严格性歧义，只在新 spec 内把 locator 收敛到可见的 BirthPanel 容器。不要向 `BirthPanel` 增加 `data-testid`，不要改用户文案或按钮名称。

保持以下行为不变：

- 年份必须 `fill()` 再 `press('Tab')`；
- 通过原生 `dialog` 接受 reset；
- 以 SVG `home-bazi-plate` 的用户可见文本变化确认结果刷新；
- 布局使用共享 `expectNoHorizontalOverflow()`。

- [ ] **Step 2: 运行新的定向四浏览器矩阵**

从 `apps/visual` 运行：

```cmd
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && npx playwright test p14b-shell-user-acceptance --reporter=line
```

预期：3 个场景 × Chromium、WebKit、Mobile Chrome、Mobile Safari，共 `12 passed`。

若任一浏览器因动画导致真实可点击元素不稳定，仅对已验证的用户可见控件使用最小化的稳定策略（例如先等待可见）；不得改为 direct state、hash 跳转或隐藏元素定位。使用 `force: true` 前必须证明是与已有 p13b 同类的入场动画问题，并说明理由。

- [ ] **Step 3: 审阅新 spec 的边界**

确认新文件：

- 只导入 `@playwright/test` 与 `./p13-helpers`；
- 不包含 `tizhi`、测试控制台、CLI、MCP 或 `runLocalTool`；
- 不复制 `BASE_URL` / `openWorkspace` / `visibleBirthInput` / `scrollWidth` helper；
- 不修改现有 P1.3 spec 或 `smoke.spec.ts`；
- 没有产品代码改动。

- [ ] **Step 4: 提交验收 spec**

从仓库根目录运行：

```cmd
git add apps/visual/e2e/p14b-shell-user-acceptance.spec.ts
git diff --staged --check
git commit -m "test(shell): 覆盖全局用户入口验收"
```

仅暂存新 spec；不得暂存 `docs/superpowers/plans/2026-08-10-bazi-dynamic-layer.md`。

## Task 3: 运行完整回归和项目质量门

**Files:**
- Verify: `apps/visual/e2e/p14b-shell-user-acceptance.spec.ts`
- Verify: `apps/visual/e2e/p13-helpers.ts`
- Verify: `apps/visual/e2e/p13*.spec.ts`

- [ ] **Step 1: 回归完整 P1.3 四浏览器矩阵**

从 `apps/visual` 运行：

```cmd
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && npx playwright test p13 --reporter=line
```

预期：既有 P1.3 用户验收保持 `124 passed`。新 P1.4b 文件不应被 `p13` 文件筛选包含。

- [ ] **Step 2: 运行项目质量门**

从 `apps/visual` 依次运行：

```cmd
npm run typecheck
npm run test:unit
npm run test
node scripts/check-doc-contracts.mjs
npm run build
```

预期：全部退出码为 0。构建可能仍输出既有 Vite `__dirname` 前瞻提示和 chunk size 提示；这是已知范围外信息，不能为了压制它们修改配置或构建。

- [ ] **Step 3: 审阅最终 diff 与仓库归属**

从仓库根目录运行：

```cmd
git diff HEAD -- apps/visual/e2e/p14b-shell-user-acceptance.spec.ts
git diff --check
git status --short
```

预期：P1.4b 的实现提交后，工作区仅保留用户已有的未跟踪文件：

```text
?? docs/superpowers/plans/2026-08-10-bazi-dynamic-layer.md
```

如果出现 Playwright 报告、测试结果或截图，先确认 `.gitignore` 已排除它们；不得将测试产物纳入提交。

- [ ] **Step 4: 提交验证后的残余源码（如有）**

如果 Task 2 已提交且没有源码修改，不创建空提交。若为了 Task 2 的真实 DOM 调整仍有已验证、未提交的 P1.4b spec 修改，则只暂存该文件并提交：

```cmd
git add apps/visual/e2e/p14b-shell-user-acceptance.spec.ts
git diff --staged --check
git commit -m "test(shell): 完成全局入口验收"
```

## 完成条件

- `p14b-shell-user-acceptance.spec.ts` 独立于 `smoke.spec.ts`，且只覆盖 Shell 真实用户流程。
- 桌面四浏览器均验证出生年份的离焦提交、首页命盘变化、确认重置和无横向溢出。
- 命令面板四浏览器均验证搜索到八字工作区的完整导航结果。
- 移动四浏览器均验证可见出生资料入口和无横向溢出。
- 定向 P1.4b 为 `12 passed`，完整 P1.3 保持 `124 passed`，且质量门均通过。
- 未修改 Dashboard 产品代码、架构边界、体质辨识范围、Playwright 配置或用户已有动态层计划文件。
