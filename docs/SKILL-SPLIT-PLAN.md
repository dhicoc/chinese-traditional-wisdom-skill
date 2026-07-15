# Skill / Platform 拆分与 npm 包化执行计划

> 起草日期：2026-07-15。状态：**待审**。审阅通过后按各阶段执行步骤动手。
>
> 本计划由对话逐步推演形成，核心思想：承认项目本来就不是轻量 skill，而是套了 skill 壳的玄学计算平台。据此拆成两个独立可分发产品，并进一步把引擎层发布为 npm 包、把可视化报告做成"AI 按已激活引擎 + prompt 模板生成、视觉与 Dashboard 同源"的闭环。

## 0. 总览：三阶段路线

```
阶段 1：拆出纯 markdown skill（零风险，立刻让 skill 轻）
阶段 2：引擎层 npm 包化
  ├─ 2a 引擎算力纯函数 + envelope（已基本就绪，收尾）
  ├─ 2b 渲染核心纯函数化（从 React 组件剥离几何）← 关键新增工作
  └─ 2c MCP server 包：工具返回 data + svg，可 npm install / npx
阶段 2.5：激活式可视化报告 prompt
  └─ 从"全量 canvas 模板 + display:none 隐藏"升级为"拼装式 SVG 报告"——
     AI 按上下文中已激活引擎调工具，把返回的 SVG 拼进轻量 HTML 壳，
     视觉 = Dashboard 同源；没激活的引擎根本不出现在报告里
阶段 3：Dashboard 降级为可选开发/演示工具（不强求壳化）
```

**核心闭环（用户三个想法合起来的最终形态）：**

```
用户问"排个八字看事业"
  → AI 识别意图（skill 路由，纯 markdown）
  → AI 检测：八字引擎激活没？
     ├─ 没激活 → npm install chinese-wisdom-mcp + 配 MCP（AI 自主）
     └─ 激活了 → 调 bazi_calculate 工具，返回 data + svg（Dashboard 同源 SVG）
  → AI 拿 svg + 数据，按可视化报告 prompt 拼装 HTML
  → 用户双击打开，看到 Dashboard 同款视觉的可视化报告
```

**为什么这个闭环成立（绕开了原本的技术难点）：** 浏览器无法探测 npm 包装没装，但 AI 的上下文天然知道激活了什么、调了什么。以 AI 为唯一全局协调者，"按需激活"从运行时探测问题变成生成时已知问题。可视化精度由"渲染核心纯函数 + MCP 工具返回 SVG"保证，AI 只管数据与拼装，不手写图形代码。

---

# 阶段 1：拆出纯 markdown skill

## 1.1 背景与诊断

项目名为 `chinese-traditional-wisdom-ai-agent-workflow`，但实际规模已达：

- 30,338 行 TS/TSX，40 个 legacy 引擎文件，175 个测试，240 次提交
- SKILL.md 463 行；ROADMAP 67KB；EVOLUTION 70KB
- 三层架构：Skill + MCP Server + Visual Dashboard

它从一开始的定位就是 "AI Agent Workflow"，skill 只是套在前面当路由入口的壳。痛点（用户确认）：**首次安装复杂、文档太重、三层架构太重**。

结论：承认双身份，拆成两个独立可分发产品，同仓共存（平台在根，skill 放 `skill/` 子目录）。

## 1.2 拆分目标

### 产品 A — 玄学计算平台（仓库根，保持现状主体）

面向终端用户 + AI 客户端，自成体系，**不依赖 skill**。

- 引擎库：`apps/visual/src/legacy/` 40 引擎 + envelope
- Web 应用：`apps/visual` React+SVG Dashboard
- MCP Server：`apps/mcp-server` 24 工具薄壳
- 测试：175 个
- 文档：`README.md` / `ROADMAP.md` / `EVOLUTION.md` / `tool-index.md`
- 资产：`knowledge-base/` / `docs/` / `scripts/` / `bootstrap/` / `field-journal/`
- 知识库：`reference-*.md`（完整版，4 份）

### 产品 B — `chinese-wisdom-skill`（`skill/` 子目录）

面向 AI agent，纯 markdown，即开即用。**目标 ≤300 行 SKILL.md**。

