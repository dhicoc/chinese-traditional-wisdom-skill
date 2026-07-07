# Logo Redesign Design: 玄轨星核

Date: 2026-07-07

## Summary

Redesign the app sidebar logo as a pure icon named **玄轨星核**. It replaces the current circular `玄` seal in the visual app sidebar brand area. The new mark should feel like a traditional celestial plate interpreted through a modern local AI tooling interface.

## Goals

- Replace the current text-based `玄` circle with a custom SVG-style icon.
- Keep the logo readable at the sidebar size of roughly 48px.
- Match the current jade-on-dark visual system.
- Express the product idea of local traditional-wisdom calculation, mapping, and visual tooling.
- Avoid changing the product name, navigation structure, README hero, or broader brand copy in this change.

## Non-goals

- Do not create a full README/GitHub cover logo.
- Do not redesign the whole sidebar layout.
- Do not introduce image-generation assets or external font/image dependencies.
- Do not change the module taxonomy or app information architecture.

## Selected Concept

The selected concept is **玄轨星核**.

The mark consists of:

1. **Outer celestial disc** — a circular jade ring that reads as a 天盘 or astrolabe.
2. **Crossing orbital tracks** — one horizontal orbit and one vertical orbit, suggesting calculation paths, stars, and the phrase “究天人之际”.
3. **Inner star core** — a simple four-point star or faceted nucleus at the center, used as the main memory hook.
4. **Two small anchor stars** — minimal left/right or diagonal points to create rhythm without clutter.
5. **Optional gold accent** — a very restrained secondary line, only if it remains legible and consistent with current gold token usage.

The icon should not include Chinese characters. It should remain a symbolic mark rather than a seal with text.

## Visual Language

The logo should continue the existing UI direction:

- Background context: dark ink / black-green instrument panel.
- Primary stroke: jade green, matching the current token `#2c9f84`.
- Highlight stroke: pale jade for selected details and glow.
- Accent stroke: muted gold for one orbit or inner detail only.
- Styling: thin luminous technical lines, no heavy skeuomorphic texture.
- Shape grammar: circles, orbital curves, and a simple geometric star core.

The mark should feel mystical, but still precise and tool-like.

## Component Integration

Implementation should replace the current `brand-seal` content in the app sidebar brand block.

Current behavior:

- The sidebar uses a round `.brand-seal` container.
- The visible logo is currently the text glyph `玄`.

Target behavior:

- Keep the round container and its existing size unless implementation reveals a clear spacing issue.
- Render a small inline SVG icon inside the container.
- The SVG should inherit or explicitly use the current jade/gold palette.
- The icon should remain centered and visually balanced in the 48px seal.

## Responsive and Small-size Requirements

At sidebar size, the logo should preserve only the essential forms:

- outer circle;
- two crossing orbits;
- central star core;
- two small anchor stars.

Avoid dense tick marks, fine dash patterns, or text-like details in the production sidebar version. If a larger variant is later needed, additional celestial tick marks can be introduced separately.

## Accessibility and Semantics

- Treat the icon as decorative when adjacent brand text already names the product.
- If implemented as inline SVG, use `aria-hidden="true"` unless the surrounding text is removed in a future layout.
- Do not encode meaning through color alone; the shape should remain recognizable in monochrome.

## Testing and Verification

Manual verification should cover:

1. The sidebar brand area displays the new icon instead of the `玄` glyph.
2. The icon is centered and not clipped at desktop sidebar size.
3. The icon remains readable on the current dark background.
4. The sidebar text `XUANTAN LOCAL` and `玄学排盘` remains unchanged.
5. The app still starts with the existing Vite dev flow.

Automated tests are not required solely for this visual icon replacement unless existing snapshot or shell tests fail because of the markup change.
