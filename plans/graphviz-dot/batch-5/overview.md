<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5: export sweep and docs; close-out and squash

Orchestrator only, T12 then T13. Start T12's sweep detached first, and write the docs while it runs.

| Task | Writes |
| ---- | ------ |
| [T12](T12-sweep-and-docs.md) | `docs/architecture/graphviz-dot.md`, `overview.md`, `inventory.md`, `port-map.md`, `docs/conformance.md`, optionally `docs/translation-rules.md`; a TS sweep comparer if needed (`tools/oracle/dot-export-compare.ts`) |
| [T13](T13-close-out.md) | `plans/roadmap.md`, `.agent-notes/graphviz-dot.md`, the journal, the README; the squash |

## Batch gate

Queue gates 1-7 (T13), all green, and journaled with numbers.
