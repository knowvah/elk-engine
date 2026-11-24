<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: vertiflex track

**Agent:** `claude` (opus). **Budget:** 1 h 15 min from spawn (stop 7). **Shapes:** vertiflex path, vertiflex caterpillar.

## Context

Issue table: path overflows in TS at 3,500-4,000 (`RelativeXPlacer.recursiveStraightlinePlacement`) where the oracle reaches
4,500-5,000; the caterpillar already goes deeper in TS than in the oracle (re-probe after each conversion). Likely next
frames: `NodeYPlacer.setYLevels`, `AbsoluteXPlacer.findMinimalX` / `absoluteTreeCoords`, `StraightEdgeRouter.routeEdges`,
`VertiFlexLayoutProvider.checkVerticalConstraintValidity` ([sites.md](../sites.md#vertiflex-t4)).
`recursiveBentlinePlacement` and `BendEdgeRouter.routeEdges` are option-gated (`BEND`): not probed, not converted (D2).

## Task

Run the batch-2 loop ([overview](overview.md#the-loop-every-track)) for the two shapes. Site notes:

- `recursiveStraightlinePlacement` (`RelativeXPlacer.java:156`): the loop over `getOutgoingEdges()` recurses into each child
  **before** pushing it to `children`, then the post-order block (sort, bundle, root move, outlines, min/max) runs once all
  children are done. The frame holds the node, the index `i` and the `children` list; the post-order block runs when the
  index reaches `getOutgoingEdges().size()` (re-read per step, as Java's `for` condition does). `makeSimpleOutlines` runs at
  frame entry, as at the method's start.
- `RelativeXPlacer.ts` is a facade with sibling step modules (`RelativeXPlacer*.ts`); put frame helpers in the facade or a new
  sibling following that naming.

## Read-set

The site files and their Java; `src/alg/vertiflex/p2relative/RelativeXPlacerReplay.test.ts`, `src/alg/vertiflex/VertiFlexVectors.test.ts`,
`src/alg/vertiflex/VertiFlexExtraVectors.test.ts` (replays, read only); `test/helpers/vertiflex-replay-*.ts`;
`test/helpers/spore-tree-fixtures.ts:21-100`; the precedent `src/alg/layered/p1cycles/DFSNodeOrderCycleBreaker{,.test}.ts`.

## Write-set

`src/alg/vertiflex/**`: converted site files, sibling helper files (D3), and new `*.explicit-stack.test.ts` files. No
existing test file changes.

## Acceptance criteria

- Given each converted site, when its explicit-stack test runs, then port and twin agree on every effect (raw double bits,
  outline structures) over ≥ 40 seeded trees and the deep case completes.
- Given the vertiflex path and caterpillar at `D_oracle`, when probed on the default stack, then both complete, match the
  oracle at 1e-6 and are byte-identical to the T1 D5 references.
- Given `npx vitest run src/alg/vertiflex`, when the track ends, then every landed test passes unchanged.

**Observability:** N/A. **Rollback:** Reversible.
