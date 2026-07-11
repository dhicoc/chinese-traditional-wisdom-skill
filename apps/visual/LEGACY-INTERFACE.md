# React Shell ↔ Legacy 引擎接口约束

> 本文档固化 React Shell 与旧 `visual/js/` 引擎之间的接口契约。
> 目的：当后续用真实引擎（如 lunar-javascript 精确历法）替换 demo / local-approx 模块时，
> 只需满足同一契约，无需改动 React 工作区层。

> **2026-07-10 架构重构后补充**：本文档固化的旧 `visual/js/` 契约仍有效（作 fallback），但推荐路径已变为**纯 TS enveloped 引擎**（`apps/visual/src/legacy/*Engine.ts`，零 DOM 依赖，统一返回 `ToolEnvelope`）。BaziWorkspace/ZiweiWorkspace/LiuyaoWorkspace/QimenWorkspace 已优先用纯 TS 引擎，失败回退本文档固化的旧契约。MCP server（`apps/mcp-server/`）直接 import 纯 TS 引擎，不经本文档的 Legacy 桥接层。详见 `EVOLUTION.md` 2026-07-10 节与 `tool-index.md`「纯 TS 引擎 + ToolEnvelope」节。

## 1. 分层架构

```
┌─────────────────────────────────────────────────────┐
│  React 工作区层 (features/<module>/<Module>Workspace.tsx)  │
│  职责：状态、输入控件、摘要展示、CopyContext、路由     │
├─────────────────────────────────────────────────────┤
│  Renderer 包装层 (legacy/canvasRenderers.ts)          │
│  职责：类型安全包装、null 检查、抛错                  │
│  ← 本文档固化的契约边界                               │
├─────────────────────────────────────────────────────┤
│  Legacy 桥接层 (legacy/loadLegacyScripts.ts)          │
│  职责：?raw 导入 + new Function 执行 + window 桥接    │
├─────────────────────────────────────────────────────┤
│  旧引擎 (visual/js/*.js)                              │
│  CORE / VizModules / YunqiEngine / ToolManifest      │
└─────────────────────────────────────────────────────┘
```

**核心原则**：React 工作区层只调用 `canvasRenderers.ts` 导出的函数，**绝不**直接访问 `window.LegacyVizModules` / `window.LegacyCORE`。

## 2. Legacy 桥接契约

`loadLegacyScripts.ts` 通过 Vite `?raw` 导入并 `new Function` 执行旧脚本，执行后必须在 `window` 上桥接：

| 全局变量 | 来源 | 类型 |
|---|---|---|
| `window.LegacyCORE` | `visual/js/core.js` 的 `CORE` | `LegacyCORE` |
| `window.LegacyVizModules` | `core.js` 的 `VizModules` | `LegacyVizModules` |
| `window.LegacyRegisterVizModule` | `core.js` 的 `registerVizModule` | 函数 |
| `window.YunqiEngine` | `visual/js/engines/yunqi-engine.js` | `{ calculate(year): YunqiData }` |
| `window.ToolManifest` | `visual/js/tool-manifest.js` | `ToolManifest` |
| `window.CapabilityRegistry` | `visual/js/capabilities.js` | `CapabilityRegistry` |

`loadLegacyScripts()` 是幂等的（内部 `legacyLoadPromise` 缓存），返回 `LegacyState`：
- `{ mode: 'ready' }` — 桥接成功
- `{ mode: 'error', error: string }` — 执行失败

## 3. Renderer 包装契约

`canvasRenderers.ts` 对每个旧 renderer 提供：一个 `renderLegacy*` 函数 + 对应的输入类型。所有函数签名统一为 `(canvasId: string, data: TData) => void`，模块未加载时抛 `Error`。

### 3.1 八字 / 五行（bazi 模块）

```ts
renderLegacyBazi(canvasId, pillars: BaziPillars): void
renderLegacyWuxing(canvasId, stats: WuxingStats): void

interface BaziPillars {
  year:  { stem: string; branch: string; hidden?: string[] };
  month: { stem: string; branch: string; hidden?: string[] };
  day:   { stem: string; branch: string; hidden?: string[] };
  hour:  { stem: string; branch: string; hidden?: string[] };
  dayMaster: string;
  gender: string;
}
type WuxingStats = Record<'木' | '火' | '土' | '金' | '水', number>;
```

### 3.2 五运六气（health 模块 + YunqiEngine）

