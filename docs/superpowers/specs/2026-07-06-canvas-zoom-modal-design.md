# Canvas 双击放大弹窗设计

日期：2026-07-06

## 背景

`visual/index.html` 中多个核心命盘以 Canvas 呈现。当前页面内嵌尺寸适合浏览整体布局，但查看复杂命盘细节时不够方便。本设计为核心命盘 Canvas 增加双击放大能力，通过弹窗展示当前画面，并对背景做模糊处理。

## 功能范围

本次只覆盖核心命盘 Canvas：

- `bazi-canvas`：八字命盘
- `ziwei-canvas`：紫微斗数命盘
- `liuyao-canvas`：六爻卦象
- `meihua-canvas`：梅花易数

不覆盖五行、风水罗盘、流年飞星、八宅、五运六气、体质雷达等辅助图表，避免界面行为过度泛化。

## 用户交互

用户在核心命盘 Canvas 上双击时：

1. 页面中央打开放大弹窗。
2. 页面背景出现半透明遮罩，并启用背景模糊。
3. 弹窗顶部显示当前命盘标题。
4. 弹窗主体显示当前 Canvas 的图像副本。
5. 弹窗底部显示关闭提示。
6. 用户可以通过以下方式关闭：
   - 点击右上角关闭按钮。
   - 点击遮罩空白区域。
   - 按 `Esc`。

## 推荐实现方案

采用通用 Canvas 放大弹窗模块，在 `visual/js/core.js` 中新增：

```js
CORE.bindCanvasZoomModal(canvasConfigs)
```

配置示例：

```js
[
  { id: "bazi-canvas", title: "📜 八字命盘" },
  { id: "ziwei-canvas", title: "🔮 紫微斗数命盘" },
  { id: "liuyao-canvas", title: "📜 六爻卦象" },
  { id: "meihua-canvas", title: "🌸 梅花易数" }
]
```

该方法负责：

- 查找目标 Canvas。
- 绑定 `dblclick` 事件。
- 创建并复用全局弹窗 DOM。
- 将源 Canvas 内容复制为弹窗图像。
- 绑定关闭事件。
- 避免重复绑定。

## 图像策略

放大时不重新执行各命盘绘制逻辑，而是直接使用源 Canvas 当前内容：

```js
canvas.toDataURL("image/png")
```

这样可以保证弹窗内容与页面当前显示完全一致，同时避免侵入八字、紫微、六爻、梅花各自的绘制代码。后续如果需要更高清显示，可再扩展为“按弹窗尺寸重新绘制”的模式，但不属于本次范围。

## 样式设计

在 `visual/css/style.css` 新增独立样式类：

- `.canvas-zoom-overlay`
- `.canvas-zoom-dialog`
- `.canvas-zoom-header`
- `.canvas-zoom-title`
- `.canvas-zoom-close`
- `.canvas-zoom-stage`
- `.canvas-zoom-image`
- `.canvas-zoom-hint`

视觉风格沿用当前项目：

- 米白色弹窗背景。
- 深棕色正文。
- 柔和阴影。
- 大圆角。
- 半透明深色遮罩。
- `backdrop-filter: blur(12px) saturate(120%)`。

同时为核心命盘 Canvas 提供轻量交互提示，例如 `cursor: zoom-in`。不对非核心 Canvas 显示放大指针。

## 可访问性与健壮性

实现需满足：

- 弹窗容器使用 `role="dialog"`。
- 设置 `aria-modal="true"`。
- 关闭按钮具备 `aria-label`。
- 打开弹窗时禁止背景滚动。
- 关闭弹窗后恢复背景滚动。
- 源 Canvas 不存在时静默跳过。
- 同一 Canvas 不重复绑定。
- `Esc` 只在弹窗打开时关闭弹窗。

## 测试标准

实现后需要验证：

1. 双击 `bazi-canvas` 能打开弹窗。
2. 双击 `ziwei-canvas` 能打开弹窗。
3. 双击 `liuyao-canvas` 能打开弹窗。
4. 双击 `meihua-canvas` 能打开弹窗。
5. 弹窗背景存在模糊遮罩。
6. 弹窗图像与源 Canvas 当前内容一致。
7. 点击关闭按钮能关闭弹窗。
8. 点击遮罩空白区域能关闭弹窗。
9. 按 `Esc` 能关闭弹窗。
10. 现有 Canvas tooltip 交互不受影响。
11. 非核心 Canvas 不触发放大。
12. 窄屏下弹窗不溢出视口。

## 非目标

本次不做：

- 手势缩放、滚轮缩放或拖拽平移。
- 重绘高清大图。
- 下载图片功能。
- 覆盖所有 Canvas。
- 改造 React 新版入口。