- `skill/SKILL.md`：瘦身版，只做路由 + 工具语义 + 解读指引
- `skill/reference-*.md`：精简版（解读用的背景知识）
- `skill/RULES.md`：AI 行为规则精简版
- `skill/README.md`：一页使用说明

### 关键设计原则

**skill 不硬依赖平台。** 两个产品各自独立可分发：

- 没装平台 → AI 按 skill 指引用自身能力做轻量玄学解读（路由 + 知识仍有价值）
- 装了平台 → skill 告诉 AI 调哪些 MCP 工具拿精确排盘 + SVG，能力增强

三层架构痛点因此消解：变成两个各只有一层（或平台的两层 = 引擎+MCP壳）的产品。

## 1.3 顶层文件 / 目录归属清单

| 路径 | 归属 | 处理 |
|------|------|------|
| `apps/` | 平台 | 不动（阶段 2 会重组为包） |
| `knowledge-base/` | 平台 | 不动 |
| `docs/` | 平台 | 不动（本计划文档也属平台） |
| `scripts/` | 平台 | 不动（setup-mcp.mjs + 可选 Python oracle） |
| `bootstrap/` | 平台 | 不动（7 个引擎说明文档） |
| `field-journal/` | 平台 | 不动（案例沉淀） |
| `templates/` | **待定** | 见 §1.4 |
| `.agents/` `.codex/` `.claude/` | 平台仓库根 | 不动（开发工具配置） |
| `README.md` `README_AI.md` | 平台 | 改造（见 §1.6） |
| `ROADMAP.md` `EVOLUTION.md` `tool-index.md` | 平台 | 不动，但删除其中"skill 路由"相关表述 |
| `SKILL.md` | **拆** | 路由部分 → `skill/SKILL.md`；安装/架构/工具集成部分 → 平台 README |
| `RULES.md` | skill | 复制到 `skill/RULES.md` 并精简；根目录按 §1.4.2 决定 |
| `reference-*.md`（4 份） | **两边都放** | 完整版留根（平台知识库）；精简版复制到 `skill/` |
| `LICENSE` | 两产品共用 | 根保留；skill 子目录可加一份引用 |
| `requirements.txt` | 平台 | 不动（可选 Python 依赖） |
| `package.json`（根） | 平台 | 阶段 1 改 name 为 `chinese-wisdom-platform`，去掉过时 `bazi-ziwei-skill` 依赖；阶段 2 重组为 monorepo |
| 顶层 3 个 PNG | 平台 | 不动（演示截图） |
| `TASTE_SKILL_UI.md` | 待定 | 见 §1.4.3 |

## 1.4 待审边界（阶段 1 需拍板）

### 1.4.1 `templates/`（7 个咨询报告模板）

- 6 个 AI 报告模板（`career-consultation.md` / `comprehensive-report.md` / `divination-consultation.md` / `fengshui-consultation.md` / `health-consultation.md` / `marriage-consultation.md`）：AI 工作流用的报告骨架 → **倾向归 skill**
- `visual-report.md`：阶段 2.5 会被"激活式 SVG 报告 prompt"取代，届时归平台并重写。阶段 1 暂留平台。

建议：6 个 AI 报告模板复制到 `skill/templates/`，`visual-report.md` 留平台待阶段 2.5 重写。

### 1.4.2 `RULES.md`（145 行 AI 行为规则）

是 AI agent 的行为约束 → 归 skill。根目录是否保留副本？建议：移到 `skill/RULES.md`，根目录删除（平台不需要 AI 行为规则）。

### 1.4.3 `TASTE_SKILL_UI.md`（5.5KB，UI 审美规范）

文件名带 SKILL，但内容是 Dashboard UI 规范 → **倾向归平台**（`docs/` 或根）。需确认。这份规范在阶段 2b 渲染核心剥离时是重要参照，应留在平台侧。

## 1.5 新 `skill/` 目录结构

```
skill/
├── SKILL.md            ≤300 行：路由 + 工具语义 + 降级指引 + 解读指引
├── README.md           一页：如何用；装了平台 MCP 则能力增强（含 SVG 报告）
├── RULES.md            AI 行为规则精简版（从 145 行瘦到 ~60 行）
├── reference-buddhism.md      精简版
├── reference-daoism.md        精简版
├── reference-metaphysics.md   精简版
├── reference-tcm.md           精简版
└── templates/          （若 §1.4.1 确认归 skill）
    ├── career-consultation.md
    ├── comprehensive-report.md
    ├── divination-consultation.md
    ├── fengshui-consultation.md
    ├── health-consultation.md
    └── marriage-consultation.md
```