```ts
calculateLegacyYunqi(year: number): YunqiData      // 调用 YunqiEngine.calculate
renderLegacyYunqi(canvasId, data: YunqiData): void

interface YunqiData {
  year: number;
  tiangan: string;
  dizhi: string;
  wuyun: { dayun: string; zhuyun: string[]; keyun: string[] };
  liuqi: {
    sitian: string;
    zaiquan: string;
    zhuke: Array<{ step: string; qi: string; start: string; end: string; zhuqi?: string }>;
    current_step?: unknown;
    kezhujialin?: string;
  };
  disease_tendency?: string;
  engineName?: string;
  mode?: string;
  confidenceNote?: string;
}
```

### 3.3 体质辨识（health 模块）

```ts
renderLegacyConstitution(canvasId, data: ConstitutionData): void
deriveDominantConstitution(scores: ConstitutionScores): ConstitutionType | ''

interface ConstitutionData {
  scores: ConstitutionScores;   // 九种体质 0-100
  dominant: ConstitutionType | '';
}
```

`deriveDominantConstitution` 取最高分，与旧 `updateConstitution()` 规则一致；全 0 返回 `''`。

### 3.4 风水（fengshui 模块 + CORE）

```ts
renderLegacyCompass(canvasId): void                          // 二十四山罗盘，无输入
renderLegacyFlyingStars(canvasId, data: FlyingStarsData): void
renderLegacyEightMansions(canvasId, data: EightMansionsData): void

interface FlyingStarsData { year: number }
interface EightMansionsData { year: number; gender: '男' | '女' }
```

### 3.5 占卜（divination 模块）

```ts
renderLegacyLiuyao(canvasId, data: LiuyaoData): void
renderLegacyMeihua(canvasId, data: MeihuaData): void
```

类型定义见 `legacy/divinationTypes.ts`。

## 4. LegacyCORE 只读摘要契约

部分工作区需要从旧 CORE 读取摘要用于 React 侧展示（不绘制）：

```ts
getFeixingSummary(year): FlyingStarsSummary | null
//   从 CORE.getFlyingStars(year)['中'] 派生星名/五行/吉凶

getBazhaiSummary(year, gender): EightMansionsSummary | null
//   从 CORE.calcMingGua(year, gender) 派生命卦/东西四命
```

`LegacyCORE` 完整契约（`legacyPrivateTypes.ts`）：

```ts
interface LegacyCORE {
  nineStars: { name: string; wuxing: string; luck: string }[];  // 长度 9，下标 0 对应一白
  getFlyingStars(year: number): Record<string, number>;          // 宫位名 → 星号 1-9
  calcMingGua(year: number, gender: string): { trigram: string; group: string };
}
```

## 5. 引擎替换指南

当用真实引擎替换某模块时，保持 React 工作区层不变，只需：

1. **新建引擎 adapter**，实现与该模块对应的 renderer 包装函数签名
   - 例如替换八字 demo：新 adapter 仍导出 `renderLegacyBazi(canvasId, pillars)` + `BaziPillars` 类型
2. **可选**：在 `loadLegacyScripts.ts` 中用新引擎脚本替换旧脚本，或保留旧脚本仅替换计算部分
3. **能力模式升级**：更新 `lib/modules.ts` 中该模块的 `status`（如 `demo` → `local-exact`），verify 页徽章会自动反映
4. **smoke test** 自动校验 renderer 包装函数仍存在，无需改动

### 替换优先级建议

| 模块 | 当前模式 | 替换目标 | 契约复杂度 |
|---|---|---|---|
| `ziwei` | demo | local-exact（紫微斗数真实排盘） | 高（十二宫 + 星曜） |
| `liuyao` | demo | local-exact（纳甲真实规则） | 中（六亲 + 六神 + 世应） |
| `meihua` | local-approx | local-exact（补数字起卦） | 低（仅扩展起卦入口） |
| `bazi` | local-exact | 精确历法（lunar-javascript） | 低（已 local-exact，仅增强精度） |

## 6. 不变量（替换时必须保持）

- React 工作区层不直接访问 `window.Legacy*`
- 所有 renderer 包装函数在模块未加载时抛 `Error`，不静默失败
- `CanvasPanel` 通过 `ready` prop 控制 renderer 调用时机，renderer 内部不做 ready 判断
- 输入类型（`BaziPillars` 等）从 `baseTypes.ts` / `divinationTypes.ts` 导出，是跨层共享契约
- `loadLegacyScripts()` 必须幂等，多次调用返回同一 Promise
