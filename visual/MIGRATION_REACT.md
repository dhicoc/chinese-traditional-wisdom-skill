# visual/ React 迁移说明

> 创建日期：2026-07-03。本文配合根目录 `TASTE_SKILL_UI.md` 与 `ROADMAP.md` 的“React + Shadcn + Tailwind 迁移路线”使用。

## 迁移目标

将当前静态 `visual/` Dashboard 逐步演进为 React + Tailwind + Shadcn 风格的前端应用，同时保留现有确定性计算、Canvas 渲染、能力标识和测试契约。

目标视觉方向：新中式数据主义 / Academic Dark Mode。界面应像专业学者使用的数据仪器，不走玄学俗套、赛博霓虹或 Shadcn 默认皮肤。

## 并存策略

迁移采用 Strangler Fig 策略：

1. `visual/index.html` 继续作为当前稳定入口。
2. `apps/visual/` 作为新 React 应用目录。
3. 新应用先复用旧 `visual/js/` 中的 renderer、manifest、capability 和 adapter。
4. 每迁移一个模块，都与旧页面做同输入对照。
5. 全部通过后，再决定是否把新应用构建产物切为主入口。

## 不可破坏契约

以下接口在迁移期必须保持兼容：

- Tab id：`home`、`bazi`、`ziwei`、`liuyao`、`meihua`、`fengshui`、`feixing`、`bazhai`、`yunqi`、`tizhi`、`mermaid`。
- 全局入口：`window.FORTUNE`。
- Manifest：`window.ToolManifest`。
- 能力注册：`window.CapabilityRegistry`。
- 引擎注册：`window.EngineAdapterRegistry`。
- 可视化注册：`window.VizModules` 与现有 `render*()` 方法。
- 测试入口：`visual/test-runner.html` 与 `visual/js/tests/`。
- 隐私边界：不得保存完整姓名、完整出生日期、具体出生地到长期记录或导出文件名。

## 新应用目录

```text
apps/visual/
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  tsconfig.node.json
  tailwind.config.ts
  postcss.config.js
  src/
    main.tsx
    App.tsx
    styles/globals.css
    lib/modules.ts
    lib/design-tokens.ts
    components/app-shell/
    features/home/
    legacy/
```

## 第一阶段范围

第一阶段只做安全搭架：

- React + Vite + TypeScript 基座。
- Tailwind tokens 对齐 `TASTE_SKILL_UI.md`。
- App Shell。
- 11 tab 导航。
- HomeDashboard 静态版。
- Legacy 类型占位。

第一阶段不做：

- 不替换 `visual/index.html`。
- 不迁移全部 Canvas renderer。
- 不引入 Next.js。
- 不把所有图表改为 Recharts/ECharts。
- 不改变现有 `visual/js/` 业务逻辑。

## 验收清单

- 新应用能启动并显示 11 个模块。
- 模块分组与旧 Dashboard 一致。
- HomeDashboard 显示工具总数、本地能力数、演示边界数。
- 设计 token 使用暗色底、朱砂红、碧玉青、低饱和五行色。
- 移动端 375px 不横向溢出。
- 旧 `visual/index.html` 不受影响。
- `node visual/js/tests/check-doc-contracts.mjs` 继续通过。

## 回滚方式

如新应用出现问题，直接停止使用 `apps/visual/`，保留旧 `visual/index.html`。迁移期不得删除旧入口、旧 renderer 或旧测试文件。
