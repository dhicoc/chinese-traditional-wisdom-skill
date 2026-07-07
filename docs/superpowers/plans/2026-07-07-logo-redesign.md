# Logo Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visual app sidebar's current text-based `玄` seal with the approved pure-icon **玄轨星核** celestial-orbit logo.

**Architecture:** Add a focused React component for the decorative sidebar logo, then swap it into the existing sidebar brand seal. Keep the existing `.brand-seal` container and sidebar copy intact; only the icon content changes.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS utility classes, Vitest, existing Node smoke script.

---

## Files and Responsibilities

- Create: `apps/visual/src/components/app-shell/XuanOrbitLogo.tsx`
  - Owns the inline SVG logo markup.
  - Exposes a small, reusable decorative icon component.
  - Keeps SVG details out of `SidebarNav.tsx` so the sidebar remains readable.

- Modify: `apps/visual/src/components/app-shell/SidebarNav.tsx`
  - Imports `XuanOrbitLogo`.
  - Replaces the literal `玄` glyph inside `.brand-seal` with the new icon.
  - Leaves brand text, layout, navigation, and footer status unchanged.

- Modify: `apps/visual/src/__tests__/modules.test.ts`
  - Adds a lightweight static contract test that the logo component is decorative and contains the approved orbit/star structure.
  - This is intentionally static because the change is visual and the project already uses light structural tests.

- Modify: `apps/visual/scripts/smoke-react-shell.mjs`
  - Adds smoke checks that the sidebar imports and renders `XuanOrbitLogo`, and no longer renders the raw `玄` glyph inside the brand seal.

## Task 1: Add the logo component and unit contract

**Files:**
- Create: `apps/visual/src/components/app-shell/XuanOrbitLogo.tsx`
- Modify: `apps/visual/src/__tests__/modules.test.ts`

- [ ] **Step 1: Write the failing unit contract test**

Append this block to `apps/visual/src/__tests__/modules.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '..');

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(srcRoot, relativePath), 'utf8');
}

describe('XuanOrbitLogo', () => {
  it('should be a decorative celestial orbit icon with the approved structure', () => {
    const source = readSource('components/app-shell/XuanOrbitLogo.tsx');

    expect(source).toContain('export function XuanOrbitLogo');
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain('viewBox="0 0 100 100"');
    expect(source).toContain('data-logo-part="outer-disc"');
    expect(source).toContain('data-logo-part="horizontal-orbit"');
    expect(source).toContain('data-logo-part="vertical-orbit"');
    expect(source).toContain('data-logo-part="star-core"');
    expect(source).toContain('data-logo-part="anchor-star-left"');
    expect(source).toContain('data-logo-part="anchor-star-right"');
    expect(source).not.toContain('>玄<');
  });
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run from the repository root:

```powershell
npm --prefix "apps/visual" run test:unit -- --run src/__tests__/modules.test.ts
```

Expected: FAIL because `components/app-shell/XuanOrbitLogo.tsx` does not exist yet. The failure should mention `ENOENT` or that the file cannot be opened.

- [ ] **Step 3: Create the logo component**

Create `apps/visual/src/components/app-shell/XuanOrbitLogo.tsx` with exactly this content:

```tsx
interface XuanOrbitLogoProps {
  className?: string;
}

export function XuanOrbitLogo({ className }: XuanOrbitLogoProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        data-logo-part="outer-disc"
        cx="50"
        cy="50"
        r="42"
        stroke="currentColor"
        strokeWidth="4"
        opacity="0.96"
      />
      <circle
        cx="50"
        cy="50"
        r="31"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.34"
      />
      <path
        data-logo-part="horizontal-orbit"
        d="M16 50C30 33 70 33 84 50C70 67 30 67 16 50Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.78"
      />
      <path
        data-logo-part="vertical-orbit"
        d="M50 16C67 30 67 70 50 84C33 70 33 30 50 16Z"
        stroke="rgb(214 183 96)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.72"
      />
      <path
        data-logo-part="star-core"
        d="M50 31L55.5 44.5L69 50L55.5 55.5L50 69L44.5 55.5L31 50L44.5 44.5L50 31Z"
        fill="rgb(44 159 132 / 0.18)"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle data-logo-part="anchor-star-left" cx="28" cy="50" r="3" fill="rgb(158 240 214)" />
      <circle data-logo-part="anchor-star-right" cx="72" cy="50" r="3" fill="rgb(158 240 214)" />
      <circle cx="50" cy="50" r="3.5" fill="rgb(223 253 244)" />
    </svg>
  );
}
```

- [ ] **Step 4: Run the unit test to verify it passes**

Run from the repository root:

```powershell
npm --prefix "apps/visual" run test:unit -- --run src/__tests__/modules.test.ts
```

Expected: PASS. The existing module registry tests and the new `XuanOrbitLogo` test should pass.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
git add "apps/visual/src/components/app-shell/XuanOrbitLogo.tsx" "apps/visual/src/__tests__/modules.test.ts"
git commit -m @'
feat: add xuan orbit logo component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
'@
```

## Task 2: Integrate the logo into the sidebar brand seal

**Files:**
- Modify: `apps/visual/src/components/app-shell/SidebarNav.tsx`
- Modify: `apps/visual/scripts/smoke-react-shell.mjs`

- [ ] **Step 1: Write the failing smoke checks**