> skill 子目录**无任何代码、无 package.json、无 node_modules**——纯 markdown，双击/复制即可用。这是"轻量"的硬约束。
>
> 可视化报告 prompt 模板属于 skill 还是平台，见阶段 2.5 §2.5.4。

## 1.6 新 `skill/SKILL.md` 大纲（逐段去留）

现 SKILL.md 463 行按下表瘦身，目标 ≤300 行：

| 现章节 | 行数 | 去留 | 处理 |
|--------|------|------|------|
| §0 首次安装与依赖检查 | 8–41 | **砍** | 全段挪到平台 README。skill 里只留一句"若已配平台 MCP 可直接调工具，否则按本 skill 指引做轻量解读" |
| MCP 自动激活 | 42–72 | **砍** | 挪到平台 README。skill 留一段"引擎按需激活"指引（见阶段 2.5 后补充） |
| 定位 | 73–84 | **留** | skill 核心，精简到 ~10 行 |
| 三层路由系统（问题分类/学科路由/融合深度） | 85–116 | **留** | skill 的路由价值所在，保留三层层级，砍掉与平台耦合的细节 |
| 核心工作流·标准咨询链路 | 117–145 | **留·瘦** | 留链路骨架，砍 Dashboard/HTML 报告相关步骤 |
| 核心工作流·详细步骤 | 146–201 | **砍** | 挪平台 README（操作步骤是平台用法） |
| 模式 A 子步骤 / Dashboard 能力边界 | 202–237 | **砍** | 挪平台 README |
| 两种可视化模式 A/B | 238–268 | **砍** | 挪平台 README。阶段 2.5 后改为"激活式 SVG 报告"指引 |
| 具体咨询场景工作流（5 场景） | 269–391 | **留·大瘦** | 每场景只留"调什么工具 + 解读要点"，砍重复详细步骤。5 场景从 ~120 行压到 ~60 行 |
| 报告输出格式 | 392–408 | **留·瘦** | 留 AI 输出指引，指向 templates；阶段 2.5 后指向可视化报告 prompt |
| 工具集成（bootstrap） | 409–424 | **砍** | 挪平台 README |
| 可视化交互工具（visual/） | 425–451 | **砍** | 挪平台 README |
| 知识参考 | 452–463 | **留** | 指向 skill/reference-*.md |

预估瘦身后：定位(10) + 三层路由(30) + 标准链路(20) + 5场景精简(60) + 报告格式(15) + 知识参考(10) + 头部frontmatter/激活条件(25) + 工具语义补充(30) ≈ **200 行**，留余量到 ≤300。

### 新 SKILL.md 补充内容（现版缺失、skill 该有的）

- **激活条件**（frontmatter description 已有，正文补"何时自动激活"）
- **工具语义表**：22 计算 + 8 combo + 2 元工具，每个一行"工具名 → 何时调 → 关键输入 → 输出怎么解读（data 字段 + 是否带 svg）"。这是 skill 对 AI 的核心价值，现版散落在各场景里，应集中一张表。阶段 2c 后此表注明"工具返回含 svg 字段"。
- **降级指引**：平台 MCP 不可用时，AI 如何用自身能力做轻量解读（不瞎编排盘，只做知识性解读）。
- **引擎按需激活指引**（阶段 2 落地后补）：用户要某类测算但引擎未激活时，AI 如何 `npm install` + 配 MCP 自主激活。

## 1.7 平台 README 需要接管的内容

从 SKILL.md 砍下来的内容并入 `README.md`（平台文档），新增/补全章节：

1. **首次安装与依赖检查**（现 SKILL.md §0）
2. **MCP 自动激活**（现 SKILL.md §MCP 段）
3. **三种使用方式**：双击 `visual/index.html` / 配 MCP / 命令行 Python oracle
4. **三层架构说明**（引擎库 + MCP 壳 + Dashboard，这是平台架构，不是 skill 架构）
5. **可视化模式 A/B**（现 SKILL.md §两种可视化模式；阶段 2.5 后更新为激活式 SVG 报告）
6. **工具集成（bootstrap + visual/）**（现 SKILL.md §工具集成）

