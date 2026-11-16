<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — mrtree graph model, `InternalProperties`, `TreeUtil`, factory enums, replay helpers

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port the mrtree graph model and stage its factories`
Scratch: `$TMPDIR/alg-trees/T6/`

## Context

Mission 8a, TR1, TR3, TR4. `M/graph/{TGraphElement,TShape,TLabel,TGraph,TEdge,TNode}.java` (645 lines) extend `MapPropertyHolder`
(landed, `JavaHashMap`-backed: V1). `M/options/InternalProperties.java` (138) imports `TNode`/`TEdge`. `M/TreeUtil.java` (451) is used
by `OrderBalance`, `NodePlacer`, `CompactionProcessor`, `EdgeRouter`. `M/TreeLayoutPhases.java` and
`M/intermediate/IntermediateProcessorStrategy.java` construct the 4 phases and 11 processors (TR4).

## Task

1. Port the six graph classes, `InternalProperties` and `TreeUtil` whole (`@see`, Java names, every branch). `TEdge.toString`'s
   `hashCode()` follows the landed identity-hash text precedent (`src/guava/Multimap.ts`), journaled (TR9).
2. Port `TreeLayoutPhases` and `IntermediateProcessorStrategy` whole; stage their 15 targets per TR4 (append rows to
   `staged-classes.json`, sorted).
3. Write `test/helpers/mrtree-replay-rows.ts` (load and type `refs/java/mrtree.json`, decode hex doubles, list rows by group and
   step) and `test/helpers/mrtree-replay-dump.ts` (dump a TS `TGraph` in T1's stop format and compare at 1e-6, ids and order exact),
   each with a `.test.ts`.
4. Tests for the ported classes: the `import` stop rows give `TGraph` structure after `ElkGraphImporter` (use them only as data for
   `TGraph`/`TNode` accessors here; the importer is T9); `TreeUtil` functions against values traced from the Java over recorded
   stop graphs; `InternalProperties` defaults from the Java.

## Write-set

`src/alg/mrtree/graph/**`, `src/alg/mrtree/options/InternalProperties{,.test}.ts`, `src/alg/mrtree/TreeUtil{,.test}.ts`,
`src/alg/mrtree/TreeLayoutPhases{,.test}.ts`, `src/alg/mrtree/intermediate/IntermediateProcessorStrategy{,.test}.ts`, the 15
staged files (`src/alg/mrtree/p1treeify/DFSTreeifyer.ts`, `p2order/NodeOrderer.ts`, `p3place/NodePlacer.ts`, `p4route/EdgeRouter.ts`,
`intermediate/<11 processors>.ts`), `test/architecture/staged-classes.json`, `test/helpers/mrtree-replay-{rows,dump}{,.test}.ts`.

## Read-set

`M/graph/*.java`, `M/options/InternalProperties.java`, `M/TreeUtil.java`, `M/TreeLayoutPhases.java`,
`M/intermediate/IntermediateProcessorStrategy.java`, `src/graph/properties/MapPropertyHolder.ts`, T1's recorder header,
`test/helpers/layered-compound-replay-{rows,dump}.ts` (shape only), `decisions.md` TR1, TR3, TR4, TR9.

## Interface contract (consumed by T9, T12, T14–T17)

`TGraph`, `TNode`, `TEdge`, `TLabel` with the Java accessors; `InternalProperties` constants; `TreeUtil` static methods;
`loadMrTreeRows()`, `dumpTGraph(graph)`, `compareStop(expected, actual)` from the helpers.

## Acceptance criteria

- Given a recorded `import` stop, when its TGraph structure is rebuilt with the TS model, then `dumpTGraph` equals the row.
- Given the staged fitness test, then 15 + 16 rows agree with the markers.
- Given every new module imported alone, then no TDZ error.

## Observability / Rollback

N/A — no new observable operations. Reversible.
