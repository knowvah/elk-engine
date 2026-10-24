<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17 — Layout-golden test, `.elkt` layout harness, issues 457 and 489

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T17): compare fixed, box and random layouts with the oracle`

## Context
Exit criterion of the mission (roadmap row 5, AD-4): TS layouts equal the oracle refs from T4 within 1e-6, structure
exact. The oracle pipeline per case (`tools/oracle/harness/CaseRunner.java:55-95`): read ELK JSON, `GraphOverlay`
(variant, then retarget), `RecursiveGraphLayoutEngine.layout(root, new BasicProgressMonitor())`, export with
`omitLayout(false)`, `omitZeroDimension(false)`, `omitZeroPositions(false)`, `omitUnknownLayoutOptions(true)`,
`prettyPrint(true)`. TS mirrors it with `ElkGraphJson` (importer/exporter, mission 4), `applyOverlay` (T4) and the
engine (T16); compare with `test/golden/compare-json.ts` (`compareLayout`, `formatDiffs`). M6: the issue tests are
ported as plain vitest over vendored `.elkt` (T4 put them in `test/golden/inputs/tickets/core/`).

## Task
1. `test/golden/layout-goldens.test.ts`: one case per entry of `test/golden/algorithms.json`, input from
   `test/golden/inputs/`, ref from `test/golden/refs/elk-algorithms/`; assert `compareLayout` reports no diffs (print
   `formatDiffs` on failure). Time each layout (stop 12: > 1 s is a stop).
2. `test/helpers/elkt-layout-harness.ts`: load a `.elkt` through the internal `ElkGraphText` loader, run a
   configurator callback, set the algorithm, run the engine, return the root — the minimal equivalent of the
   alg.test `LayoutTestRunner` for these two tests (read `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.test/` only to
   confirm the order: load → configurator → layout → test methods).
3. Port `Issue457Test` and `Issue489Test` to `src/core/issues/Issue457Test.test.ts` and `Issue489Test.test.ts`:
   `@Algorithm(BoxLayouterOptions.ALGORITHM_ID)`, the `@Configurator` bodies and the assertions verbatim
   (tolerances as in Java).
4. On any golden mismatch: diagnosis mode (CLAUDE.md, stop 5) — dump the oracle and TS values at the first diverging
   element before hypothesizing; never edit a ref.

## Write-set
`test/golden/layout-goldens.test.ts`, `test/helpers/elkt-layout-harness.ts` (+ test),
`src/core/issues/Issue457Test.test.ts`, `src/core/issues/Issue489Test.test.ts`.

## Read-set
`tools/oracle/harness/CaseRunner.java:40-100`; `test/golden/{compare-json,oracle-refs.test}.ts`;
`test/golden/algorithms.json`; `test/helpers/graph-overlay.ts`; `src/graph/json/ElkGraphJson.ts` (symbols);
`src/graph/text/ElkGraphText.ts` (symbols); the two Java issue tests under
`$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core/issues/`.

## Acceptance criteria
- Given every entry of `algorithms.json`, when laid out in TS, then `compareLayout` reports no diffs (AD-4).
- Given `457_boxLayouterIgnoresMinimumSize.elkt` and its configurator, when laid out, then every node is
  `MIN_SIZE` ± 1 (Java assertion).
- Given both `489_paddingAndMinSize_*.elkt`, when laid out, then each child sits at `PADDING` and fills
  `size - 2·PADDING` within the Java tolerance.
- Each golden layout takes ≤ 1 s in TS.

## Observability / Rollback
N/A — tests only. Reversible: revert the commit.
