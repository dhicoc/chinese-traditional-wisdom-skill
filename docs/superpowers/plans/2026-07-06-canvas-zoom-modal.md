# Canvas 双击放大弹窗 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `visual/index.html` 中的四个核心命盘 Canvas 增加双击放大弹窗，并在弹窗打开时显示背景模糊遮罩。

**Architecture:** 在 `visual/js/core.js` 中新增通用 `CORE.bindCanvasZoomModal(canvasConfigs)` 交互模块，负责绑定核心 Canvas、创建可复用弹窗、复制当前 Canvas 图像并处理关闭事件。在 `visual/css/style.css` 中新增独立样式类，并在 `visual/index.html` 的 DOMContentLoaded 初始化流程中注册四个核心命盘 Canvas。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Canvas 2D、现有 `CORE` 全局工具对象、现有浏览器测试页 `visual/test-runner.html`。

---

## 文件结构

**修改文件：**

- `visual/js/core.js`
  - 新增 `CORE.ensureCanvasZoomModal()`。
  - 新增 `CORE.openCanvasZoomModal(canvas, title)`。
  - 新增 `CORE.closeCanvasZoomModal()`。
  - 新增 `CORE.bindCanvasZoomModal(canvasConfigs)`。
  - 这些方法与现有 `bindCanvasTooltip` 同属 Canvas 通用交互工具。

- `visual/css/style.css`
  - 新增 `.canvas-zoom-enabled` 指针提示。
  - 新增 `.canvas-zoom-overlay`、`.canvas-zoom-dialog`、`.canvas-zoom-header`、`.canvas-zoom-title`、`.canvas-zoom-close`、`.canvas-zoom-stage`、`.canvas-zoom-image`、`.canvas-zoom-hint` 等样式。
  - 新增窄屏适配。

- `visual/index.html`
  - 在现有 DOMContentLoaded 初始化中调用 `CORE.bindCanvasZoomModal()`。
  - 只注册 `bazi-canvas`、`ziwei-canvas`、`liuyao-canvas`、`meihua-canvas`。

- `visual/js/tests/test-v02-quality.js`
  - 增加轻量回归测试：验证 `CORE.bindCanvasZoomModal` 存在、只给指定 Canvas 绑定放大类、双击后生成弹窗、关闭按钮/Esc/遮罩关闭有效。

---

### Task 1: 增加 Canvas Zoom Modal 核心 JS

**Files:**
- Modify: `visual/js/core.js:342-385`

- [ ] **Step 1: 写失败测试，先验证 API 不存在会失败**

在 `visual/js/tests/test-v02-quality.js` 的 `window.TestV02Quality.run` 内，紧接在 `var state = { passed: 0, failed: 0, details: [] };` 后添加这个测试块：

```js
      runTest("CORE 提供 Canvas 双击放大弹窗 API", function() {
        assert(window.CORE, "缺少 CORE");
        assert(typeof CORE.bindCanvasZoomModal === "function", "缺少 CORE.bindCanvasZoomModal");
        assert(typeof CORE.openCanvasZoomModal === "function", "缺少 CORE.openCanvasZoomModal");
        assert(typeof CORE.closeCanvasZoomModal === "function", "缺少 CORE.closeCanvasZoomModal");
      }, state);
```

- [ ] **Step 2: 运行测试页确认该测试当前失败**

手动打开：

```text
visual/test-runner.html
```

或用浏览器访问：

```text
file://<仓库路径>/visual/test-runner.html
```

Expected：`v0.2 质量基线测试` 中新增测试失败，错误包含：

```text
缺少 CORE.bindCanvasZoomModal
```

- [ ] **Step 3: 在 `visual/js/core.js` 中实现最小 API**

在 `bindCanvasTooltip(canvasId, hitTestFn) { ... },` 结束后、`/** 在指定容器中插入术语图例面板 */` 注释前，插入以下完整方法：

