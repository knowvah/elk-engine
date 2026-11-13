<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — Rectpacking provider and suites

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T12): port the rectpacking provider` · Scratch: `$TMPDIR/alg-packing/T12/`

## Context

Mission 8c, PK7, PK10, PK11. `R/intermediate/*` (340: `MinSizePreProcessor` via alg.common `NodeLabelAndSizeCalculator`,
`MinSizePostProcessor`, `NodeSizeReorderer` with `ECollections.sort` + `NodeSizeComparator` = `Double.compare` descending,
`InteractiveNodeReorderer`, `IntermediateProcessorStrategy`), `R/RectPackingLayoutProvider.java` (237: `NodeMicroLayout`, the
`BoxLayoutProvider` fallback `:94-103`, `float` progress `:107` → `Math.fround`, early return on cancel `:112-113`),
`R/InteractiveRectPackingGraphVisitor.java` (reversed `endsWith` `:47`, verbatim). Suites: `RT/PaddingTest.java` (4),
`RT/CompactionTest.java` (10), `RT/issues/Issue583Test.java` (1); plain JUnit, delta 1.

## Task

1. Port the classes; unstage the provider; `staged-classes.json` ends `[]`.
2. PK7: replay every `sort` row of `rectpacking.json` with `Array.prototype.sort` and the verbatim comparator. All equal → journal the
   count. Any difference (or a Java-only throw) → `needs-ruling` naming the rows, a classified-rows list in the test (rows stay as
   recorded), and a `docs/conformance.md` entry by T15. Never a hand-written TimSort (stop 18).
3. `src/alg/rectpacking/RectPackingVectors.test.ts`: every `full`, `stops`, `throws` row through `RecursiveGraphLayoutEngine` with
   `RectPackingMetaDataProvider` registered; explicit 60 s timeout.
4. Port the three suites whole.
5. Per-module import smoke over `src/alg/rectpacking` (TDZ).

## Write-set

`src/alg/rectpacking/intermediate/**`, `src/alg/rectpacking/{RectPackingLayoutProvider,InteractiveRectPackingGraphVisitor}{,.test}.ts`,
`src/alg/rectpacking/{PaddingTest,CompactionTest,RectPackingVectors}.test.ts`, `src/alg/rectpacking/issues/Issue583Test.test.ts`,
`test/architecture/staged-classes.json`, `test/helpers/rectpacking-replay-*.ts` (additions in new files only).

## Read-set

The Java above and `RT/**`, `src/alg/rectpacking/**`, `src/alg/common/NodeMicroLayout.ts`, `src/alg/common/nodespacing/NodeLabelAndSizeCalculator.ts`,
`src/core/util/BoxLayoutProvider.ts`, `src/core/util/IGraphElementVisitor.ts`, `src/emf/common/util/ECollections.ts`,
`src/java/lang/` (`Double.compare` shim), `decisions.md#pk7--the-contract-violating-comparator`.

## Interface contract (consumed by T13, T14)

`RectPackingLayoutProvider` registered through `RectPackingMetaDataProvider`; `staged-classes.json` is `[]`.

## Acceptance criteria

- Given the three suites, then 4, 10 and 1 tests pass with the Java's assertions.
- Given every `full`, `stops`, `throws` row, when replayed through the provider, then it equals the row at the AD-4 bar.
- Given every `sort` row, then either `Array.prototype.sort` reproduces it or it is named in a `needs-ruling` issue and classified.
- Given `staged-classes.json`, then it is `[]` and the fitness test passes.

## Observability / Rollback

N/A — no new observable operations. Reversible.