`README_AI.md` 同步调整：它面向"在平台上做开发的 AI"，保留平台开发指引，删除 skill 路由内容。

## 1.8 根目录与包元数据改造（阶段 1）

- `package.json`（根）name：`chinese-traditional-wisdom-ai-agent-workflow` → `chinese-wisdom-platform`；删除过时依赖 `bazi-ziwei-skill`（架构重构后已不用）。阶段 2 会进一步重组为 monorepo。
- 根 `SKILL.md`：拆分完成后**删除**（内容已迁入 `skill/SKILL.md` + 平台 README）。或保留一个 3 行的指针文件指向 `skill/SKILL.md`，避免外部旧链接 404。
- `ROADMAP.md` / `EVOLUTION.md` / `tool-index.md`：通读，删除"skill 路由 / 三层 skill 架构"相关表述，改为平台口径。

## 1.9 阶段 1 执行步骤（审阅通过后按序执行，每步可独立验证）

1. **建 `skill/` 子目录**，写入瘦身版 `SKILL.md`（按 §1.6 大纲）
2. **精简 `reference-*.md`** 4 份 → 复制到 `skill/`
3. **精简 `RULES.md`** → `skill/RULES.md`（根目录按 §1.4.2 决定处理）
4. **写 `skill/README.md`** 一页使用说明
5. **处理 `templates/`**（按 §1.4.1 决定）
6. **平台 README 接管**砍下来的内容（按 §1.7）
7. **根 SKILL.md 删除或改指针**（按 §1.8）
8. **包元数据与文档口径对齐**（按 §1.8）
9. **跑测试**：`pnpm test`（visual 单元 + e2e + mcp-server）确认 175 测试无回归
10. **提交**：`refactor: 拆分 skill 与平台为两个独立产品`

> 步骤 1–5 只新增 `skill/` 内容，不改平台代码，零回归风险。步骤 6–8 改文档，不动代码。步骤 9 验证。全程不碰 `apps/` 引擎代码。

---

# 阶段 2：引擎层 npm 包化

## 2.0 阶段目标

把引擎层从 `apps/visual/src/legacy/` 抽成独立 npm 包，可 `npm install` / `npx`。AI agent 按需自主安装激活。包导出三类能力：**算力 + 渲染核心 + MCP server**。

```
chinese-wisdom-engine（npm 包，建议 scoped: @chinese-wisdom/engine 或单名 chinese-wisdom-mcp）
├── 引擎算力    calculateBazi / arrangeQimen / ... → ToolEnvelope<TData>
├── 渲染核心    renderZiweiGrid(data) → svgString / renderHuangjiCircle(data) → svgString  ← 阶段 2b 新增
└── MCP server  npx chinese-wisdom-mcp → 24 工具暴露，工具返回 data + svg
```

## 2.1 现状可行性评估

- ✅ **引擎已纯 TS、零 DOM、统一 envelope**（架构重构完成）→ 抽包的算力部分基本就绪
- ✅ **`modules.ts` 声明式注册**（24 模块）→ 利于后续按激活状态组织
- ✅ **MCP server 已是薄壳**，复用 legacy 引擎 → 改成依赖包即可
- ⚠️ **渲染核心尚未剥离**：30 个 React 组件（`components/shared/*Chart.tsx`）几何逻辑与 React 耦合，需抽成纯函数 → 阶段 2b 的核心工作
- ⚠️ **monorepo 化**：当前 `apps/visual` + `apps/mcp-server` 平铺，抽包需引入 `packages/` 结构

### 渲染核心剥离可行性（已抽样核实）

- `ZiweiPalaceGrid.tsx`（316 行）：React 仅 `useMemo` 缓存，其余纯几何 + JSX 渲染 SVG → **可剥离**
- `HuangjiGuaCircle.tsx`（291 行）：React 仅 `useState`（hover/选中）→ **可剥离**（交互留 React，几何抽纯函数）
- 结论：核心 SVG 视觉可剥离成"纯函数：数据 → SVG 字符串"，React 与静态生成共用同一份几何。方向成立。

