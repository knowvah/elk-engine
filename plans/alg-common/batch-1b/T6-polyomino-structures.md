<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Polyomino structures, `ProfileFill`, `UniqueTriple`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port polyomino grid structures`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`.

## Context
Mission 6a (README). `PolyominoCompactor` (T12) packs these grids; disco (8a) builds them.
- `structures.Polyominoes` and `polyomino.ProfileFill` reference each other, so `ProfileFill` lands here.
- `utils.UniqueTriple` is used only by polyomino.

## Task
1. Port `J/polyomino/structures/{Direction,IThreeValueGrid,TwoBitGrid,PlanarGrid,Polyomino,Polyominoes}.java`,
   `J/polyomino/ProfileFill.java` and `J/utils/UniqueTriple.java`.
2. **Grids (P7):**
   - `TwoBitGrid` packs cells into `int` words: port the shifts, masks and index arithmetic with `Int32`, including
     `>>>`/`>>` exactly as written;
   - `PlanarGrid` (469 lines) keeps its coordinate translation and bounds checks, including the exceptions Java throws
     on an out-of-range cell (use the `src/java/lang` exception shims);
   - `IThreeValueGrid` is an interface.
3. **`Direction`:** a TS enum class with the Java constants and any methods.
4. **`UniqueTriple`:** port `equals`/`hashCode` exactly (`Int32`). If a polyomino site hashes it in a `HashMap`/`HashSet`,
   export a `HashStrategy` (P2).
5. **`Polyominoes`:** both constructors (§6.5), with `fill` and aspect-ratio handling as Java. `ProfileFill` keeps
   its sweep order.
6. Write unit tests derived from the Java:
   - `TwoBitGrid` get/set on word boundaries (cells 15/16, 31/32) and every value of the three-value domain;
   - `PlanarGrid` translation and out-of-range behaviour;
   - `Polyomino` construction from a cell pattern;
   - `ProfileFill` on a concave shape;
   - `UniqueTriple` equality and hash.

## Write-set
`src/alg/common/polyomino/structures/*.ts`, `src/alg/common/polyomino/ProfileFill.ts`,
`src/alg/common/utils/UniqueTriple.ts`, colocated tests.

## Read-set
- The eight Java files.
- `src/java/lang/{Int32,IndexOutOfBoundsException,IllegalArgumentException}.ts`, `src/java/util/HashStrategy.ts`.
- `src/core/options/Alignment.ts` (enum pattern), `decisions.md#pre-made` (P2, P7).

## Interface contracts (outputs, consumed by T12)
- `Polyomino extends PlanarGrid`, `Polyominoes<P extends Polyomino>` (`getPolyominoes()`, `getGrid()`), `PlanarGrid`,
  `Direction`, `TwoBitGrid`, `IThreeValueGrid`, `ProfileFill`, `UniqueTriple<A,B,C>`. All have the Java method names.

## Acceptance criteria
- Given a `TwoBitGrid`, when every cell around the 16- and 32-cell word boundaries is set to each value and read back,
  then the reads follow the Java bit layout.
- Given a `PlanarGrid` and an out-of-range coordinate, when accessed, then the Java exception (or result) occurs.
- Given two `UniqueTriple`s with equal members, when compared, then `equals` and `hashCode` follow the Java.
- Given `new Polyominoes(polys, ratio)` and `new Polyominoes(polys, ratio, fill)`, when constructed, then the grid and
  fill state follow the Java.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
