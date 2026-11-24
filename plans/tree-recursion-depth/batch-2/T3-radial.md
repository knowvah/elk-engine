<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: radial track

**Agent:** `claude` (opus). **Budget:** 1 h 15 min from spawn (stop 7). **Shapes:** radial path, radial caterpillar.

## Context

Issue table: path overflows in TS at 2,500-3,000 (`AnnulusWedgeByNodeSpace.calculateWedgeSpace`) where the oracle reaches
4,500-5,000; the caterpillar already reaches the oracle's 4,500-5,000 in TS, but must be re-probed after each conversion
(stack use only falls, so it should stay `ok`). Likely next frames: `EadesRadial.positionNodes`,
`RadialUtil.getNumberOfLeaves`, `StraightLineEdgeRouter.routeEdges`, the sorters ([sites.md](../sites.md#radial-t3)).

## Task

Run the batch-2 loop ([overview](overview.md#the-loop-every-track)) for the two shapes. Site notes:

- `calculateWedgeSpace` (`AnnulusWedgeByNodeSpace.java:39`) and `getNumberOfLeaves` return sums: accumulate each frame's
  `childSpace` / `leafs` with `+=` in successor order, after each child's value is final, so every double is bit-identical
  (`doubleBits` in the twin test). `Math.max(childSpace, nodeSize)` at the frame's end, as Java.
- `EadesRadial.positionNodes` (`EadesRadial.java`, the call at `EadesRadial.ts:95`): per-child arguments
  (`currentRadius + radius`, `alpha`, `alpha + s * numberOfChildLeafs`) and the `alpha` update between children happen in
  Java order; the frame holds the loop position and `alpha`. Note the kept quirk at `EadesRadial.java:108`
  (`plans/alg-trees/decisions.md` TR9): do not touch it.
- `RadialUtil.getSuccessors` returns a fresh list per call; holding it in the frame is equivalent to the Java's for-each.
  State that in a comment.

## Read-set

The site files and their Java; `src/alg/radial/RadialVectors.test.ts`, `src/alg/radial/RadialExtraVectors.test.ts` (replays,
read only); `test/helpers/radial-replay-*.ts`; `test/helpers/spore-tree-fixtures.ts:21-100`; the precedent
`src/alg/layered/p1cycles/DFSNodeOrderCycleBreaker{,.test}.ts`.

## Write-set

`src/alg/radial/**`: converted site files, sibling helper files (D3), and new `*.explicit-stack.test.ts` files. No existing
test file changes.

## Acceptance criteria

- Given each converted site, when its explicit-stack test runs, then port and twin agree on every effect (raw double bits)
  over ≥ 40 seeded trees and the deep case completes.
- Given the radial path and caterpillar at `D_oracle`, when probed on the default stack, then both complete, match the oracle
  at 1e-6 and are byte-identical to the T1 D5 references.
- Given `npx vitest run src/alg/radial`, when the track ends, then every landed test passes unchanged.

**Observability:** N/A. **Rollback:** Reversible.
