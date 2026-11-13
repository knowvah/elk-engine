<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Spore providers and suites

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T11): port the spore providers` · Scratch: `$TMPDIR/alg-packing/T11/`

## Context

Mission 8c, PK4, PK5, PK10. `S/{OverlapRemovalLayoutProvider,ShrinkTree,ShrinkTreeLayoutProvider}.java`. `overlapEdges` is a
`JavaHashSet<TEdge>` created once, `clear()`ed per iteration and assigned to `graph.tEdges` (`OverlapRemovalLayoutProvider.java:86-103`).
Suites: `ST/UtilsTest.java` (3), `ST/ScanlineOverlapRemovalTest.java` (1; `EcoreUtil.Copier` → `copyGraph`).

## Task

1. Port the three classes; unstage both providers; remove their rows.
2. `src/alg/spore/SporeLayoutVectors.test.ts`: every `full`, `stops`, `throws`, `minst` row of `spore-layout.json` through the real
   providers (`RecursiveGraphLayoutEngine` with `SporeMetaDataProvider` registered); every `jitter` row by its invariants (PK4). Explicit
   60 s timeout on whole-ref loops.
3. Port both suites whole (asserts verbatim).

## Write-set

`src/alg/spore/{OverlapRemovalLayoutProvider,ShrinkTree,ShrinkTreeLayoutProvider}{,.test}.ts`, `src/alg/spore/{UtilsTest,ScanlineOverlapRemovalTest,SporeLayoutVectors}.test.ts`,
`test/architecture/staged-classes.json` (spore rows), `test/helpers/spore-replay-*.ts` (additions in new files only).

## Read-set

The Java above, `ST/**`, `src/alg/spore/**` (T7), `test/helpers/spore-replay-*.ts`, `src/graph/util/ElkGraphCopy.ts`,
`src/alg/disco/DiscoVectors.test.ts`, `decisions.md#pk4--mathrandom-jitter`.

## Interface contract (consumed by T13, T14)

`OverlapRemovalLayoutProvider`, `ShrinkTreeLayoutProvider` registered through `SporeMetaDataProvider`.

## Acceptance criteria

- Given `UtilsTest` and `ScanlineOverlapRemovalTest`, then 3 and 1 tests pass with the Java's assertions.
- Given every non-`jitter` row, when replayed through the providers, then it equals the row at the AD-4 bar.
- Given every `jitter` row, then the port satisfies the recorded invariants.
- Given replay-alone coverage over `src/alg/spore`, then the journal records it ≥ 90 % branches or lists the arms.

## Observability / Rollback

N/A — no new observable operations. Reversible.
