<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Stress, replay, unstaging

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T10): port stress and remove the staged providers` · Scratch: `$TMPDIR/alg-force-disco/T10/`

## Context

Mission 8b, FD4, FD5. `F/stress/{StressMajorization,StressLayoutProvider}.java`. `dijkstra`'s comparator reads a `dist` array mutated while
elements are queued; the landed `PriorityQueue` follows the JVM's sift order, and its `remove` is proven against vectors (`rand-pq-*`).

## Task

1. Port both classes whole. `connectedEdges` is `LinkedListMultimap.create` with identity strategies. Add
   `static readonly Dimension = Dimension` to `StressMajorization`.
2. `src/alg/force/stress/StressVectors.test.ts`: every row of `stress.json`, with `apsp` and `w` at each `initialize` stop.
3. Remove the three `// @staged 8b` markers and rows, so `staged-classes.json` is `[]`.
4. Run the per-module import smoke over `src/alg/{force,disco}`.

## Write-set

`src/alg/force/stress/{StressMajorization,StressLayoutProvider}{,.test}.ts`, `src/alg/force/stress/StressVectors.test.ts`,
`test/helpers/force-replay-*.ts`, `src/alg/force/ForceLayoutProvider.ts`, `src/alg/disco/DisCoLayoutProvider.ts` (marker lines only),
`test/architecture/staged-classes.json`.

## Read-set

The Java above, `src/java/util/PriorityQueue.ts`, `src/guava/LinkedListMultimap.ts`, T6's and T8's classes and helpers, `decisions.md#fd4-hashed-containers`,
`#fd5-staging-and-registration`.

## Acceptance criteria

- Given every `stress.json` row, then it replays at 1e-6, ids exact, class and first frame for throws.
- Given `staged-classes.json`, then it is `[]` and the staged fitness test passes.
- Given a `dijkstra` tie, then the `apsp` row matches (the heap order is observable through the shared `dist`).

## Observability / Rollback

N/A — no new observable operations. Reversible.