```js
  /** 创建或复用 Canvas 放大弹窗 */
  ensureCanvasZoomModal() {
    let overlay = document.getElementById("canvas-zoom-overlay");
    let dialog = document.getElementById("canvas-zoom-dialog");
    if (overlay && dialog) {
      return { overlay, dialog };
    }

    overlay = document.createElement("div");
    overlay.id = "canvas-zoom-overlay";
    overlay.className = "canvas-zoom-overlay";
    overlay.hidden = true;

    dialog = document.createElement("div");
    dialog.id = "canvas-zoom-dialog";
    dialog.className = "canvas-zoom-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "canvas-zoom-title");
    dialog.hidden = true;
    dialog.innerHTML = `
      <div class="canvas-zoom-header">
        <div id="canvas-zoom-title" class="canvas-zoom-title">命盘放大查看</div>
        <button type="button" class="canvas-zoom-close" aria-label="关闭放大命盘">×</button>
      </div>
      <div class="canvas-zoom-stage">
        <img class="canvas-zoom-image" alt="放大后的命盘图像">
      </div>
      <div class="canvas-zoom-hint">双击命盘可放大查看，按 Esc 或点击空白处关闭。</div>
    `;

    overlay.addEventListener("click", () => this.closeCanvasZoomModal());
    dialog.querySelector(".canvas-zoom-close").addEventListener("click", () => this.closeCanvasZoomModal());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && dialog && !dialog.hidden) {
        this.closeCanvasZoomModal();
      }
    });

    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    return { overlay, dialog };
  },

  /** 打开 Canvas 放大弹窗 */
  openCanvasZoomModal(canvas, title) {
    if (!canvas || typeof canvas.toDataURL !== "function") return;
    const modal = this.ensureCanvasZoomModal();
    const image = modal.dialog.querySelector(".canvas-zoom-image");
    const titleEl = modal.dialog.querySelector(".canvas-zoom-title");
    if (!image || !titleEl) return;

    titleEl.textContent = title || canvas.getAttribute("aria-label") || "命盘放大查看";
    image.src = canvas.toDataURL("image/png");
    image.alt = (titleEl.textContent || "命盘") + "放大图像";

    modal.overlay.hidden = false;
    modal.dialog.hidden = false;
    document.body.classList.add("canvas-zoom-open");
  },

  /** 关闭 Canvas 放大弹窗 */
  closeCanvasZoomModal() {
    const overlay = document.getElementById("canvas-zoom-overlay");
    const dialog = document.getElementById("canvas-zoom-dialog");
    if (overlay) overlay.hidden = true;
    if (dialog) dialog.hidden = true;
    document.body.classList.remove("canvas-zoom-open");
  },

  /** 为指定 Canvas 绑定双击放大弹窗 */
  bindCanvasZoomModal(canvasConfigs) {
    (canvasConfigs || []).forEach((config) => {
      const canvas = document.getElementById(config && config.id);
      if (!canvas || canvas.dataset.zoomModalBound === "true") return;
      canvas.dataset.zoomModalBound = "true";
      canvas.classList.add("canvas-zoom-enabled");
      canvas.title = canvas.title || "双击放大查看";
      canvas.addEventListener("dblclick", () => {
        this.openCanvasZoomModal(canvas, config.title);
      });
    });
  },
```

- [ ] **Step 4: 运行测试确认 API 测试通过**

手动刷新：

```text
visual/test-runner.html
```

Expected：新增的 `CORE 提供 Canvas 双击放大弹窗 API` 测试通过。

- [ ] **Step 5: 提交 Task 1**

```bash
git add visual/js/core.js visual/js/tests/test-v02-quality.js
git commit -m "feat: add canvas zoom modal core api"
```

---

### Task 2: 增加弹窗样式与背景模糊

**Files:**
- Modify: `visual/css/style.css:230-236`

- [ ] **Step 1: 写失败测试，验证样式类尚未生效**

在 `visual/js/tests/test-v02-quality.js` 中，紧接 Task 1 的测试后添加：

```js
      runTest("Canvas 放大弹窗样式类可被浏览器识别", function() {
        var styleProbe = document.createElement("canvas");
        styleProbe.className = "viz-canvas canvas-zoom-enabled";
        document.body.appendChild(styleProbe);
        var cursor = window.getComputedStyle(styleProbe).cursor;
        document.body.removeChild(styleProbe);
        assert(cursor === "zoom-in", "canvas-zoom-enabled 未显示 zoom-in 指针");
      }, state);
```

- [ ] **Step 2: 运行测试确认当前失败**

刷新：

```text
visual/test-runner.html
```

Expected：新增测试失败，错误包含：

```text
canvas-zoom-enabled 未显示 zoom-in 指针
```

- [ ] **Step 3: 在 `visual/css/style.css` 中新增样式**

在现有 Canvas 样式块后面：

```css
canvas.viz-canvas {
  display: block;
  max-width: 100%;
  margin: 0 auto;
  border-radius: var(--radius-sm);
}
```

