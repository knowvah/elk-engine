<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: mrtree track

**Agent:** `claude` (opus). **Budget:** 2 h 15 min from spawn (stop 7). **Shapes:** mrtree path, mrtree caterpillar.

## Context

Issue table: path overflows in TS at 3,000-3,500 (`DFSTreeifyer.dfs`) where the oracle reaches 6,000-7,000; caterpillar at
2,500-3,000 (`NodePlacer.secondWalk`) where the oracle reaches 3,500-4,000. T1's journal rows replace these numbers. mrtree
runs are slow (T19: 20 s and 34 s at 2,000 with JIT, superlinear), so probe only at `D_oracle` and bisect only when needed.
Expect several sites: after `dfs` and `secondWalk`, the likeliest next frames are `firstWalk` (and `apportion` under it),
`ComponentsProcessor.dfs` and the level recursions ([sites.md](../sites.md#mrtree-t2)).

## Task

Run the batch-2 loop ([overview](overview.md#the-loop-every-track)) for the two shapes. Site notes:

- `DFSTreeifyer.dfs` (`DFSTreeifyer.java:140`): the frame holds the node and a live iterator over `getOutgoingEdges()`;
  `eliminated` additions and `visited` writes stay in Java order. Effects to compare: `visited` contents, `eliminated` order.
- `NodePlacer.secondWalk` (`NodePlacer.java:319`): two call sites (first child with the child's level values, then right
  sibling with the same `yCoor`/`modsum`); a frame per pending call, pushed so the child subtree completes before the
  sibling, as in Java. Compare final `x`/`y` raw bits for every node.
- `NodePlacer.firstWalk` (`NodePlacer.java:137`): post-order per child, then the parent's prelim/modifier and `apportion`
  in Java order; `apportion` itself is not recursive and stays a call.
- `ComponentsProcessor.dfs` (`ComponentsProcessor.java:129`): two recursive calls per edge (source side, target side);
  component membership order is observable in the result graph order.
- Level recursions recurse once per level with the next level's node list: a loop that replaces the tail call, keeping
  any work after the call (check each Java body for post-call work before choosing).

## Read-set

The site files and their Java; `src/alg/mrtree/p3place/NodePlacer.test.ts`, `src/alg/mrtree/MrTreeVectors.test.ts` (the
replay, read only); `test/helpers/mrtree-replay-*.ts` (builders you may reuse); `test/helpers/spore-tree-fixtures.ts:21-100`;
the precedent `src/alg/layered/p1cycles/DFSNodeOrderCycleBreaker{,.test}.ts`.

## Write-set

`src/alg/mrtree/**`: converted site files, sibling helper files (D3), and new `*.explicit-stack.test.ts` files. No existing
test file changes.

## Acceptance criteria

- Given each converted site, when its explicit-stack test runs, then port and twin agree on every effect over ≥ 40 seeded
  trees and the deep case completes.
- Given the mrtree path and caterpillar at `D_oracle`, when probed on the default stack, then both complete, match the oracle
  at 1e-6 and are byte-identical to the T1 D5 references.
- Given `npx vitest run src/alg/mrtree`, when the track ends, then every landed test passes unchanged.

**Observability:** N/A. **Rollback:** Reversible.
