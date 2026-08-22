# AGENTS.md

## Project continuity

Before planning or editing this repository, read these files in order:

1. `SKILL.md` — Agent workflow.
2. `RULES.md` — safety, privacy, claims, and local-computation boundaries.
3. `tool-index.md` — current 32-tool CLI contract.
4. `ROADMAP.md` — maintained product direction and completed baseline.
5. `CHANGELOG.md` — released behavior and compatibility changes.

## Current priority

v1.0.0 is formally released at tag `v1.0.0`. P4-01 unified consultation wizard phase 1 is the current implementation priority: the new `consult` workspace plans natural-language requests, keeps all 32 tools discoverable/transferable, and directly executes the verified BaZi slice through browser-safe engines. Continue by extracting reusable input/execution components for additional tool families without calling `runLocalTool()` from Dashboard. Run `pnpm eval:skill` before changing Skill behavior, preserve the v1.0.0 tag, and do not add a `riskSafetyGate`, execution-blocking safety CLI, capability-status split, fine-grained safety-copy scanner, or full-input history persistence unless product reverses those decisions.

## Non-negotiable boundaries

- Models must not calculate charts, stems/branches, numeric mappings, or deterministic facts themselves.
- Agent/CLI registry-tool calls pass through the input contract and `runLocalTool()`; independent analysis commands use dedicated parsers and pure local engines; Dashboard calls pure browser-safe engines directly.
- Claims validation covers structured facts only, never interpretations, predictions, advice, medical safety, or real-world outcomes.
- Verified true solar time requires externally verified longitude, IANA timezone, historical UTC offset, daylight-saving evidence, and a recomputable resolution. Otherwise use the explicit civil-time fallback notice.
- Do not add remote accounts, server sessions, persistent tokens, remote calculation, or protocol bridges.
- Python helpers are offline comparison tools only and are not user-facing calculation sources.
- Do not persist full birth data, precise locations, names, or raw consultation questions in logs, history, fixtures, or reports.

## Required verification

For engine, runner, verifier, Dashboard, or public-contract changes, run `pnpm typecheck`, `pnpm test`, `pnpm eval:skill`, `pnpm check:release`, `pnpm build`, and the relevant data contracts. Interaction, privacy, responsive, or report changes also require four-project Playwright E2E.
