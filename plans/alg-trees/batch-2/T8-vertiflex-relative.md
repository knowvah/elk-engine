<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — vertiflex `InternalProperties`, `VertiFlexUtil`, `VertiFlexLayoutPhases`, relative placement

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T8): port vertiflex relative placement`
Scratch: `$TMPDIR/alg-trees/T8/`

## Context

Mission 8a, TR1, TR7, TR9. `V/p2relative/RelativeXPlacer.java` (675) recurses per subtree (`recursiveStraightlinePlacement :156`,
`recursiveBentlinePlacement :295`) over `OutlineNode` chains; `OutlineNode.print` uses `System.out.println` (`:98`, → `console.log`,
F2). `V/VertiFlexLayoutPhases` is a leaf enum; `RelativeXPlacerStrategy` creates `RelativeXPlacer`.

## Task

1. Port whole: `V/{InternalProperties,VertiFlexUtil,VertiFlexLayoutPhases}`, `V/p2relative/{OutlineNode,NodeComparator,RelativeXPlacer,RelativeXPlacerStrategy}`.
   Split `RelativeXPlacer` into sections behind a facade only if the 500-line / 30-NLOC / CCN-10 limits force it (journal the split).
   Keep recursion verbatim (TR7; T19 probes).
2. Write `test/helpers/vertiflex-replay-rows.ts` and `vertiflex-replay-dump.ts` (T3's format) with tests.
3. Tests: `RelativeXPlacer` from the P1 stop to the P2 stop of every T3 row (input graph state after `NodeYPlacer` as recorded),
   `NodeComparator` orders from recorded rows, `OutlineNode` structure from recorded outlines.

## Write-set

`src/alg/vertiflex/{InternalProperties,VertiFlexUtil,VertiFlexLayoutPhases}{,.test}.ts`, `src/alg/vertiflex/p2relative/**`,
`test/helpers/vertiflex-replay-{rows,dump}{,.test}.ts`.

## Read-set

The Java files above, `V/VertiFlex.melk`, T3's recorder header, `decisions.md` TR1, TR7, TR9.

## Interface contract (consumed by T11)

`RelativeXPlacer` as an `ILayoutPhase<VertiFlexLayoutPhases, ElkNode>`; `InternalProperties` constants; `loadVertiFlexRows()`,
`dumpVertiFlex(graph)`, `compareStop(expected, actual)`.

## Acceptance criteria

- Given every T3 row's P1 stop as the starting state, when the TS `RelativeXPlacer` runs, then the P2 stop equals the row at 1e-6.
- Given a `throws` row raised inside P2, then the TS raises the same class with the same first ELK frame.
- Given replay-alone coverage of `p2relative/**`, then the replay reaches at least 90 % of its branches (journal the rest as `U` candidates).

## Observability / Rollback

N/A — no new observable operations. Reversible.
