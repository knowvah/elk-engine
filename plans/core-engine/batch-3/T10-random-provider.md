<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — `RandomLayoutProvider`; un-hold Random; Random tripwires

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T10): port the random layout provider and register it`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Second link of the codegen chain; same procedure as T8 (read `plans/core-engine/batch-2/T8-fixed-provider.md` for the
un-hold and tripwire steps and the T8 journal rows). Random draws must match the JVM sequence exactly:
`src/java/util/Random.ts` is vector-proven (`nextDouble`, `nextInt`, `nextBoolean`, …). Seed 0 or absent means
`new Random()` (unseeded, `RandomLayoutProvider.java:57-64`) — unseeded paths are tested by invariants only.

## Task
1. Port `J/util/RandomLayoutProvider.java` (276 lines): seed handling, aspect ratio, spacing, offset, node placement,
   `randomize(ElkEdge, Random, …)` for edges (sections, bend points), every branch; keep draw order exactly.
2. Remove `RandomLayoutProvider` from `PENDING_TYPES`; `npm run melk:generate`; commit generated
   `RandomLayouterOptions.ts` and `CoreOptions.ts`.
3. Tripwires (M9), `random` only — same files as T8. Journal each edit with T10.
4. Tests: with seed 1 and a small built graph, expected coordinates computed by replaying the same draw sequence
   through `Random.ts` in the test **only** where the Java formula is transcribed from the source with line refs;
   unseeded: invariants (all nodes inside the parent, sizes unchanged). The oracle goldens in T17 are the real check.

## Write-set
`src/core/util/RandomLayoutProvider.ts` (+ test), `tools/melk/config.ts`, `src/core/options/RandomLayouterOptions.ts`
and `src/core/options/CoreOptions.ts` (generated only), `test/melk/**`, `src/graph/json/JsonMetaDataConverter.test.ts`,
`test/helpers/mission5-stand-ins.ts`.

## Read-set
`J/util/RandomLayoutProvider.java`; `src/java/util/Random.ts`; everything in T8's read-set for the codegen part.

## Interface contracts (outputs)
`class RandomLayoutProvider extends AbstractLayoutProvider`; generated `RandomLayouterOptions`
(`ALGORITHM_ID = "org.eclipse.elk.random"`). Consumed by T16–T19.

## Acceptance criteria
- Given seed 1 and a fixed small graph, when random layout runs twice, then both results are identical and equal
  the values transcribed from the Java formulas.
- Given seed 0, when random layout runs, then every node lies inside the parent's content area (invariant).
- Given an edge between two placed nodes, when randomized, then its section start/end lie on the node borders as in
  `randomize` (Java branch per side).
- Given `npm run melk:generate`, then `org.eclipse.elk.random` and its supports equal the JVM metadata dump.

## Observability / Rollback
N/A. Reversible: revert the commit (it re-holds Random).