紧接着加入：

```css
canvas.viz-canvas.canvas-zoom-enabled {
  cursor: zoom-in;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

canvas.viz-canvas.canvas-zoom-enabled:hover {
  box-shadow: 0 14px 32px rgba(47, 31, 27, 0.14);
}

body.canvas-zoom-open {
  overflow: hidden;
}

.canvas-zoom-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(47, 31, 27, 0.46);
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
}

.canvas-zoom-dialog {
  position: fixed;
  z-index: 10001;
  top: 50%;
  left: 50%;
  width: min(1040px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(221, 208, 194, 0.92);
  border-radius: 24px;
  background: #fffdf8;
  color: var(--text-primary);
  box-shadow: 0 32px 90px rgba(47, 31, 27, 0.32);
  overflow: hidden;
}

.canvas-zoom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px 12px 22px;
  border-bottom: 1px solid rgba(221, 208, 194, 0.78);
  background: linear-gradient(180deg, #fffdf8 0%, #fbf5ea 100%);
}

.canvas-zoom-title {
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 780;
  letter-spacing: -0.01em;
}

.canvas-zoom-close {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(93, 64, 55, 0.12);
  border-radius: 999px;
  background: rgba(93, 64, 55, 0.06);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.canvas-zoom-close:hover {
  background: rgba(168, 50, 40, 0.1);
  color: var(--accent-red);
  transform: scale(1.03);
}

.canvas-zoom-stage {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 18px;
  background:
    radial-gradient(circle at top left, rgba(185, 130, 22, 0.08), transparent 18rem),
    #f7f3ec;
  text-align: center;
}

.canvas-zoom-image {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  border-radius: 16px;
  background: #fffdf8;
  box-shadow: 0 18px 40px rgba(47, 31, 27, 0.14);
}

.canvas-zoom-hint {
  padding: 11px 18px 14px;
  border-top: 1px solid rgba(221, 208, 194, 0.78);
  background: #fffdf8;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

.canvas-zoom-overlay[hidden],
.canvas-zoom-dialog[hidden] {
  display: none;
}

@media (max-width: 640px) {
  .canvas-zoom-dialog {
    width: calc(100vw - 20px);
    max-height: calc(100vh - 24px);
    border-radius: 18px;
  }

  .canvas-zoom-header {
    padding: 13px 14px 10px 16px;
  }

  .canvas-zoom-title {
    font-size: 15px;
  }

  .canvas-zoom-stage {
    padding: 12px;
  }
}
```

- [ ] **Step 4: 运行测试确认样式测试通过**

刷新：

```text
visual/test-runner.html
```

Expected：新增的 `Canvas 放大弹窗样式类可被浏览器识别` 测试通过。

- [ ] **Step 5: 提交 Task 2**

```bash
git add visual/css/style.css visual/js/tests/test-v02-quality.js
git commit -m "style: add blurred canvas zoom modal"
```

---

### Task 3: 在页面初始化时只绑定核心命盘 Canvas

**Files:**
- Modify: `visual/index.html:830-860`
- Modify: `visual/js/tests/test-v02-quality.js`

- [ ] **Step 1: 写失败测试，验证只绑定核心 Canvas**

在 `visual/js/tests/test-v02-quality.js` 中，紧接 Task 2 的测试后添加：

```js
      runTest("Canvas 放大弹窗只绑定核心命盘", function() {
        var host = document.createElement("div");
        host.innerHTML = [
          '<canvas id="zoom-test-bazi"></canvas>',
          '<canvas id="zoom-test-ziwei"></canvas>',
          '<canvas id="zoom-test-liuyao"></canvas>',
          '<canvas id="zoom-test-meihua"></canvas>',
          '<canvas id="zoom-test-wuxing"></canvas>'
        ].join("");
        document.body.appendChild(host);

        CORE.bindCanvasZoomModal([
          { id: "zoom-test-bazi", title: "八字命盘" },
          { id: "zoom-test-ziwei", title: "紫微斗数命盘" },
          { id: "zoom-test-liuyao", title: "六爻卦象" },
          { id: "zoom-test-meihua", title: "梅花易数" }
        ]);

        assert(document.getElementById("zoom-test-bazi").dataset.zoomModalBound === "true", "八字未绑定");
        assert(document.getElementById("zoom-test-ziwei").dataset.zoomModalBound === "true", "紫微未绑定");
        assert(document.getElementById("zoom-test-liuyao").dataset.zoomModalBound === "true", "六爻未绑定");
        assert(document.getElementById("zoom-test-meihua").dataset.zoomModalBound === "true", "梅花未绑定");
        assert(document.getElementById("zoom-test-wuxing").dataset.zoomModalBound !== "true", "非核心五行被错误绑定");

        host.remove();
        CORE.closeCanvasZoomModal();
      }, state);
```

