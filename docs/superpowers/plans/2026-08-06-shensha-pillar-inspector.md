# 神煞柱位完整检视 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将四柱主盘的神煞简称摘要改为可点击的柱位计数印章，并在主盘下方完整展示所选柱的神煞项目。

**Architecture:** `BaziPillarsChart` 只负责把传入神煞按柱统计，渲染可访问的 SVG 计数印章并发出选择事件。`BaziWorkspace` 保存活动柱位并从同一份 `result.shenSha` 过滤明细，负责默认选中、内联明细和响应式布局；不修改神煞推算引擎及现有全局神煞总览。

**Tech Stack:** React、TypeScript、SVG、Tailwind CSS、Vitest、Vite。

---

## 文件结构

- 修改：`apps/visual/src/components/shared/BaziPillarsChart.tsx`
  - 移除“前两项神煞简称 +N”布局，新增计数印章及键盘选择语义。
- 修改：`apps/visual/src/features/bazi/BaziWorkspace.tsx`
  - 保存活动柱位，默认选择第一个有神煞的柱，并渲染完整柱位神煞明细。
- 创建：`apps/visual/src/components/shared/BaziPillarsChart.test.tsx`
  - 覆盖计数、无神煞列、点击与键盘选择行为。

### Task 1: 为 SVG 柱位索引建立组件测试

**Files:**
- Create: `apps/visual/src/components/shared/BaziPillarsChart.test.tsx`
- Modify: `apps/visual/src/components/shared/BaziPillarsChart.tsx`

- [ ] **Step 1: 写入组件测试样本和失败断言**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BaziPillarsChart } from './BaziPillarsChart';

const pillars = {
  year: { stem: '甲', branch: '子', hidden: ['癸'] },
  month: { stem: '乙', branch: '丑', hidden: ['己', '癸', '辛'] },
  day: { stem: '丙', branch: '寅', hidden: ['甲', '丙', '戊'] },
  hour: { stem: '丁', branch: '卯', hidden: ['乙'] },
};

const shenSha = [
  { name: '天乙贵人', category: '贵人' as const, branch: '子', pillar: '年' as const, meaning: '逢凶化吉。' },
  { name: '文昌贵人', category: '文昌' as const, branch: '子', pillar: '年' as const, meaning: '主文思。' },
  { name: '金舆', category: '金舆' as const, branch: '寅', pillar: '日' as const, meaning: '主福气。' },
];

