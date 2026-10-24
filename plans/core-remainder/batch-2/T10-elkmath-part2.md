<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — ElkMath Bezier and geometry sections, rest of `ElkMathTest`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T10): port elkmath bezier and geometry helpers`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). T3 made `ElkMath.ts` a facade over the combinatorics and aggregates sections; this task adds
the last two sections (P1).
- `BezierSpline` (T11) calls `approximateBezierSegment`.
- `alg.layered`, `alg.disco` and `alg.spore` later call `intersects`, `contains`, `shortestDistance` and `distance`.
- `ElkRectangle` landed in 5a. Its test file notes that the four rectangle cases of `ElkMathTest` wait for this task.

## Task
1. **`ElkMathBezier.ts`** (`J/math/ElkMath.java:200-610`): `approximateBezierSegment` (both overloads, per
   translation-rules §6.5), `getPointOnBezierSegment`, `approximateBezierSpline`, `distanceFromBezierSegment` and its
   private helpers (`convertToBezierForm`, `findRoots`, `controlPolygonFlatEnough`, `computeXIntercept`,
   `crossingCount`, `bezier`), plus the constants `MAXDEPTH` and `EPSILON` (`:467`).
   - Keep the helpers' recursion and array handling exactly.
   - If a function exceeds the complexity limits, split it at Java section boundaries (push-forward; stop 10 if that
     is impossible).
2. **`ElkMathGeometry.ts`** (`:925-1273`): the three `intersects` overloads, `intersects2`, `distance` and its
   private `traceRays`, the three `contains` overloads, and `shortestDistance`.
   - Use `fuzzyEquals` and `fuzzyCompare` from `src/guava/DoubleMath.ts` with the Java epsilon constant.
   - Keep `shortestDistance`'s XOR case (`:1262-1263`) verbatim.
3. **Facade:** add both sections' exports to `ElkMath.ts` and the `ElkMath` namespace object.
4. **`ElkMathTest.test.ts`:** append the rest of `JT/math/ElkMathTest.java`, i.e. `:26-128` (point, line and path
   contains/intersects, the 4 rectangle cases) and `:221-317` (Bezier points, approximate spline, distance from
   spline), with the exact Java expectations.
5. **`src/core/math/ElkRectangle.test.ts`:** update only the comment at `:6-7`, pointing it to
   `ElkMathTest.test.ts`. Do not change any assertion (AD-13).

## Write-set
`src/core/math/{ElkMath,ElkMathBezier,ElkMathGeometry}.ts`, `src/core/math/ElkMathTest.test.ts`,
`src/core/math/ElkRectangle.test.ts` (comment only), colocated unit tests.

## Read-set
- `J/math/ElkMath.java:200-610`, `:925-1273`; `JT/math/ElkMathTest.java:1-128`, `:221-317`.
- T3's facade and sections.
- `src/core/math/{KVector,KVectorChain,ElkRectangle}.ts`, `src/guava/DoubleMath.ts`.
- `docs/translation-rules.md` §6.5.

## Interface contracts (outputs, consumed by T11)
- `approximateBezierSegment(resultSize: number, ...controlPoints: KVector[]): KVector[]` and the
  control-points-only overload, named per §6.5.
- `getPointOnBezierSegment(t, ...controlPoints)`, `approximateBezierSpline(chain): KVectorChain`,
  `distanceFromBezierSegment(start, c1, c2, end, needle): number`.
- The `intersects`, `contains`, `distance` and `shortestDistance` overloads.

## Acceptance criteria
- Given every ported `ElkMathTest` case (`:26-128`, `:221-317`), when run, then each passes with the Java
  expectations, including the 4 rectangle cases.
- Given the full `ElkMathTest.test.ts` together with T3's cases, when run, then every Java test method of
  `ElkMathTest.java` has a TS counterpart.
- Given two rectangles overlapping on one axis only, when `shortestDistance` runs, then the result follows the Java
  case structure (`:1255-1271`).

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