- [ ] **Step 2: 运行测试确认 API 级绑定测试通过**

刷新：

```text
visual/test-runner.html
```

Expected：`Canvas 放大弹窗只绑定核心命盘` 通过。这个测试验证 API 行为，页面初始化绑定还未完成。

- [ ] **Step 3: 在 `visual/index.html` 初始化流程中绑定核心命盘**

在 `window.addEventListener('DOMContentLoaded', () => {` 内，紧接 `normalizeFormLabels(document);` 后加入：

```js
  CORE.bindCanvasZoomModal([
    { id: "bazi-canvas", title: "📜 八字命盘" },
    { id: "ziwei-canvas", title: "🔮 紫微斗数命盘" },
    { id: "liuyao-canvas", title: "📜 六爻卦象" },
    { id: "meihua-canvas", title: "🌸 梅花易数" }
  ]);
```

修改后的片段应类似：

```js
// ─── Auto-init on first load ──────────────
window.addEventListener('DOMContentLoaded', () => {
  normalizeFormLabels(document);
  CORE.bindCanvasZoomModal([
    { id: "bazi-canvas", title: "📜 八字命盘" },
    { id: "ziwei-canvas", title: "🔮 紫微斗数命盘" },
    { id: "liuyao-canvas", title: "📜 六爻卦象" },
    { id: "meihua-canvas", title: "🌸 梅花易数" }
  ]);
  // 创建图例面板
  setTimeout(() => {
```

- [ ] **Step 4: 手动验证页面绑定范围**

打开：

```text
visual/index.html
```

Expected：

- 八字、紫微、六爻、梅花 Canvas 鼠标悬停时显示 `zoom-in` 指针。
- 五行 Canvas、体质 Canvas 不显示 `zoom-in` 指针。

- [ ] **Step 5: 提交 Task 3**

```bash
git add visual/index.html visual/js/tests/test-v02-quality.js
git commit -m "feat: bind zoom modal to core canvases"
```

---

### Task 4: 增加弹窗打开与关闭行为回归测试

**Files:**
- Modify: `visual/js/tests/test-v02-quality.js`

- [ ] **Step 1: 添加弹窗行为测试**

在 `visual/js/tests/test-v02-quality.js` 中，紧接 Task 3 的测试后添加：

```js
      runTest("Canvas 放大弹窗可打开并通过按钮、遮罩、Esc 关闭", function() {
        var canvas = document.createElement("canvas");
        canvas.id = "zoom-open-close-test";
        canvas.width = 80;
        canvas.height = 60;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#d4a017";
        ctx.fillRect(0, 0, 80, 60);
        document.body.appendChild(canvas);

        CORE.bindCanvasZoomModal([{ id: "zoom-open-close-test", title: "测试命盘" }]);
        canvas.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

        var overlay = document.getElementById("canvas-zoom-overlay");
        var dialog = document.getElementById("canvas-zoom-dialog");
        var title = dialog.querySelector(".canvas-zoom-title");
        var image = dialog.querySelector(".canvas-zoom-image");
        var close = dialog.querySelector(".canvas-zoom-close");

        assert(overlay && overlay.hidden === false, "遮罩未打开");
        assert(dialog && dialog.hidden === false, "弹窗未打开");
        assert(document.body.classList.contains("canvas-zoom-open"), "打开弹窗时未禁止背景滚动");
        assert(title.textContent === "测试命盘", "弹窗标题不正确");
        assert(image.src.indexOf("data:image/png") === 0, "弹窗图像未使用 Canvas PNG 数据");

        close.click();
        assert(dialog.hidden === true && overlay.hidden === true, "关闭按钮未关闭弹窗");
        assert(!document.body.classList.contains("canvas-zoom-open"), "关闭后未恢复背景滚动");

        CORE.openCanvasZoomModal(canvas, "测试命盘");
        overlay.click();
        assert(dialog.hidden === true && overlay.hidden === true, "遮罩点击未关闭弹窗");

        CORE.openCanvasZoomModal(canvas, "测试命盘");
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        assert(dialog.hidden === true && overlay.hidden === true, "Esc 未关闭弹窗");

        canvas.remove();
        CORE.closeCanvasZoomModal();
      }, state);
```