## 2.2 阶段 2a：引擎算力纯函数化 + envelope 收尾

**现状基本就绪，收尾项：**

1. 把 `apps/visual/src/legacy/` 中 40 引擎重组为 `packages/engine/src/`（或先保留原位，阶段 2c 再物理迁移）
2. 确认所有引擎入口为纯函数、零 DOM、零 React import
3. envelope 类型统一导出（`ToolEnvelope<TData>`）
4. 外部依赖（`lunar-javascript` / `iztro` / `3meta`）声明为 `dependencies` 或 `peerDependencies`（见 §2.6）

## 2.3 阶段 2b：渲染核心纯函数化 ★关键新增工作

**目标：** 把 30 个 React 组件的几何/配色/布局逻辑抽成纯函数 `renderXxx(data, opts?) → svgString`，React 组件改成调这些函数 + 绑交互。

### 剥离原则

| 留在纯函数（渲染核心） | 留在 React 组件（Dashboard 交互层） |
|------------------------|--------------------------------------|
| 所有几何计算（坐标、尺寸、布局） | `useState` / `useMemo` 等状态 |
| 配色、字号、stroke 宽度 | hover / 选中 / 缩放等事件 |
| SVG 元素生成（path/circle/text） | JSX 包裹 + 事件绑定 |
| 数据 → SVG 字符串 | props 透传 + 交互状态切换 |

### 剥离粒度（待用户拍板，见 §2.7.1）

- **方案先少后多（推荐）**：先剥离 3–4 个代表性组件跑通全链路（紫微盘 / 皇极圆图 / 八字柱 / 六爻卦），验证"引擎→渲染核心→MCP 返回 SVG→prompt 拼装报告"视觉一致性，再批量铺开
- **方案一次全做**：30 个组件一次性剥离，工作量大、回归风险高

### 剥离后包导出

```ts
// packages/engine/src/render/index.ts
export { renderZiweiGrid } from './ziweiGrid';      // (data) => svgString
export { renderHuangjiCircle } from './huangjiCircle';
export { renderBaziPillars } from './baziPillars';
export { renderHexagram } from './hexagram';
// ... 其余渲染核心
```

### React 组件改造

```tsx
// 改造前：几何 + JSX 耦合
export function ZiweiPalaceGrid({ data, size }) {
  const cell = size / COLS;
  // ... 300 行几何 + JSX
}

// 改造后：调渲染核心 + 绑交互
export function ZiweiPalaceGrid({ data, size }) {
  const svg = renderZiweiGrid(data, { size });
  return <div dangerouslySetInnerHTML={{ __html: svg }} onClick={...} />;
  // 或解析 svg 字符串为 React 元素以支持细粒度事件
}
```

> `TASTE_SKILL_UI.md` 的 UI 审美规范是剥离时的配色/布局参照，确保渲染核心产物与现 Dashboard 视觉一致。

## 2.4 阶段 2c：MCP server 包 + 工具返回 SVG

**目标：** MCP server 依赖引擎包，工具返回 `data + svg`，可 `npm install -g` 或 `npx` 免装运行。

### 工具返回结构扩展

`ToolEnvelope<TData>` 的 `data` 增加可选 `svg` 字段：

```ts
interface ToolEnvelope<TData> {
  ok: boolean;
  tool: string;
  version: string;
  input_normalized: ...;
  data: TData & { svg?: string };   // ← 新增：Dashboard 同源 SVG
  summary: string;
  warnings: string[];
  // ...
}
```

**为何工具直接返回 SVG（待用户拍板，见 §2.7.2）：**
- ✅ AI 调工具拿数据时顺带拿 SVG，零额外往返
- ✅ 报告生成闭环最顺：工具返回什么 SVG，报告就放什么，天然按激活引擎
- ⚠️ 工具输出变大（SVG 字符串长）—— 可考虑仅对"可视化类"工具返回 svg，纯数据工具（如 calc_xiyong）不返回

### MCP server 包化

- `packages/mcp-server/`，`bin` 指向 `npx chinese-wisdom-mcp`
- 依赖 `@chinese-wisdom/engine`（workspace 协议）
- `setup-mcp.mjs` 进包，AI 自主配置时调用

## 2.5 monorepo 结构

