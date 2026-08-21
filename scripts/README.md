# Python offline-oracle helpers

The Python files in this directory are installed by the complete setup so maintainers can compare selected results with independent libraries and historical helper implementations.

They are **not** an Agent or Dashboard calculation source.

Authoritative user-facing flow:

```text
pnpm engine <tool> <input-json-file>
→ TypeScript input contract
→ TypeScript engine
→ ToolEnvelope
→ local claims validation
```

Default `scripts/setup.*` installs the cross-platform Python oracle core from `requirements.txt`. The historical `liuyao_calc.py` can additionally use `requirements-optional-liuyao.txt`; that optional package may require native C++ build tools on platforms without an `sxtwl` wheel and is not required for a complete Agent/Dashboard installation.

Python boundaries:

- use only for offline maintenance and discrepancy research;
- never fall back to Python when the TypeScript engine fails;
- never describe Python output as the current `ToolEnvelope` result;
- never persist real personal birth data in comparison logs or fixtures;
- document any accepted rule change in `CHANGELOG.md` with compatibility and regression evidence.

The scripts remain at their historical paths for compatibility. Their command output and approximate rules are not part of the public CLI contract.
