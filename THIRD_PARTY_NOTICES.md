# Third-party notices and data provenance

This file records bundled libraries and datasets that materially affect the local runtime. It is not a substitute for each upstream license text; maintainers must verify the cited upstream revision before redistributing a release archive.

## Runtime libraries

| Component | Locked version | Use | License/provenance action |
|---|---:|---|---|
| `lunar-typescript` | 1.8.6 | Local calendar and stems/branches support | Verify package license on dependency upgrades. |
| `iztro` | 2.5.8 | Local Ziwei chart calculation | Verify package license and dynamic-rule compatibility on upgrades. |
| `3meta` | 2.6.0 | Local Qimen calculation | Verify package license and fixture compatibility on upgrades. |

## Bundled datasets

| Dataset | Declared upstream/source | Use | Repository location | Current governance status |
|---|---|---|---|---|
| Dream dictionary | `oswin-hu/zhougong_dream` and `KianReed/dreamlogic-mcp`, declared MIT in source comments | Local folklore lookup | `apps/visual/public/dream/`, `src/legacy/dream-data/` | Upstream revision/hash must be recorded before formal redistribution. |
| Kangxi strokes and character meanings | `babyname/fate`, declared MIT in source comments | Name/character lookup | `src/legacy/kangxiStrokes.json`, `charMeanings.json` | Upstream revision/hash must be recorded before formal redistribution. |
| Fengshui classical texts | Mixed public digitization sources listed in `knowledge-base/fengshui/_index.md` | Knowledge reading/reference | `knowledge-base/fengshui/` | Per-title source, edition, transcription rights and completeness need scholarly review. |
| Fengshui mappings | Project-maintained compilation from traditional rules and cited sources | Deterministic local mappings | `knowledge-base/fengshui/mappings/` | Structure is CI-validated; rule correctness/source review remains separate. |

## Release rule

A dependency or dataset update must include:

1. upstream project and immutable revision/hash;
2. license or redistribution basis;
3. changed local file checksums;
4. compatibility impact;
5. regression evidence in `docs/RULE-CHANGELOG.md` when calculation rules are affected.

Generated checksums and review status are stored in `knowledge-base/manifest.generated.json`.