```
chinese-wisdom-platform/            （仓库根 = 平台）
├── packages/
│   ├── engine/                     ← 阶段 2a/2b：算力 + 渲染核心
│   │   ├── src/
│   │   │   ├── calc/               引擎算力（原 legacy）
│   │   │   └── render/             渲染核心纯函数（阶段 2b 新增）
│   │   └── package.json            @chinese-wisdom/engine
│   └── mcp-server/                 ← 阶段 2c：MCP 薄壳
│       ├── src/
│       └── package.json            @chinese-wisdom/mcp-server (bin: chinese-wisdom-mcp)
├── apps/
│   └── visual/                     Dashboard（依赖 packages/engine）
├── skill/                          ← 阶段 1：纯 markdown skill
├── package.json                    monorepo 根（pnpm workspace 或 npm workspaces）
└── ...（其余平台资产）
```

> Dashboard 改成从 `@chinese-wisdom/engine` import 引擎与渲染核心（而非相对路径），保持单源。React 组件调渲染核心 + 绑交互。

## 2.6 外部依赖策略

| 依赖 | 用途 | 包中声明 |
|------|------|----------|
| `lunar-javascript` | 节气/干支/八字精确历法 | `dependencies`（运行必需） |
| `iztro` | 紫微排盘 | `dependencies` |
| `3meta` | 奇门排盘 | `dependencies` |
| `@modelcontextprotocol/sdk` | MCP server | mcp-server 包 `dependencies` |
| `zod` | schema 校验 | mcp-server 包 `dependencies` |
| `react` / `react-dom` | Dashboard | apps/visual `dependencies`（不进 engine 包，渲染核心零 React） |

**硬约束：** `packages/engine` 必须**零 React 依赖**——渲染核心是纯函数产 SVG 字符串，不能 import React。这保证包既能在 Node（MCP）也能在浏览器（Dashboard）用，且 AI 静态生成报告时无需 React 运行时。

## 2.7 阶段 2 待用户确认项

### 2.7.1 渲染核心剥离粒度

- [ ] 先少后多（推荐）：先 3–4 个代表性组件跑通全链路再批量
- [ ] 一次性全做：30 个组件批量剥离

### 2.7.2 MCP 工具是否直接返回 SVG

- [ ] 返回（推荐）：可视化类工具 `data.svg` 带 SVG，纯数据工具不带
- [ ] 不返回：AI 额外调 `render_*` 工具拿 SVG（多一次往返）

### 2.7.3 npm 包名与 scope

- [ ] scoped：`@chinese-wisdom/engine` + `@chinese-wisdom/mcp-server`
- [ ] 单名：`chinese-wisdom-engine` + `chinese-wisdom-mcp`
- [ ] 其他（需考虑 npm 抢注）

### 2.7.4 monorepo 工具

- [ ] pnpm workspace（推荐，轻量）
- [ ] npm workspaces（零额外工具）
- [ ] turborepo / nx（重，当前规模不需要）

## 2.8 阶段 2 执行步骤

1. **monorepo 骨架**：建 `packages/` 结构，配 workspace（按 §2.7.4）
2. **2a 算力迁移**：`legacy/` → `packages/engine/src/calc/`，确认纯 TS 零 DOM
3. **2b 渲染核心剥离**：按 §2.7.1 粒度，从 React 组件抽 `renderXxx` 纯函数到 `packages/engine/src/render/`
4. **React 组件改造**：Dashboard 组件改调渲染核心 + 绑交互，视觉一致性校验（对比剥离前后截图）
5. **2c MCP server 包化**：`packages/mcp-server/` 依赖 engine，工具返回 data + svg（按 §2.7.2）
6. **envelope 扩展**：`data.svg` 可选字段，可视化类工具填充
7. **Dashboard import 切换**：从相对路径改 `@chinese-wisdom/engine`
8. **测试**：175 测试全过 + 新增渲染核心纯函数测试（`renderXxx(data)` 快照校验 SVG）
9. **本地包验证**：`npm pack` + 本地 install，确认 `npx chinese-wisdom-mcp` 可跑
10. **发布（可选，需 npm 账号）**：首次 `npm publish`（按 §2.7.3 包名）
11. **提交**：分步提交（monorepo / 算力迁移 / 渲染核心 / MCP 包化）

---

