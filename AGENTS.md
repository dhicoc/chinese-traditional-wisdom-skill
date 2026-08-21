# AGENTS.md

## Project continuity

Before planning or editing this repository, read these files in order:

1. `docs/NEXT-SESSION-HANDOFF.md` — latest cross-session state and immediate next task.
2. `docs/IMPLEMENTATION-PLAN.md` — authoritative phased implementation plan and acceptance criteria.
3. `SKILL.md` — Agent workflow.
4. `RULES.md` — safety, privacy, claims, and local-computation boundaries.
5. `tool-index.md` — current 32-tool CLI contract.

## Current priority

v1.0.0 is formally released at tag `v1.0.0`. P0-P3 and the section-7 Skill behavior evaluation harness are complete; P0-03, P1-02, and P3-04 were explicitly skipped by product decision. The repository is in stable maintenance and next-version product-planning mode. Run `pnpm eval:skill` before changing Skill behavior, preserve the v1.0.0 tag, and do not add a `riskSafetyGate`, execution-blocking safety CLI, capability-status split, fine-grained safety-copy scanner, or full-input history persistence unless product reverses those decisions.

## Non-negotiable boundaries

- Models must not calculate charts, stems/branches, numeric mappings, or deterministic facts themselves.
- Agent/CLI registry-tool calls pass through the input contract and `runLocalTool()`; independent analysis commands use dedicated parsers and pure local engines; Dashboard calls pure browser-safe engines directly.
- Claims validation covers structured facts only, never interpretations, predictions, advice, medical safety, or real-world outcomes.
- Verified true solar time requires externally verified longitude, IANA timezone, historical UTC offset, daylight-saving evidence, and a recomputable resolution. Otherwise use the explicit civil-time fallback notice.
- Do not add remote accounts, server sessions, persistent tokens, remote calculation, or protocol bridges.
- Python helpers are offline comparison tools only and are not user-facing calculation sources.
- Do not persist full birth data, precise locations, names, or raw consultation questions in logs, history, fixtures, or reports.

## Required verification

For engine, runner, verifier, Dashboard, or public-contract changes, run the quality gates listed in `docs/IMPLEMENTATION-PLAN.md` section 9. Interaction, privacy, responsive, safety-copy, or report changes also require Playwright E2E.
