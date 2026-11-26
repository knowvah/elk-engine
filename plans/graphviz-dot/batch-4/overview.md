<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4: entry point; `DotExporter`; `DotImporter`

Three parallel subagents with disjoint write-sets. T10 and T11 compare text through T8's `GraphvizDotSerializer` and read
fixtures through T7's parser directly. Neither waits for T9's entry point.

| Task | Writes | Proven by |
| ---- | ------ | --------- |
| [T9](T9-entry-point.md) | `src/alg/graphviz/dot/GraphvizDot.ts`, its test | round trips over the parse and write refs |
| [T10](T10-dot-exporter.md) | `src/alg/graphviz/dot/transform/` except `DotImporter*` | `graphviz-dot-export.json` |
| [T11](T11-dot-importer.md) | `src/alg/graphviz/dot/transform/DotImporter*` | `graphviz-dot-import.json` |

**Shared types:** `IDotTransformationData` and `DotTransformationData` are T10's files. T11 imports them. To keep the tasks
parallel, the orchestrator writes these two small files (about 130 lines of Java together) before spawning, as T10's first
step done early, and T10 takes them over unchanged or reports a needed change.

## Common rules (include in every subagent prompt)

The batch 2 common rules, plus:

- The ElkGraph dump that the refs use must be compared with the landed helpers of the graph vectors (`test/helpers/`; find
  the reader that `TransferVectors` refs use) or a helper in the task's write-set. Numbers compare under AD-4 (1e-6). Ids,
  counts, text and non-numeric values compare exactly.
- Graphs come from the scenario `.elkt` files through `ElkGraphText.load` (internal API), under the CoreOptions-only registry
  (G3).
- AD-10 at each `HashMap`/`HashBiMap` site: journal in the hand-back whether iteration order is observable (D10).

## Batch gate

All three tasks green; every export and import row replayed; `npx vitest run src/alg/graphviz test/architecture`;
`npm run typecheck`; `npm run complexity`.
