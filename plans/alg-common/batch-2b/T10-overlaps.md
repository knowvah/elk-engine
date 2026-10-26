<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Strip overlap removal and replay

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T10): port rectangle strip overlap removal`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`.

## Context
Mission 6a (README). Layered's label management and nodespacing (6b) use `RectangleStripOverlapRemover`. It has no Java
test; T4's `overlaps` section is its evidence.

## Task
1. Port `J/overlaps/{RectangleStripOverlapRemover,GreedyRectangleStripOverlapRemover,IRectangleStripOverlapRemovalStrategy}.java`.
   - The nested `OverlapRemovalDirection` enum and the `RectangleNode` class go in prefixed files (M15) and are also
     reachable as Java addresses them.
   - `GreedyRectangleStripOverlapRemover.alreadyPlacedNodes` (`Sets.newHashSet`, `:33`, identity) → `Set` in insertion
     order. Journal it, draft the I-row, and check that its iteration is not observable (stop 7).
   - Keep the overlap-graph construction and sort order exactly; comparators use `Double.compare`.
2. **Replay** (`src/alg/common/overlaps/OverlapsVectors.test.ts`): for every `alg-common.json` `overlaps` scenario,
   build the remover as the recorder did, add the rectangles, run it, and assert every rectangle's final `x`/`y`
   bit-exactly (hex compare). On a mismatch, name the mechanism (stop 5).
3. Add unit tests from the Java for the builder (`withGap`, `withStartCoordinate`, `withOverlapRemovalStrategy`) and
   the direction branches.

## Write-set
`src/alg/common/overlaps/*.ts` (+ prefixed nested files), `src/alg/common/overlaps/OverlapsVectors.test.ts`,
colocated unit tests.

## Read-set
- The three Java files.
- `test/golden/refs/java/alg-common.json` (`overlaps`) and the header of `tools/vectors/AlgCommonVectors.java`.
- `src/core/math/ElkRectangle.ts`, `src/java/lang/DoubleCompare.ts`.

## Interface contracts (outputs, consumed by 6b and 7x)
- `RectangleStripOverlapRemover.createForDirection(d)`, `withGap(h, v)`, `withStartCoordinate(c)`,
  `withOverlapRemovalStrategy(s)`, `addRectangle(r)`, `getRectangleNodes()`, `removeOverlaps()` (or Java's name),
  `getHorizontalGap()`, `getVerticalGap()`.

## Acceptance criteria
- Given every `overlaps` scenario, when replayed, then each rectangle's final position equals the JVM's bit for bit.
- Given each `OverlapRemovalDirection`, when the remover runs on overlapping rectangles, then the direction-specific
  branch follows the Java (unit test).
- Given the greedy strategy's identity set, when its insertion order is varied in a unit test, then the result is
  unchanged; otherwise stop (stop 7).

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