# 阶段 2.5：激活式可视化报告 prompt

## 2.5.1 现状与问题

现有 `templates/visual-report.md`（258 行）是"AI 拿测算数据填进 HTML 模板生成可视化报告"的 prompt 模板，含完整 HTML 骨架 + canvas + `REPORT_DATA` 注入位 + 模块隐藏规则（`ziwei-section style="display:none"`）。

**问题：**
1. 视觉质量低（canvas 手绘），远不及 Dashboard 精调的 SVG 圆图/宫位盘
2. 全量写死 24 模块骨架，靠 display:none 隐藏 → 不是真按需，且和"激活"脱钩
3. 隐藏逻辑是"有没有数据"，不是"引擎激活没"

## 2.5.2 目标：以 Dashboard UI 为核心的激活式 SVG 报告

**核心思想：** 可视化报告的视觉与 Dashboard **同源**——不是模仿，是共用同一套渲染核心（阶段 2b 产物）。AI 按上下文中已激活引擎调工具，工具返回 Dashboard 同款 SVG，AI 拼进轻量 HTML 壳。

### 为什么"以 Dashboard UI 为核心"成立

- 渲染核心纯函数（阶段 2b）= Dashboard 几何代码本身，剥离成 `数据 → SVG 字符串`
- MCP 工具返回 `data.svg`（阶段 2c）= 调工具即得 Dashboard 同款 SVG
- AI 只管"调哪些工具 + 拼装 SVG"，不手写图形代码 → 精度由渲染核心保证，规避 AI 现场生成 SVG 质量不可控问题

### 三层分离（与阶段 2 一致）

| 层 | 职责 | 形态 |
|----|------|------|
| 渲染核心（纯函数） | 数据 → SVG 字符串。所有几何/配色/布局。零 React。 | 阶段 2b 产物，进 npm 包 |
| Dashboard 消费 | 包 React 组件 + 绑交互 | React 组件，留 Dashboard |
| prompt 生成消费 | AI 调工具拿 svg，拼进静态 HTML 壳 | 阶段 2.5 的 prompt 模板 |

## 2.5.3 新 prompt 模板设计

取代 `templates/visual-report.md`，新模板（暂名 `visual-report-prompt.md`）内容：

### 模板结构

```markdown
# 激活式可视化报告生成 prompt

## 使用方式
1. 根据用户问题 + 已激活引擎，调对应 MCP 工具（见 skill 工具语义表）
2. 每个工具返回 data + svg（Dashboard 同源 SVG）
3. 把返回的 svg 按下方 HTML 壳拼装，只放本次实际调用的工具的 svg
4. 保存为 visual-report-{脱敏标识}.html

## HTML 壳（轻量，无全量骨架）
<!DOCTYPE html>
<html>...<style>/* Dashboard 同源配色，引 TASTE_SKILL_UI 规范 */</style>
<body>
  <header>标题 + 脱敏标识 + 日期</header>
  {{SECTIONS}}    ← AI 在此插入本次调用的各工具 svg + 文字解读
  <footer>文化参考声明</footer>
</body></html>

## 每个 section 的拼装规则
<section>
  <h2>{工具中文名}</h2>
  {tool返回的 svg}
  {data.summary 的文字解读}
</section>

## 按需原则
- 只拼装本次实际调用并返回了 svg 的工具
- 未激活的引擎不调用，其 section 不出现
- 纯数据工具（无 svg）只放文字解读，不放图形
```

### 与旧模板的关键差异

| 旧 `visual-report.md` | 新 `visual-report-prompt.md` |
|------------------------|------------------------------|
| 全量 24 模块 canvas 骨架 + display:none | 轻量 HTML 壳 + `{{SECTIONS}}` 占位 |
| AI 填 `REPORT_DATA` + 内嵌 canvas 绘制代码 | AI 插入工具返回的 SVG 字符串 |
| 视觉 = 简陋 canvas | 视觉 = Dashboard 同源 SVG |
| 按数据有无显隐 | 按激活/调用与否拼装 |

## 2.5.4 归属（待定）

- **倾向归 skill**：这是 AI 工作流的 prompt 指引，属于 skill 那层。skill 文档里引用此模板。
- 平台保留 `templates/visual-report.md` 作为历史/fallback，或直接替换。

