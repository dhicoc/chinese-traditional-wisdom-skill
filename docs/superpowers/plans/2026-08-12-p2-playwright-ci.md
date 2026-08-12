# P2 发布级 Playwright E2E GitHub Actions Implementation Plan

**Goal:** 将现有四浏览器 Playwright E2E 回归作为独立 GitHub Actions matrix job 接入，在保留基础质量门的同时，让 Chromium、WebKit、Mobile Chrome 与 Mobile Safari 成为必经发布级检查。

**Architecture:** 只修改 `.github/workflows/ci.yml`。保留现有 `visual` job 原样执行基础质量门；新增 `playwright-e2e` job，以项目名与浏览器引擎组成 matrix。每个 job 复用现有 pnpm/Node 配置，安装对应 Playwright 浏览器及 Linux 依赖，只运行其指定 project，并仅在失败时上传诊断产物。

**Tech Stack:** GitHub Actions、pnpm 10、Node.js 20、Playwright、Vite。

---

## 文件范围

- 修改：`.github/workflows/ci.yml`
  - 保持 `visual` job 不变，新增四项目 Playwright E2E matrix job 和失败 artifact。
- 新增：`docs/superpowers/plans/2026-08-12-p2-playwright-ci.md`
  - 记录本次实施、验证和非目标。
- 不修改：`apps/visual/playwright.config.ts`
- 不修改：`apps/visual/e2e/**/*.spec.ts`
- 不修改：Dashboard、CLI、本地引擎、ToolEnvelope 或 claims 校验。
- 不修改：`docs/superpowers/plans/2026-08-10-bazi-dynamic-layer.md`。

## Task 1: 建立发布级 E2E matrix job

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: 保留现有基础质量门 job**

不重命名、不删除或重排 `visual` job 的既有 install、typecheck、unit tests、contracts/smoke checks 与 build 步骤。该 job 不安装 Playwright 浏览器，也不执行 E2E。

- [ ] **Step 2: 新增按项目和引擎映射的 E2E matrix**

在 `jobs` 下新增 `playwright-e2e`：

```yaml
playwright-e2e:
  name: Playwright E2E (${{ matrix.project }})
  runs-on: ubuntu-latest
  strategy:
    matrix:
      include:
        - project: chromium
          browser: chromium
        - project: webkit
          browser: webkit
        - project: Mobile Chrome
          browser: chromium
        - project: Mobile Safari
          browser: webkit
```

不设置 `fail-fast: false`，以采用 GitHub Actions 默认快速失败语义。项目名必须与 `apps/visual/playwright.config.ts` 逐字一致；移动项目不是可安装浏览器名，必须通过独立的 `browser` 字段映射到桌面同源引擎。

- [ ] **Step 3: 复用现有依赖安装方式并安装目标引擎**

为 E2E job 设置 `apps/visual` 作为默认工作目录，并复制现有的 checkout、pnpm 10、Node 20、pnpm cache 与 `pnpm install --no-frozen-lockfile` 步骤。

依赖安装后运行：

```yaml
- name: install Playwright browser
  run: pnpm exec playwright install --with-deps ${{ matrix.browser }}
```

`--with-deps` 只在 GitHub Ubuntu runner 执行，用于安装对应浏览器的 Linux 系统依赖。不得在 package scripts、Playwright 配置或产品代码中增加安装逻辑。

- [ ] **Step 4: 执行指定 project 的完整 E2E 测试**

添加命令：

```yaml
- name: run Playwright E2E
  run: pnpm test:e2e --project "${{ matrix.project }}"
```

双引号必须保留，确保 `Mobile Chrome`、`Mobile Safari` 作为单个 project 参数传入。不要筛选 P1.3/P1.4b 文件；每个 matrix 项目运行其完整 E2E 范围。

## Task 2: 保留失败诊断证据

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: 在失败时上传 HTML report**

在 E2E 命令后使用 `actions/upload-artifact@v4` 上传相对 `apps/visual` 工作目录的 `playwright-report/`：

```yaml
if: failure()
name: playwright-report-${{ matrix.project }}
path: playwright-report/
if-no-files-found: ignore
retention-days: 14
```

- [ ] **Step 2: 在失败时上传测试结果**

使用同样的失败条件上传 `test-results/`：

```yaml
if: failure()
name: playwright-test-results-${{ matrix.project }}
path: test-results/
if-no-files-found: ignore
retention-days: 14
```

