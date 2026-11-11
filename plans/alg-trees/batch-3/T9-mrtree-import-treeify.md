<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — mrtree importer, components, interactive visitor, treeifier

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T9): port the mrtree importer, components and treeifier`
Scratch: `$TMPDIR/alg-trees/T9/`

## Context

Mission 8a, TR3, TR7, TR9. `M/ElkGraphImporter.java` (227; `elemMap` identity, lookup only), `M/IGraphImporter.java`,
`M/InteractiveMrTreeGraphVisitor.java`, `M/ComponentsProcessor.java` (323): `split`, `dfs` (`:129`, recursion), `pack` with the V1
merge (`:240-262`: `propMerge` over `getAllProperties()`, last writer wins, a boxed `!=` at `:249`, `System.err.println` at `:251`
→ `console.error`), `(float) Math.sqrt` at `:220` (`fround`). `M/p1treeify/DFSTreeifyer.java` (192, `dfs :140` recursion, `bfs :167`)
is a T6 staged file: replace its body, keep marker and row.

## Task

1. Port the five classes whole. `propMerge` is a `JavaHashMap` with the landed `PROPERTY` strategy (TR3); iterate
   `getAllProperties()` in its `JavaHashMap` order. Prove or rule on the `:249` reference comparison (stop 13; a `Property.getDefault()`
   value against a stored value: journal the provenance proof).
2. Tests: `ElkGraphImporter.importGraph` against T1's `import` stops; `split` against the split stops; `pack` + `applyLayout` against the
   pack stops given the recorded component states; `DFSTreeifyer` from the stop before it to the stop after it (both `DFS` and
   `BFS` rows, cyclic and multi-root inputs); `InteractiveMrTreeGraphVisitor` against rows with `interactive` set if T1 recorded
   them, else traced from the Java.

## Write-set

`src/alg/mrtree/{IGraphImporter,ElkGraphImporter,InteractiveMrTreeGraphVisitor,ComponentsProcessor}{,.test}.ts`,
`src/alg/mrtree/p1treeify/DFSTreeifyer{,.test}.ts`.

## Read-set

The Java files above, `src/core/util/ElkUtil.ts` (visitor API), `src/java/util/JavaHashMap.ts`, `src/graph/properties/MapPropertyHolder.ts`,
T6's helpers, `decisions.md` TR3, TR9, stop-conditions 13.

## Interface contract (consumed by T17)

`new ElkGraphImporter().importGraph(elk): TGraph`, `applyLayout(tGraph)`; `new ComponentsProcessor().split(g): TGraph[]`,
`pack(components): TGraph`; `DFSTreeifyer` as an `ILayoutPhase<TreeLayoutPhases, TGraph>`.

## Acceptance criteria

- Given every T1 row's input, when imported, then the `import` stop equals the row.
- Given recorded component states, when packed, then the pack stop (including merged properties) equals the row.
- Given the stop before `DFSTreeifyer`, when it runs, then the next stop equals the row for DFS and BFS rows.
- Given the `:249` comparison, then the journal holds its provenance proof or a `needs-ruling` issue number.

## Observability / Rollback

N/A — no new observable operations. Reversible.
