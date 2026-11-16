<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17 — mrtree wiring, replay, JUnit

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T17): wire mrtree and replay its oracle rows`
Scratch: `$TMPDIR/alg-trees/T17/`

## Context

Mission 8a, TR1, TR4, TR5, TR8, TR9. `M/MrTree.java` (200; the `elkjs-exclude` debug block `:77-83` is dropped, M2) and
`M/TreeLayoutProvider.java` (91). Every other mrtree class is ported; 15 staged markers and rows remain.

## Task

1. Port both classes whole (journal the dropped block).
2. Remove the 15 mrtree markers and rows; `staged-classes.json` ends `[]`.
3. Remove `org.eclipse.elk.alg.mrtree.TreeLayoutProvider` from `PENDING_TYPES`; `npm run melk:generate Tree`; commit unedited; switch any
   held-back assertion in `test/melk/mrtree-options.test.ts` to the registered algorithm.
4. `src/alg/mrtree/MrTreeVectors.test.ts`: every T1 row through the real provider — `full` via `RecursiveGraphLayoutEngine`, `stops`
   along `MrTree`'s assembled step list (the same list T1 read by reflection), `throws` — ≤ 30 s alone.
5. Port `MT/MrTreeGraphSizeTest.java` to `src/alg/mrtree/MrTreeGraphSizeTest.test.ts` (TR8): both tests × 3 parameter rows,
   `DOUBLE_EQ_EPSILON = 10e-5`, assertions verbatim; `LayoutConfigurator` + `LayoutAlgorithmResolver` + `ElkUtil.applyVisitors` as in
   the Java.
6. Per-module import smoke over `src/alg/mrtree/**`.

## Write-set

`src/alg/mrtree/{MrTree,TreeLayoutProvider}{,.test}.ts`, `src/alg/mrtree/{MrTreeVectors,MrTreeGraphSizeTest}.test.ts`,
`src/alg/mrtree/options/**` (regenerated), line 2 of each of the 15 mrtree staged files, `tools/melk/config.ts`,
`test/architecture/staged-classes.json`, `test/melk/mrtree-options.test.ts`.

## Read-set

`M/MrTree.java`, `M/TreeLayoutProvider.java`, `MT/MrTreeGraphSizeTest.java`, `src/core/alg/AlgorithmAssembler.ts`,
`src/core/{LayoutConfigurator,RecursiveGraphLayoutEngine}.ts`, T6's helpers, `src/alg/radial/RadialVectors.test.ts` (shape),
`decisions.md` TR1, TR4, TR5, TR8, TR9.

## Interface contract (consumed by T18)

`MrTreeMetaDataProvider` registers `org.eclipse.elk.mrtree` with a working factory.

## Acceptance criteria

- Given every row of `refs/java/mrtree.json`, when replayed through the real provider, then 0 mismatches at the AD-4 bar.
- Given `MrTreeGraphSizeTest`, then 6 of 6 pass (oracle: runs=6, failures=0).
- Given the staged fitness test, then `staged-classes.json` is `[]` and no marker remains under `src/`.

## Observability / Rollback

N/A — no new observable operations. Reversible.
