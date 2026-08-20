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

Python boundaries:

- use only for offline maintenance and discrepancy research;
- never fall back to Python when the TypeScript engine fails;
- never describe Python output as the current `ToolEnvelope` result;
- never persist real personal birth data in comparison logs or fixtures;
- document any accepted rule change in `docs/RULE-CHANGELOG.md` with compatibility and regression evidence.

The scripts remain at their historical paths for compatibility. Their command output and approximate rules are not part of the public CLI contract.