需确认：新 prompt 模板放 `skill/templates/visual-report-prompt.md` 还是平台 `templates/`。

## 2.5.5 阶段 2.5 执行步骤

1. 阶段 2b 渲染核心 + 2c 工具返回 svg 落地后启动
2. 写新 prompt 模板 `visual-report-prompt.md`（按 §2.5.3）
3. 更新 `skill/SKILL.md` 报告输出格式段，指向新模板
4. 更新平台 README 可视化模式段
5. 端到端验证：AI 调一个工具 → 拿 svg → 拼装 HTML → 双击打开，视觉与 Dashboard 一致
6. 旧 `visual-report.md` 替换或标记 deprecated
7. 提交

---

# 阶段 3：Dashboard 降级为可选工具

## 3.1 定位变化

有了阶段 2.5 的"激活式 SVG 报告"，面向 AI agent 的可视化产物由 prompt + AI 生成，**Dashboard 不再需要改造成激活式壳**。它降级为：

- **开发/演示工具**：开发渲染核心时实时预览、对照视觉
- **交互式探索**：给想手动调参探索的用户（非 AI agent 路径）
- **可视化回归基线**：渲染核心产物与 Dashboard 截图对比，保证同源

## 3.2 不做的事

- ❌ 不改造成"按激活引擎渲染"的插件式壳（阶段 2.5 已用更优方式解决按需）
- ❌ 不做浏览器端激活探测（AI 上下文已知，无需）
- ❌ 不强求 Dashboard 与 npm 包同步分发（它留仓库，作为平台演示前端）

## 3.3 保留的事

- ✅ Dashboard 继续从 `@chinese-wisdom/engine` import 引擎 + 渲染核心，单源
- ✅ React 组件调渲染核心 + 绑交互，视觉与报告同源
- ✅ 作为渲染核心回归测试的视觉基线

---

# 风险与回退（全阶段）

## 阶段 1
- **风险低**：只重组 markdown，不动代码
- **回退**：`git revert` 单次提交

## 阶段 2
- **风险中**：monorepo 重组 + 渲染核心剥离触及核心代码
- **缓解**：渲染核心剥离按 §2.7.1 先少后多，每组件剥离后对比截图；monorepo 可先在分支验证
- **回退**：分步提交，可 revert 到任意阶段点

## 阶段 2.5
- **风险低**：只新增 prompt 模板 + 改文档
- **依赖**：必须阶段 2b/2c 落地（工具返回 svg）才有意义

## 阶段 3
- **风险低**：基本不动代码，只是定位调整 + 文档说明

---

# 待用户确认项汇总

## 阶段 1（§1.4）
1. `templates/` 归属：6 个 AI 报告模板归 skill / `visual-report.md` 留平台待 2.5 重写？
2. `RULES.md`：移到 `skill/` 后根目录是否保留副本？
3. `TASTE_SKILL_UI.md`：归平台 `docs/` 还是保留在根？
4. 根 `SKILL.md`：删除还是保留 3 行指针文件？
5. 新 SKILL.md 是否补"工具语义表 + 降级指引"两节（推荐补）？

## 阶段 2（§2.7）
6. 渲染核心剥离粒度：先少后多（推荐）还是一次性全做？
7. MCP 工具是否直接返回 SVG（推荐返回，仅可视化类工具）？
8. npm 包名与 scope：`@chinese-wisdom/*` 还是单名 `chinese-wisdom-*`？
9. monorepo 工具：pnpm workspace（推荐）还是 npm workspaces？

## 阶段 2.5（§2.5.4）
10. 新可视化报告 prompt 模板归 skill 还是平台？

---

# 推进建议

1. **先审本计划**，确认 §待确认项 10 个选择
2. **先做阶段 1**（零风险，立刻让 skill 轻），不依赖 npm 发布
3. **阶段 2 分子阶段推进**：2a（算力收尾）→ 2b（渲染核心，先少后多）→ 2c（MCP 包），每步验证
4. **阶段 2.5 在 2b/2c 后启动**，端到端跑通激活式 SVG 报告闭环
5. **阶段 3 随顺调整**，不强求单独排期
6. **npm 发布（阶段 2 步骤 10）可选**：本地 `npm pack` 验证即可用，正式发布待 npm 账号 + 包名确定