In `apps/visual/scripts/smoke-react-shell.mjs`, after the `countOccurrences` function and before the existing `check(exists(path.join(repoRoot, 'visual/react.html')),...` line, insert this block:

```js
// ── 0. Sidebar brand uses the custom 玄轨星核 logo ───────────
const sidebarNav = read(path.join(srcRoot, 'components/app-shell/SidebarNav.tsx'));
check(
  sidebarNav.includes("import { XuanOrbitLogo } from './XuanOrbitLogo';"),
  'SidebarNav 应导入 XuanOrbitLogo 作为侧边栏品牌图标',
);
check(
  sidebarNav.includes('<XuanOrbitLogo className="h-9 w-9 drop-shadow-[0_0_10px_rgba(44,159,132,0.72)]" />'),
  'SidebarNav 应在 brand-seal 中渲染 玄轨星核 图标',
);
check(
  !sidebarNav.includes('>\n            玄\n          </div>'),
  'brand-seal 不应继续直接渲染文字 玄',
);
```

- [ ] **Step 2: Run the smoke script to verify it fails**

Run from the repository root:

```powershell
npm --prefix "apps/visual" test
```

Expected: FAIL with messages including:

```text
SidebarNav 应导入 XuanOrbitLogo 作为侧边栏品牌图标
SidebarNav 应在 brand-seal 中渲染 玄轨星核 图标
brand-seal 不应继续直接渲染文字 玄
```

- [ ] **Step 3: Update the sidebar component**

Modify the top of `apps/visual/src/components/app-shell/SidebarNav.tsx` so the imports become:

```tsx
import type { ModuleGroup, ModuleId, WisdomModule } from '@/lib/modules';
import { MODULE_GROUPS, MODULES } from '@/lib/modules';
import { XuanOrbitLogo } from './XuanOrbitLogo';
```

Then replace this block:

```tsx
          <div className="brand-seal grid h-12 w-12 shrink-0 place-items-center rounded-full border border-jade-500/30 bg-jade-500/10 font-serif text-lg text-jade-400">
            玄
          </div>
```

with this block:

```tsx
          <div className="brand-seal grid h-12 w-12 shrink-0 place-items-center rounded-full border border-jade-500/30 bg-jade-500/10 text-jade-400">
            <XuanOrbitLogo className="h-9 w-9 drop-shadow-[0_0_10px_rgba(44,159,132,0.72)]" />
          </div>
```

- [ ] **Step 4: Run the smoke script to verify it passes**

Run from the repository root:

```powershell
npm --prefix "apps/visual" test
```

Expected: PASS. The script should report all smoke checks passed, including the new sidebar logo checks.

- [ ] **Step 5: Run the unit tests again**

Run from the repository root:

```powershell
npm --prefix "apps/visual" run test:unit -- --run src/__tests__/modules.test.ts
```

Expected: PASS. The `XuanOrbitLogo` contract test should still pass.

- [ ] **Step 6: Commit Task 2**

Run:

```powershell
git add "apps/visual/src/components/app-shell/SidebarNav.tsx" "apps/visual/scripts/smoke-react-shell.mjs"
git commit -m @'
feat: replace sidebar seal with xuan orbit logo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
'@
```

## Task 3: Visual verification in the running app

**Files:**
- No source changes expected.
- Use the running Vite app or start it if needed.

- [ ] **Step 1: Start or reuse the Vite dev server**

If the existing server at `http://127.0.0.1:5173/` is still running, reuse it. Otherwise run from the repository root:

```powershell
npm --prefix "apps/visual" run dev -- --host 127.0.0.1 --port 5173
```

Expected: Vite reports a local URL at `http://127.0.0.1:5173/`.

- [ ] **Step 2: Open the app in a browser**

Navigate to:

```text
http://127.0.0.1:5173/
```

Expected: The visual app loads with the dark jade instrument interface.

- [ ] **Step 3: Verify the sidebar brand logo**

At desktop width, inspect the upper-left sidebar brand block.

Expected:

- The former `玄` glyph is gone.
- The seal now shows a circular celestial-orbit icon.
- The icon has an outer ring, crossing orbits, a central star core, and two small side stars.
- The icon is centered inside the existing 48px seal and is not clipped.
- The adjacent text still reads `XUANTAN LOCAL` and `玄学排盘`.

- [ ] **Step 4: Verify the app still navigates**

Click one sidebar module such as `八字四柱` or `紫微斗数`.

Expected:

- The selected module changes.
- The sidebar remains visually stable.
- The logo remains visible and unchanged.

- [ ] **Step 5: Record final verification result**

If the verification passes, note this in the final implementation report:

```text
Verified in browser at http://127.0.0.1:5173/: sidebar logo replaced with 玄轨星核, brand text unchanged, navigation still works.
```

If the verification fails, do not commit a visual fix blindly. Capture what failed, adjust the component or sizing, re-run Task 1 and Task 2 checks, then repeat this visual verification.

## Self-review

- Spec coverage: The plan covers replacing the current `玄` glyph, keeping the sidebar copy and layout, using a pure icon, preserving small-size readability, using jade/gold colors, and verifying the app through the Vite flow.
- Placeholder scan: No `TBD`, `TODO`, `implement later`, or vague test instructions remain.
- Type consistency: The component is consistently named `XuanOrbitLogo`; the import path is `./XuanOrbitLogo`; test and smoke checks use the same name and exact SVG data attributes.
