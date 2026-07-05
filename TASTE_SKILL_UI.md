# dhicoc/chinese-traditional-wisdom-ai-agent-workflow - UI/UX Design System Spec
<!-- Target Agent: Claude Code / open-design / Cursor / Cline -->

## 1. Project Identity & Positioning

- **Core Nature:** An elite, data-driven dashboard that fuses ancient Chinese wisdom (八字/紫微/六爻/梅花/风水/五运六气) with rigorous software engineering (11 tabs, JSON deterministic maps, automated testing).
- **Design Paradigm:** **Neo-Chinese Dataviz (新中式数据主义)** / **Academic Dark Mode**. Avoid "fortune-telling" cliches or over-saturated cyberpunk neon. It must look like a high-end scientific instrument or a terminal for a professional modern scholar.
- **Implementation Strategy:** Pure Frontend, Agent-friendly component tree, utility-first styling.

## 2. Global Design Tokens (Theme Colors & Typography)

### Color Palette (Tailwind / Shadcn Config)

- **Background (Dark):** `#121212` (Deep Charcoal) / `#1a1c1e` (Ink Black)
- **Surface/Card:** `#1e1e24` / `#25262b` (1px subtle border `#2d2f36`)
- **Primary Accent:** `#ae2012` (Cinnabar Red 朱砂红) - Used ONLY for high-priority conclusions, activated hexagrams, and critical status.
- **Secondary Accent:** `#0a9396` (Jade Marine 碧玉青) - Used for AI Agent chat flow and insights.
- **Five Elements (五行) Low-Saturation Tokens:**
  - `--color-wood` (木): `#2a9d8f` (Muted Teal)
  - `--color-fire` (火): `#e76f51` (Terracotta)
  - `--color-earth` (土): `#e9c46a` (Ochre)
  - `--color-metal` (金): `#e5e5e5` (Platinium)
  - `--color-water` (水): `#264653` (Deep Slate Blue)

### Typography

- **Data & Code:** `JetBrains Mono`, `Inter` (Max legibility for high-density tables).
- **Titles & Core Glyphs (e.g., 天干地支, 卦名):** `Noto Serif CJK SC` or Calligraphic Serif (风骨楷体/宋体).

## 3. Layout Architecture (11-Tab Solution)

To prevent navigation chaos across 11 tabs, implement a **"Two-Tier Hybrid Layout"** inspired by Linear/Raycast:

```text
+--------------------------------------------------------------------------+
|  Global Search & Quick Cast (Ctrl+K)                                    |
+--------------------------------------------------------------------------+
|  Sidebar Navigation (Major Modules)   |  Main Workspace Tab Panel        |
|  [ ] 易学源流 (Base Combo)           |  +-----------------------------+ |
|  [•] 术数排盘 (Divination)           |  | 排盘 | JSON映射 | 古籍 | 测试 | | |
|  [ ] 医道运气 (Medical/Qi)           |  +-----------------------------+ |
|  [ ] 知识检索 (Database)             |  |                               | |
|                                      |  |  [Data Visualizations /       | |
|--------------------------------------|  |   Radars / Nine-Palace Grid]  | |
|  [Local-first AI Agent Status]       |  |                               | |
+--------------------------------------+----------------------------------+
```

## 4. Key UX/UI Component Specs for Claude to Generate

### Component A: `CommandBar` (Raycast Style)

- **Behavior:** Global shortcuts (`Ctrl+K`). Type to instantly change time, cast a hexagram (起卦), or search across 30 ancient text files. All 11 tabs must react and refresh their state deterministically.

### Component B: `FiveElementsRadar` & `QiWheel` (Recharts/ECharts)

- **Visual:** Render the output of the 6 JSON mapping tables into interactive charts.
- **UX:** Hovering over an element node displays popovers linking directly to the specific chapter inside the 30 source `.md` ancient text database files.

### Component C: `AncientTextSplitReader`

- **Layout:** Two-column split interface. Left side renders the original raw markdown text of classic books (e.g., 《三命通会》). Right side displays the structured JSON AST (Abstract Syntax Tree) parsed by the AI Agent, with highlighted mappings.

### Component D: `TestRunnerConsole` (Tab 11)

- **Visual:** A developer-focused pseudo-terminal widget. Displays real-time rolling logs of automated tests verifying JSON mapping tables correctness, with green LED flashing badges (`All 412 Mappings Verified`).

## 5. Engineering Constraints for open-design / Claude Code

When generating components, adhere to the following strict coding styles:

1. **Component Independence:** Use `Shadcn UI` + `Tailwind CSS`. Do not inject custom raw CSS or third-party global stylesheets.
2. **State Driven:** UI elements (especially hexagram lines [爻] and solar terms [节气]) must be computed purely from the deterministic JSON state. Zero visual drift.
3. **Data Export:** Every data visualization card must include a discrete `"Copy context for AI"` button that stringifies current view data into an LLM-optimized Markdown payload.

## 6. Local Project Adaptation Notes

The current `visual/` implementation is a static HTML/CSS/JS frontend rather than a React + Shadcn + Tailwind app. Until the project migrates to React, treat the above as the target design direction and translate it into equivalent static frontend patterns:

- Use CSS variables for tokens in `visual/css/style.css`.
- Keep deterministic rendering in existing JS modules under `visual/js/`.
- Avoid adding runtime dependencies unless the task explicitly authorizes a framework migration.
- Preserve current tab IDs and existing engine adapters unless a migration plan explicitly changes them.
- Maintain browser-testability through `visual/test-runner.html` and existing `visual/js/tests/` contracts.
