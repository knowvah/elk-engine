<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Trees, bipartite, biconnected, triconnected

**Agent:** typescript-pro · **Commit:** `feat(T13): port tree, bipartite and connected graph generators`

## Context
`generateBipartite` `:462` (`ElkMath.boundi((int) Math.round(n * PARTITION_FRAC.val(random)), 1, n - 1)` → `l2i`
of `round`), `generateTree` `:520` (`MAX_WIDTH`, `MAX_DEGREE`), `generateBiconnectedGraph` `:587` (uses `split`),
`generateTriconnectedGraph` `:659` (`float p1`, `nextDouble`, `createClique`, `moveSource`/`moveTarget`). Each has a
hierarchy block (`random.nextFloat() < hierarchyChance`, `sizeFactor` as `float`).

## Task
1. Replace the four placeholders in `RandomGraphGeneratorTypes.ts` with the ports (Java order, draws, `float`s).
2. Widen the replay filter to the forms `trees`, `bipartite graphs`, `biconnected graphs`, `triconnected graphs`.
3. Add `mrtree-tree-small`, `radial-tree-small`, `vertiflex-tree-small` to the corpus list.

## Write-set
`src/core/debug/grandom/generators/RandomGraphGeneratorTypes.ts` (+ test),
`src/core/debug/grandom/generators/RandomGraphGenerator.replay.test.ts`, `src/core/debug/grandom/GRandomCorpus.test.ts`.

## Read-set
`RandomGraphGenerator.java:462-786`, T11/T12 files, `src/core/math/ElkMath.ts`, `src/java/lang/JavaMath.ts`.

## Interface contracts (outputs)
None new; T14 widens the same filter and list.

## Acceptance criteria
- Given every seeded row of the four forms, when replayed, then every export equals the recorded string exactly.
- Given the three tree corpus files, when regenerated, then byte-identical (all nine corpus files now pass; none
  uses `acyclic graphs`).
- Given `grep GRANDOM_PLACEHOLDER src/`, when run, then only the ANTE placeholder remains.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
