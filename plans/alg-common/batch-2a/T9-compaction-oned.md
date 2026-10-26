<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — `compaction/oned`, `compaction/DebugUtil`, `OneDimensionalCompactorTest`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T9): port one-dimensional compaction`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common`.

## Context
Mission 6a (README). This is the largest task: about 1,800 Java lines plus a 693-line test. Layered's horizontal
compaction (7x) uses it.
- The 13 `oned` files reference each other in a cycle through `OneDimensionalCompactor`, so they land together.
- Type-only imports break the type cycles. Runtime cycles must not touch a binding at module evaluation (the ESM TDZ
  lesson in `.agent-notes/core-engine.md`).
- T2 landed `compaction/Scanline`.

## Task
1. Port `J/compaction/oned/{CGraph,CGroup,CNode,CompareFuzzy,ICompactionAlgorithm,IConstraintCalculationAlgorithm,ILockFunction,ISpacingsHandler,LongestPathCompaction,OneDimensionalCompactor,QuadraticConstraintCalculation,Quadruplet,ScanlineConstraintCalculator}.java`.
   - `OneDimensionalCompactor` (523 lines) becomes a facade plus sections (P1). Keep Java order and names.
   - Collections: `CGroup.cNodes` (`Sets.newLinkedHashSet`, `:65`) → `Set`; `CGroup.incomingConstraints`
     (`Sets.newHashSet`, `:66`, identity) and `OneDimensionalCompactor.incMap` (`:500`, identity) → `Map`/`Set` in
     insertion order. Journal both and draft I-rows (P2); check whether their iteration is observable (stop 7).
   - `CompareFuzzy` uses the Java tolerance constants verbatim, with `DoubleMath.fuzzyCompare` if Java does.
   - Function-typed fields (`ILockFunction`, `ISpacingsHandler`, `BiFunction`s) become TS function types or
     interfaces as the call sites need.
2. Port `J/compaction/DebugUtil.java` per AC4: logic kept, file writes are no-ops.
3. Port `JT/compaction/oned/OneDimensionalCompactorTest.java` (every `@Test`) to
   `src/alg/common/compaction/oned/OneDimensionalCompactorTest.test.ts`, with the exact Java expectations
   (`ElkRectangle`, `Direction` from core).
4. Add unit tests from the Java for branches the JUnit cases miss: `QuadraticConstraintCalculation`, locking, the
   group offsets in `CGroup`.

## Write-set
`src/alg/common/compaction/oned/*.ts` (+ facade sections), `src/alg/common/compaction/DebugUtil.ts`,
`OneDimensionalCompactorTest.test.ts`, colocated unit tests.

## Read-set
- The 14 Java files and `JT/compaction/oned/OneDimensionalCompactorTest.java`.
- T2's `src/alg/common/compaction/Scanline.ts`; `src/core/math/ElkRectangle.ts`, `src/core/options/Direction.ts`,
  `src/guava/DoubleMath.ts`.
- `.agent-notes/core-engine.md` (ESM cycle notes), `decisions.md#pre-made`.

## Interface contracts (outputs, consumed from 7x on)
- `OneDimensionalCompactor` with its Java builder API (`changeDirection`, `compact`, `setLockFunction`, …).
- `CGraph`, `CNode`, `CGroup` with their Java fields.

## Acceptance criteria
- Given every `OneDimensionalCompactorTest` case, when run, then it passes with the Java expectations.
- Given the identity-hashed `incomingConstraints`/`incMap`, when iteration order is varied in a unit test, then no
  JUnit result changes; if one would, stop (stop 7).
- Given `npm run complexity`, when run, then `OneDimensionalCompactor*` is within the limits (stop 10 otherwise).
- Given `DebugUtil` called with any output path, when run, then no file system access happens.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
