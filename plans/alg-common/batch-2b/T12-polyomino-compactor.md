<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — `PolyominoCompactor`, the successor functions and replay

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T12): port polyomino compactor and successor functions`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`.

## Context
Mission 6a (README). Disco (8a) packs components with this. There is no Java test; T4's `polyomino` section is the
evidence.
- T1 landed the option enums and `PolyominoOptions`; T6 landed the grid structures.

## Task
1. Port `J/polyomino/{PolyominoCompactor,SuccessorCombination,SuccessorJitter,SuccessorLineByLine,SuccessorManhattan,SuccessorMaxNormWindingInMathPosSense,SuccessorQuadrantsGeneric}.java`.
   - `PolyominoCompactor`'s nested comparators (`:154`, `:174`, `:212`, `:231`, `:258`, `:289`) go in prefixed files
     (M15). Keep each `compare` body verbatim and use `Double.compare`/`Int32` (P7).
   - The `BiFunction` successor types become TS function types. Keep each successor's generation order exactly; it
     decides where a polyomino lands.
   - `SuccessorJitter`: check for any randomness. There should be none (no `Random` in the bundle); journal what
     "jitter" means here.
   - Read the options exactly as Java does (property reads on `Polyominoes` or parameters) with T1's
     `PolyominoOptions`.
2. **Replay** (`src/alg/common/polyomino/PolyominoVectors.test.ts`): for every `alg-common.json` `polyomino` scenario,
   rebuild the polyominoes as the recorder did, run `packPolyominoes`, and assert every recorded result field exactly.
   On a mismatch, name the mechanism (stop 5).
3. Add unit tests from the Java for each successor function's first few positions and each comparator's ordering.

## Write-set
`src/alg/common/polyomino/{PolyominoCompactor,Successor*}.ts` (+ prefixed comparator files),
`src/alg/common/polyomino/PolyominoVectors.test.ts`, colocated unit tests.

## Read-set
- The seven Java files.
- T1's `src/alg/common/compaction/options/*.ts`; T6's `src/alg/common/polyomino/structures/*.ts`, `ProfileFill.ts`,
  `utils/UniqueTriple.ts`.
- `test/golden/refs/java/alg-common.json` (`polyomino`) and the header of `AlgCommonVectors.java`.

## Interface contracts (outputs, consumed by 8a)
- `new PolyominoCompactor().packPolyominoes(polyHolder: Polyominoes<P>): void`.

## Acceptance criteria
- Given every `polyomino` scenario, across all traversal strategies and sorting criteria, when replayed, then every
  result equals the JVM's.
- Given each successor function, when its first N positions are generated, then they follow the Java (unit test).
- Given `npm run complexity`, when run, then `PolyominoCompactor*` is within the limits (stop 10 otherwise).

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