HTML report 与 `test-results` 必须分为独立 artifact，便于直接查看报告或下载 trace、截图和视频。仅失败时上传，以避免正常 CI 的额外存储。

- [ ] **Step 3: 静态复核工作流语义**

确认：

- `visual` job 仍存在且内容未变；
- matrix 包含准确的四个项目与正确浏览器映射；
- E2E job 的所有 run 命令均相对 `apps/visual`；
- 浏览器安装位于依赖安装之后、测试执行之前；
- 两个 artifact 步骤均仅在 `failure()` 时触发，并忽略目录缺失；
- 既有 `push main` 与 `pull_request` 触发器不变。

## Task 3: 验证本地命令和项目质量门

**Files:**
- Verify: `apps/visual/playwright.config.ts`
- Verify: `apps/visual/package.json`
- Verify: `.github/workflows/ci.yml`

- [ ] **Step 1: 分别运行四个 Playwright project**

在 `apps/visual` 目录运行：

```cmd
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && pnpm test:e2e --project chromium --reporter=line
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && pnpm test:e2e --project webkit --reporter=line
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && pnpm test:e2e --project "Mobile Chrome" --reporter=line
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && pnpm test:e2e --project "Mobile Safari" --reporter=line
```

各命令必须覆盖相同完整 suite，仅浏览器 project 不同。按项目顺序执行，避免本机多浏览器并行造成资源竞争。

- [ ] **Step 2: 运行既有质量门**

在 `apps/visual` 目录运行：

```cmd
pnpm typecheck
pnpm test:unit
pnpm test
node scripts/check-doc-contracts.mjs
pnpm build
```

现有 Vite `__dirname` 前瞻提示和 chunk size 提示为范围外既有信息；不得通过修改配置压制它们。

- [ ] **Step 3: 复核 diff、空白与文件归属**

在仓库根目录运行：

```cmd
git diff --check
git diff HEAD -- .github/workflows/ci.yml docs/superpowers/plans/2026-08-12-p2-playwright-ci.md
git status --short
```

确认改动仅包括 P2 规格、P2 实施计划与 CI workflow。用户已有的动态层计划仍应保持未跟踪且未暂存。

## Task 4: 提交并验证远程 CI

**Files:**
- Commit: `.github/workflows/ci.yml`
- Commit: `docs/superpowers/specs/2026-08-12-p2-playwright-ci-design.md`
- Commit: `docs/superpowers/plans/2026-08-12-p2-playwright-ci.md`

- [ ] **Step 1: 准备范围受限的提交**

只暂存上述 P2 三个文件。先检查 staged diff 和空白：

```cmd
git add .github/workflows/ci.yml docs/superpowers/specs/2026-08-12-p2-playwright-ci-design.md docs/superpowers/plans/2026-08-12-p2-playwright-ci.md
git diff --staged --check
git diff --staged
```

不得使用 `git add -A`，不得暂存动态层计划或 Playwright 测试产物。

- [ ] **Step 2: 创建 P2 提交**

使用：

```cmd
git commit -m "ci(e2e): 纳入四浏览器发布验证"
```

提交后运行 `git status --short`，确认只保留用户已有的动态层计划未跟踪文件。

- [ ] **Step 3: 推送并核实 GitHub Actions**

推送需用户单独明确授权。推送后按同一 commit 或 `main` 查询 GitHub Actions，等待：

- `Visual quality gates` 成功；
- `Playwright E2E (chromium)` 成功；
- `Playwright E2E (webkit)` 成功；
- `Playwright E2E (Mobile Chrome)` 成功；
- `Playwright E2E (Mobile Safari)` 成功。

GitHub 入队可能有短暂延迟；第一次查询若无 run，不得直接判定未触发，应按 branch 或稍后重新查询。

## 完成条件

- 现有 `Visual quality gates` job 保持不变。
- GitHub Actions 增加 Chromium、WebKit、Mobile Chrome、Mobile Safari 四个独立 E2E matrix 检查。
- 每个检查安装正确浏览器及 Linux 依赖，并执行完整指定 project E2E。
- 任一项目失败将使 CI 失败，且失败时产生项目隔离的 HTML report 与 `test-results` artifact。
- 四个本地 project 命令和既有质量门通过。
- 未修改产品代码、Dashboard 直调架构、Playwright 配置、测试范围或用户已有动态层计划文件。
