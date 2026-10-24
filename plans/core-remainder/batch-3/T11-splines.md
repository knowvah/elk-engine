<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — `ISplineInterpolator`, `BezierSpline`, `CubicSplineInterpolator`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T11): port bezier spline and cubic spline interpolator`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). These are the spline helpers. Nothing in scope calls them yet (`alg.disco.debug` and `conn.gmf`
are out of scope), but the core tests do. `BezierSpline.getPolylineApprx` calls T10's `approximateBezierSegment`.

## Task
1. Port these files with `@see` headers:
   - `J/math/ISplineInterpolator.java`: an interface, with its constants if any.
   - `J/math/BezierSpline.java`: the nested static `BezierCurve` goes in `BezierSplineBezierCurve.ts` (P1, M15) and
     is re-exported as `BezierSpline.BezierCurve` if Java code addresses it that way.
   - `J/math/CubicSplineInterpolator.java`.
2. `curves` is a Java `LinkedList` walked with a `ListIterator` (`:114`). Use the landed
   `src/java/util/{LinkedList,ListIterator}.ts`.
3. The `interpolatePoints` overloads (`KVector[]` vs `LinkedList<KVector>`, each with and without start and end
   vectors) are told apart at run time with `Array.isArray`. Use overload signatures per translation-rules §6.5.
4. Keep `CubicSplineInterpolator`'s coefficient tables (`INTERP_COEF_ODD`, `INTERP_COEF_EVEN`, `MAX_K`) byte-exact,
   along with the `Math.min` and `Math.abs` index arithmetic (`:72-83`, `:166-176`). Integer arithmetic goes through
   `Int32` where Java's `int` could wrap; journal whether it can.
5. Port the tests:
   - `JT/math/BezierSplineTest.java` (5 cases) → `src/core/math/BezierSplineTest.test.ts`;
   - `JT/math/CubicSplineInterpolatorTest.java` (1 case) → `src/core/math/CubicSplineInterpolatorTest.test.ts`.

## Write-set
`src/core/math/{ISplineInterpolator,BezierSpline,BezierSplineBezierCurve,CubicSplineInterpolator}.ts`,
`src/core/math/{BezierSplineTest,CubicSplineInterpolatorTest}.test.ts`, colocated unit tests (e.g. `toString`,
`addSpline` at the beginning vs the end).

## Read-set
- The three Java files and the two Java tests.
- `src/core/math/{KVector,ElkMath,ElkMathBezier}.ts`, `src/java/util/{LinkedList,ListIterator}.ts`.
- `docs/translation-rules.md` §6.5.

## Interface contracts (outputs)
- `BezierSpline`: `addCurve` (both overloads), `addSpline(spline, beginning)`, `getStartPoint`, `getEndPoint`,
  `getInnerPoints`, `getBasePoints`, `getPolylineApprx(accuracy)`, `getCurves(): LinkedList<BezierCurve>`,
  `toString`.
- `BezierCurve`: `start`, `fstControlPnt`, `sndControlPnt`, `end` (Java field names), `asVectorList`, `asArray`.
- `CubicSplineInterpolator implements ISplineInterpolator`: `calculateClosedBezierSpline` and the `interpolatePoints`
  overloads.

## Acceptance criteria
- Given the 5 `BezierSplineTest` cases and the `CubicSplineInterpolatorTest` case, when run, then all pass with the
  Java expectations.
- Given `addSpline(other, true)` and `addSpline(other, false)`, when the curves are read, then they are prepended and
  appended in Java's order.
- Given `interpolatePoints` called with an array and with a `LinkedList` of the same points, when compared, then the
  splines are equal.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