describe('BaziPillarsChart 神煞柱位索引', () => {
  it('仅为命中神煞的柱渲染准确计数', () => {
    render(<BaziPillarsChart pillars={pillars} shenSha={shenSha} />);
    expect(screen.getByRole('button', { name: '年柱神煞，2 项' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '日柱神煞，1 项' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /月柱神煞/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /时柱神煞/ })).not.toBeInTheDocument();
  });

  it('点击或键盘操作会选择对应柱', () => {
    const onSelect = vi.fn();
    render(<BaziPillarsChart pillars={pillars} shenSha={shenSha} activeShenShaPillar="年" onSelectShenShaPillar={onSelect} />);
    const day = screen.getByRole('button', { name: '日柱神煞，1 项' });
    fireEvent.click(day);
    fireEvent.keyDown(day, { key: 'Enter' });
    fireEvent.keyDown(day, { key: ' ' });
    expect(onSelect).toHaveBeenNthCalledWith(1, '日');
    expect(onSelect).toHaveBeenNthCalledWith(2, '日');
    expect(onSelect).toHaveBeenNthCalledWith(3, '日');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test:unit -- BaziPillarsChart.test.tsx`

Expected: FAIL，提示 `activeShenShaPillar` / `onSelectShenShaPillar` props 不存在，或无法找到 `role="button"` 的神煞印章。

- [ ] **Step 3: 扩展组件 props 与神煞计数类型**

在 `BaziPillarsChart.tsx` 的 `BaziPillarsChartProps` 中加入：

```ts
activeShenShaPillar?: '年' | '月' | '日' | '时' | null;
onSelectShenShaPillar?: (pillar: '年' | '月' | '日' | '时') => void;
```

将组件参数改为：

```ts
export function BaziPillarsChart({
  pillars,
  size = 620,
  shenSha,
  activeShenShaPillar,
  onSelectShenShaPillar,
}: BaziPillarsChartProps) {
```

- [ ] **Step 4: 以可访问计数印章替换简称布局**

替换当前神煞行的 `shown`、`extra`、`chips` 逻辑。对有神煞的柱渲染一个 SVG `<g>`，示例：

```tsx
const pillar = pillarKeyOf(col.label) as '年' | '月' | '日' | '时';
const count = ss.length;
const selected = pillar === activeShenShaPillar;
const sealX = x + 8;
const sealY = hiddenY + 46;

<g
  role="button"
  tabIndex={0}
  aria-label={`${col.label}神煞，${count} 项`}
  aria-pressed={selected}
  onClick={() => onSelectShenShaPillar?.(pillar)}
  onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectShenShaPillar?.(pillar);
    }
  }}
  style={{ cursor: onSelectShenShaPillar ? 'pointer' : 'default' }}
>
  <rect
    x={sealX}
    y={sealY}
    width={cellW - 16}
    height={26}
    rx={4}
    fill={selected ? 'rgb(var(--cinnabar) / 0.16)' : 'rgb(var(--cinnabar) / 0.06)'}
    stroke={selected ? 'rgb(var(--cinnabar) / 0.72)' : 'rgb(var(--cinnabar) / 0.32)'}
  />
  <text x={sealX + (cellW - 16) / 2} y={sealY + 14} textAnchor="middle" dominantBaseline="middle" fill="rgb(var(--cinnabar) / 0.9)" style={{ fontSize: 10, fontWeight: 600 }}>
    神煞 {count}
  </text>
</g>
```

删除简称截断、`+N` 和双列文字布局。保持 SVG 总高度为 `500`，因为计数印章沿用现有神煞行的垂直位置。

- [ ] **Step 5: 运行组件测试确认通过**

Run: `pnpm test:unit -- BaziPillarsChart.test.tsx`

Expected: PASS，两个测试均通过。

- [ ] **Step 6: 提交组件索引与测试**

```bash
git add apps/visual/src/components/shared/BaziPillarsChart.tsx apps/visual/src/components/shared/BaziPillarsChart.test.tsx
git commit -m "feat(bazi): 主盘改用神煞柱位计数印章"
```

### Task 2: 在八字工作区展示完整柱位神煞

**Files:**
- Modify: `apps/visual/src/features/bazi/BaziWorkspace.tsx:1-310`
- Test: `apps/visual/src/components/shared/BaziPillarsChart.test.tsx`

- [ ] **Step 1: 添加柱位状态和默认选择派生值**

在 `BaziWorkspace` 内添加：

```ts
const [activeShenShaPillar, setActiveShenShaPillar] = useState<'年' | '月' | '日' | '时' | null>(null);
const shenSha = result?.shenSha ?? [];
const firstShenShaPillar = (['年', '月', '日', '时'] as const).find((pillar) => shenSha.some((item) => item.pillar === pillar)) ?? null;
const selectedShenShaPillar = activeShenShaPillar && shenSha.some((item) => item.pillar === activeShenShaPillar)
  ? activeShenShaPillar
  : firstShenShaPillar;
const selectedShenShaItems = selectedShenShaPillar
  ? shenSha.filter((item) => item.pillar === selectedShenShaPillar)
  : [];
```

`useState` 已在该文件的 React import 中时只新增状态调用；若未导入 `useState`，将其加入既有 React import。

- [ ] **Step 2: 向主盘传入选择状态与回调**

替换现有调用：

```tsx
<BaziPillarsChart pillars={pillars} shenSha={result?.shenSha} />
```

为：

```tsx
<BaziPillarsChart
  pillars={pillars}
  shenSha={shenSha}
  activeShenShaPillar={selectedShenShaPillar}
  onSelectShenShaPillar={setActiveShenShaPillar}
/>
```

- [ ] **Step 3: 在主盘下方添加内联完整明细**

紧跟 `canvas-stage` 容器后、主盘 `<section>` 结束前添加：

```tsx
{selectedShenShaPillar && selectedShenShaItems.length > 0 && (
  <section className="mt-4 border-t border-jade-500/16 pt-4" aria-labelledby="pillar-shensha-title">
    <div className="mb-3 flex items-center justify-between">
      <h4 id="pillar-shensha-title" className="text-sm font-semibold text-jade-100">
        {selectedShenShaPillar}柱神煞
      </h4>
      <span className="rounded-full border border-cinnabar-500/25 bg-cinnabar-500/10 px-2 py-0.5 text-[11px] text-cinnabar-500">
        {selectedShenShaItems.length} 项
      </span>
    </div>
    <ul className="space-y-2">
      {selectedShenShaItems.map((item) => (
        <li key={`${item.name}-${item.branch}-${item.pillar}`} className="rounded-card border border-white/8 bg-white/[0.025] px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-jade-50">{item.name}</span>
            <span className="text-xs text-cinnabar-500/85">{item.category}</span>
            <span className="text-xs text-jade-100/50">临{item.branch}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-jade-100/60">{item.meaning}</p>
        </li>
      ))}
    </ul>
  </section>
)}
```

- [ ] **Step 4: 验证默认柱和切换结果**

启动开发服务器：`pnpm dev`

在八字工作区输入或保留一个包含神煞的命盘。确认：

1. 第一根有神煞的柱自动显示为活动状态，主盘下方出现其完整明细。
2. 点击其他带“神煞 N”的柱后，标题和列表切换到该柱。
3. 每个列表条目显示全名、类别、`临{地支}` 和 `meaning`。
4. 没有神煞的命盘不显示印章和明细区。

- [ ] **Step 5: 运行完整验证**

Run: `pnpm typecheck && pnpm test && pnpm test:unit`

Expected: 三个命令均以 exit code 0 结束；smoke 输出 `failed: 0`。

- [ ] **Step 6: 提交工作区明细功能**

```bash
git add apps/visual/src/features/bazi/BaziWorkspace.tsx
git commit -m "feat(bazi): 展示柱位完整神煞明细"
```

### Task 3: 视觉与可访问性复核

**Files:**
- Modify: `apps/visual/src/components/shared/BaziPillarsChart.tsx`（仅在发现实际问题时）
- Modify: `apps/visual/src/features/bazi/BaziWorkspace.tsx`（仅在发现实际问题时）

- [ ] **Step 1: 在桌面与窄屏检查 SVG 和明细区**

使用浏览器在八字工作区检查：

- SVG 内不再出现神煞名称或 `+N`，只有不重叠的“神煞 N”印章。
- 当前柱印章与非当前柱具有可辨别的朱砂状态差异。
- 窄屏下完整说明自然换行，页面可横向查看 SVG，不裁切明细文本。

- [ ] **Step 2: 键盘验证**

将焦点移动到任一“神煞 N”印章，按 Enter 和 Space。确认二者都切换柱位明细，且活动印章的 `aria-pressed` 为 `true`。

- [ ] **Step 3: 修复仅限验收中发现的问题并重跑验证**

Run: `pnpm typecheck && pnpm test && pnpm test:unit`

Expected: exit code 0，所有测试通过。

- [ ] **Step 4: 提交视觉或可访问性收尾（若有变更）**

```bash
git add apps/visual/src/components/shared/BaziPillarsChart.tsx apps/visual/src/features/bazi/BaziWorkspace.tsx
git commit -m "fix(bazi): 完善神煞柱位检视交互"
```
