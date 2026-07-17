# UI 动画质感优化执行计划

> 起草日期：2026-07-17。状态：**分步执行中**。按 §步骤逐步落地，每步验证后提交。

## 0. 目标与原则

把当前"硬切"的 UI 提升到 Apple 风格的柔和过渡质感。原则：

- **一套原语多处复用**：在 globals.css 定义统一的 keyframes + 工具类，各组件挂 class，不各写各的。
- **轻量优先**：用 CSS transition/keyframes，不引入 framer-motion 等动画库（保持零新依赖）。
- **时长克制**：入场 180-240ms，弹窗 160-200ms，hover/微交互 200-300ms。Apple 风格的精髓是"快但柔"，不是慢。
- **无障碍降级**：所有动画在 `prefers-reduced-motion: reduce` 下关闭（globals.css 已有该 media 块，扩展之）。
- **零回归**：每步只加动画 class + keyframes，不改业务逻辑，跑 smoke + typecheck 验证。

## 1. 现状诊断

| 维度 | 现状 | 问题 |
|------|------|------|
| 工作区切换 | AppShell 第 38 行 `<div data-testid={workspace-${activeModule}}>` 直接挂载新组件 | 硬切，新工作区瞬现 |
| 弹窗（CommandBar/AgentConfirmPanel/SearchModal） | 遮罩 + 对话框直接渲染，无入场 | 瞬现，缺层次感 |
| Toast（GlobalToast） | setTimeout 2.6s 后 setState(null) 硬消 | 入场无动画、退场硬切 |
| LoadingSkeleton | 静态灰块 | 缺 shimmer 扫光 |
| 结果卡片（InterpretationCard 等） | 数据算完直接出现 | 硬现，无错峰 |
| SidebarNav active 指示 | 高亮样式直接切换 | 无滑动指示条 |
| 已有动画 | WorkspaceTabs（刚加的 cubic 缓动）、DynamicTianPanBackground、globals.css 的 tianpan-disc-rotate + prefers-reduced-motion 块 | 基础已有，缺入场/状态动画体系 |

## 2. 动画原语设计（globals.css 统一）

在 `apps/visual/src/styles/globals.css` 新增一组 keyframes + 工具类：

```css
/* ── 入场动画原语 ── */
@keyframes ct-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes ct-slide-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
@keyframes ct-scale-in { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
@keyframes ct-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }

.ct-animate-fade-in { animation: ct-fade-in 200ms ease-out both }
.ct-animate-slide-up { animation: ct-slide-up 240ms cubic-bezier(0.22,1,0.36,1) both }
.ct-animate-scale-in { animation: ct-scale-in 180ms cubic-bezier(0.22,1,0.36,1) both }
.ct-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); background-size: 200% 100%; animation: ct-shimmer 1.6s infinite }

/* 错峰延迟工具类 */
.ct-delay-1 { animation-delay: 60ms }
.ct-delay-2 { animation-delay: 120ms }
.ct-delay-3 { animation-delay: 180ms }
.ct-delay-4 { animation-delay: 240ms }
```

扩展已有 `@media (prefers-reduced-motion: reduce)` 块：
```css
@media (prefers-reduced-motion: reduce) {
  .ct-animate-fade-in, .ct-animate-slide-up, .ct-animate-scale-in, .ct-shimmer { animation: none }
  * { scroll-behavior: auto !important }
}
```

> 命名用 `ct-` 前缀（chinese-traditional）避免与 Tailwind/第三方冲突。

## 3. 分步执行计划

每步 = 一个独立 commit，跑 typecheck + smoke 验证后提交。

### 步骤 1：建立动画原语（globals.css）
- 在 globals.css 加 §2 的 keyframes + 工具类 + reduced-motion 降级
- 不动任何组件，只备好原语
- 验证：typecheck + smoke 全过（原语不影响现有）

### 步骤 2：工作区切换入场动画
- AppShell 第 38 行 `<div data-testid={workspace-${activeModule}}>` 加 `key={activeModule}` + `ct-animate-slide-up`
- key 变化触发 React 重新挂载 → 入场动画播放
- 验证：切换标签时新工作区柔和上滑淡入；smoke 无回归

### 步骤 3：弹窗入场动画（3 个）
- CommandBar：遮罩 `ct-animate-fade-in`、对话框 `ct-animate-scale-in`
- AgentConfirmPanel：同上
- SearchModal：遮罩 `ct-animate-fade-in`、对话框 `ct-animate-scale-in` + 内部结果区 `ct-animate-slide-up`
- 验证：打开弹窗有层次感（遮罩先现、对话框缩放浮出）

### 步骤 4：Toast 入场/退场动画
- GlobalToast：入场 `ct-animate-slide-up`，退场 `ct-animate-fade-in` 反向（或用 transition opacity）
- 退场需过渡态：setState(null) 前先 fade out（加 `isLeaving` state，180ms 后再 null）
- 验证：Toast 出现/消失柔和

### 步骤 5：LoadingSkeleton shimmer
- LoadingSkeleton 灰块加 `ct-shimmer` class
- 验证：加载骨架有扫光

### 步骤 6：结果卡片错峰入场
- 在结果区容器加 `ct-animate-fade-in`，子卡片用 `ct-delay-1/2/3/4` 错峰
- 适用：ComboWorkspace 结果区、CeziWorkspace 结果、各 Workspace 的 InterpretationCard
- 验证：结果出现时卡片依次淡入，有节奏感

### 步骤 7：SidebarNav active 指示条滑动
- SidebarNav active 高亮改用 transition-all（位置/背景过渡），或加一条 active 指示条用 transform 滑动
- 验证：切换侧边栏模块时高亮柔和滑动而非瞬移

### 步骤 8：微交互（按钮/输入框聚焦）
- 全局按钮：hover/active 已有 transition，补 `duration-200 ease-out` 统一
- 输入框聚焦：border + 轻微 box-shadow 扩散
- 验证：交互手感统一

### 步骤 9（可选）：SVG 命盘绘制动画
- 八字柱/紫微/六爻等 SVG 首次绘制加 stroke-dashoffset 描边动画
- 工作量大，视效果决定是否做

## 4. 风险与回退

- **风险低**：每步只加 class + keyframes，不改逻辑；keyframes 用 `both` fill-mode 避免动画前后闪烁
- **`key={activeModule}` 注意**：步骤 2 用 key 强制重挂载会让工作区内部 state（如输入框草稿）丢失——需确认各工作区是否依赖本地 state。若有依赖，改用 CSS-only 方案（不加 key，靠 activeModule 变化触发 class）
- **回退**：每步独立 commit，不满意 `git revert` 单步

## 5. 验证清单（每步通用）

- `pnpm typecheck` 通过
- `pnpm test`（smoke 236）无回归
- 浏览器目测：动画流畅、无闪烁、reduced-motion 下关闭
