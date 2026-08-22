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
| Dream dictionary | `oswin-hu/zhougong_dream` and `KianReed/dreamlogic-mcp`, declared MIT in source comments | Local folklore lookup | `apps/visual/src/legacy/dream-data/dream-dictionary.source.json`, gitignored generated `public/dream/shards/`, and `src/legacy/dream-data/dreamData.generated.ts` | Upstream revision/hash must be recorded before formal redistribution. |
| Kangxi strokes and character meanings | `babyname/fate`, declared MIT in source comments | Name/character lookup | `src/legacy/kangxiStrokes.json`, `charMeanings.json` | Upstream revision/hash must be recorded before formal redistribution. |
| Zhouyi 64-hexagram text | `kentang2017/kintaiyi` at `a8f839456ebf008b39675984e8ec951354984344`, data blob `c54e68889fe33d52f95699b59e535da1d26fd3f8`, MIT | Local hexagram lookup, judgment, six line texts and Tuan commentary | `apps/visual/src/legacy/ichingTexts.json`, `ichingTexts.ts` | Local JSON SHA256 `C379F1DDCA8360B38973E4159A9E20D37F88BDB1F9A3CE1A56ECA3349DFB46EF`; 64×8 completeness, King Wen order, Unicode and relation mappings are CI-validated. |
| Fengshui classical texts | Mixed public digitization sources listed in `knowledge-base/fengshui/_index.md` | Knowledge reading/reference | `knowledge-base/fengshui/` | Per-title source, edition, transcription rights and completeness need scholarly review. |
| Fengshui mappings | Project-maintained compilation from traditional rules and cited sources | Deterministic local mappings | `knowledge-base/fengshui/mappings/` | Structure is CI-validated; rule correctness/source review remains separate. |

## Release rule

A dependency or dataset update must include:

1. upstream project and immutable revision/hash;
2. license or redistribution basis;
3. changed local file checksums;
4. compatibility impact;
5. regression evidence in `CHANGELOG.md` when calculation rules are affected.

Generated checksums and review status are stored in `knowledge-base/manifest.generated.json`.
