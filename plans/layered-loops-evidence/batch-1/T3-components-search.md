<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: search for M7-M10 (components compaction)

## Context

- **M7-M9** (`ComponentsCompactor.ts:95, :96, :169-171`; Java `:164-174`, `includeExternalEdgesInSize`). The method
  walks every segment of every external edge in absolute coordinates after `applyPositions`. A vertical segment pulls
  `offset.x` down to `last.x` and `size.x` up to it; a horizontal segment does the same in y.
  - It changes something only when a segment start lies below 0 or beyond the compacted width or height.
  - Any nonzero offset distinguishes all three mutants. The `y` arm needs a horizontal segment.
  - The only landed row where it fires, `full/components-compaction/ticket-213_componentsCompaction`, carries NaN. Its
    compound node is 0 × 0, so `ElkUtil.resizeNode` divides 0/0 (inferred from `docs/conformance.md:783-787`; check it).
  - Scoping candidates (untested):
    - a node margin from an OUTSIDE label on a WEST port, so the frame starts at x < 0;
    - `elk.padding` > 0 on `c` with an outer segment in the last padding band.
  - Use `gComp` (its `c` is 200 × 200, so no NaN) with `compactionInner(…)` and `layoutSite(id, elk, "c")`.
- **M10** (`ComponentsToCGraphTransformer.ts:263`, placeholder bottom; Java `:271`).
  - Scoping argues the issue's single-side recipe is equivalent. The extension corners at `min` and `max` enter the
    hull points, and a WEST-only (or EAST-only) component is locked up and down (`setLock`), so the placeholder bottom
    never exceeds the hull bottom.
  - The candidate left is a two-side combination with free vertical movement, such as `sd(NORTH, WEST)` or
    `sd(SOUTH, WEST)`, with a tall WEST span next to short components.

## Task

1. Make a scratch copy with switchable M7-M10 and instrumentation: count the changes to `offset` and `size` in
   `includeExternalEdgesInSize`, and log the placeholder rectangles and lock of each component in `applyLayout`.
2. Search within the [stop-4 budget](../stop-conditions.md#search-budget-stop-4) with the [T1](T1-found-rows.md)
   pre-screen method, cloning a landed `sites/ComponentsCompactor/*` row (`LayeredLoopsVectorsSites.java:297-308`). No
   candidate may produce NaN anywhere in its TS layout.
3. M10: if no two-side candidate discriminates, draft the [D4](../decisions.md#d4) proof for the single-side lock. Name
   each runtime fact the proof needs (for example, the lock values on the oracle) so the orchestrator can probe it.
4. Hand back per mutant: a candidate, a proof draft, or the spent budget with the shapes tried. One row may serve M7,
   M8 and M9 together.

## Write-set

None in the repository. Scratch: `$TMPDIR/layered-loops-evidence/T3/`.

## Read-set

`src/alg/layered/components/ComponentsCompactor.ts` and `components/ComponentsCompactor.java`;
`src/alg/layered/compaction/components/ComponentsToCGraphTransformer.ts` and its Java; `gComp` (`LayeredLoopsVectorsSites.java:277`),
`compactionInner` (`LayeredLoopsVectorsModelRows.java:384`), `sd` (`LayeredLoopsVectorsScenarios.java:119`); `plans/layered-loops-wrapping-compaction/unreached.md` Sc26-Sc28 and the
`components/*` entries (around `:600-660`).

## Acceptance criteria

- Given M7-M9, when T3 ends, then the hand-back holds a NaN-free candidate that changes the layout under each mutant, a
  D4 proof draft, or the spent budget.
- Given M10, when T3 ends, then the hand-back holds a two-side candidate or a proof draft naming its oracle facts.

## Observability

N/A: scratch search, no runtime code.

## Rollback

Nothing to roll back (no repository write).