- [ ] **Step 2: 运行测试确认弹窗行为通过**

刷新：

```text
visual/test-runner.html
```

Expected：`Canvas 放大弹窗可打开并通过按钮、遮罩、Esc 关闭` 通过。

- [ ] **Step 3: 检查测试不会污染页面状态**

刷新测试页后，再打开浏览器开发者工具控制台执行：

```js
document.body.classList.contains("canvas-zoom-open")
```

Expected：返回：

```js
false
```

- [ ] **Step 4: 提交 Task 4**

```bash
git add visual/js/tests/test-v02-quality.js
git commit -m "test: cover canvas zoom modal behavior"
```

---

### Task 5: 手动验收核心用户流程

**Files:**
- No code changes expected.

- [ ] **Step 1: 打开 Dashboard**

打开：

```text
visual/index.html
```

Expected：首页正常显示，无控制台错误。

- [ ] **Step 2: 验证八字命盘**

操作：

1. 点击“八字命盘”标签。
2. 双击 `八字命盘` Canvas。
3. 点击右上角 `×`。

Expected：

- 弹窗打开。
- 背景变暗并模糊。
- 标题为 `📜 八字命盘`。
- 图片内容与页面内八字命盘一致。
- 点击 `×` 后关闭。

- [ ] **Step 3: 验证紫微斗数命盘**

操作：

1. 点击“紫微斗数”标签。
2. 双击 `紫微斗数命盘` Canvas。
3. 点击遮罩空白处。

Expected：

- 弹窗打开。
- 标题为 `🔮 紫微斗数命盘`。
- 点击遮罩后关闭。

- [ ] **Step 4: 验证六爻卦象**

操作：

1. 点击“六爻占卜”标签。
2. 双击 `六爻卦象` Canvas。
3. 按 `Esc`。

Expected：

- 弹窗打开。
- 标题为 `📜 六爻卦象`。
- 按 `Esc` 后关闭。

- [ ] **Step 5: 验证梅花易数**

操作：

1. 点击“梅花易数”标签。
2. 双击 `梅花易数` Canvas。
3. 点击右上角 `×`。

Expected：

- 弹窗打开。
- 标题为 `🌸 梅花易数`。
- 点击 `×` 后关闭。

- [ ] **Step 6: 验证非核心 Canvas 不触发**

操作：

1. 回到“八字命盘”标签。
2. 双击 `五行平衡` Canvas。
3. 点击“五运六气”标签并双击其 Canvas。
4. 点击“体质辨识”标签并双击其 Canvas。

Expected：

- 不出现 `.canvas-zoom-dialog` 打开状态。
- 鼠标悬停时不显示 `zoom-in` 指针。

- [ ] **Step 7: 验证现有 tooltip 不受影响**

操作：

1. 在八字命盘 Canvas 上移动鼠标。
2. 在六爻 Canvas 上移动鼠标。

Expected：

- 原有 tooltip 正常出现。
- 双击放大功能不影响 hover 提示。

- [ ] **Step 8: 验证窄屏布局**

操作：

1. 将浏览器宽度缩小到约 390px。
2. 双击八字命盘 Canvas。

Expected：

- 弹窗宽度不超出视口。
- 关闭按钮可见。
- 弹窗主体可滚动查看图片。

- [ ] **Step 9: 提交验收记录**

如果 Task 5 没有代码改动，不需要提交。若在验收中修复了样式或 JS 小问题，提交：

```bash
git add visual/js/core.js visual/css/style.css visual/index.html visual/js/tests/test-v02-quality.js
git commit -m "fix: polish canvas zoom modal interactions"
```

---

## 自检结果

- Spec coverage：计划覆盖了四个核心 Canvas、双击打开、背景模糊、标题、当前 Canvas 图像副本、关闭按钮、遮罩关闭、Esc 关闭、禁止背景滚动、重复绑定保护、非核心 Canvas 不绑定、窄屏不溢出。
- Placeholder scan：未保留 TBD/TODO/“稍后实现”等占位内容。
- Type consistency：计划中 API 名称统一为 `CORE.bindCanvasZoomModal`、`CORE.openCanvasZoomModal`、`CORE.closeCanvasZoomModal`、`CORE.ensureCanvasZoomModal`，样式类统一为 `canvas-zoom-*`。
