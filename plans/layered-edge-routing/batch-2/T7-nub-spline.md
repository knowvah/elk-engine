<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — `NubSpline` and `NubsSelfLoop`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port the NURBS spline classes`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T7/`.

## Context

Mission 7e (README), R1, R6, R8, R12, R14. 1,450 Java lines of pure geometry: `NubSpline` 1,134 (constructors
`:84-168`, `generateDerivedNUBS` `:189`, `generateInvertedNUBS` `:240`, getters `:284-382`, `createUniformKnotVector`
`:409`, `calculateOuterBox` `:445`, `getTFromPolar` `:455`, `insertKnot` `:474`, `insertKnotAtCurrentPosition` `:516`,
the first/last vertical/horizontal points `:572-652`, `getPointOnCurve` `:688,709`, `toBezier` and `mirrorOnX`
further down, nested `PolarCP` `:1018`) and `NubsSelfLoop` 316 (`extends NubSpline`; five static factories
`:127,158,233,266,298` with `assert` lines `:239,273,305`; no caller at this commit, R12). Depends on `KVector`,
`KVectorChain` (`src/core/math/KVectorChain.ts`), `LPort` and T6's `Rectangle` (`getOuterBox`): T6 runs in the same
batch, so import `./Rectangle.js` by name and typecheck once T6's file exists (coordinate through the orchestrator;
until then a local `import type` is acceptable for the draft but not for the hand-back).

## Task

1. Port `NubSpline.ts` with sections at method boundaries (`NubSplineKnots.ts`: knot vector, multiplicity,
   insertion; `NubSplineDerivation.ts`: derived and inverted splines, the vertical/horizontal points;
   `NubSplineBezier.ts`: `toBezier` and helpers; facade keeps construction, getters, `getPointOnCurve`), nested
   `PolarCP` in `NubSplinePolarCP.ts` (M15), and `NubsSelfLoop.ts`, with `@see`, every branch, Java order. `List<Double>`
   knot vectors are `number[]`; integer arithmetic through `Int32` where the Java uses `int` (indices, multiplicity,
   dimension). The three `assert` lines omitted with a comment. R8: confirm `insertKnot`/`generateDerivedNUBS`
   are not recursive.
2. C6: grep for boxed compares (`List<Double>` `get`/`equals` in the knot-vector code is the candidate; state the
   result).
3. Tests, colocated, L4 (R14): every `calls/NubSpline/*` and `calls/NubsSelfLoop/*` row through T3's `runCall`
   (callers: the constructors via a small wrapper, the statics, `getPointOnCurve`), `compareCall` `[]`; structural
   cases from the Java (dimension constant, exception classes on bad dimensions, `PolarCP` shape). No hand-derived
   control point.
4. `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, `npx vitest run <files>` clean.

## Write-set

`src/alg/layered/p5edges/splines/{NubSpline,NubSplineKnots,NubSplineDerivation,NubSplineBezier,NubSplinePolarCP,
NubsSelfLoop}.ts` (+ tests).

## Read-set

The two Java files, `src/core/math/{KVector,KVectorChain}.ts`, `src/alg/layered/p5edges/splines/Rectangle.ts` (T6
contract: `Rectangle(top, right, bottom, left)`, `union`, getters), `src/java/lang/Int32.ts`,
`src/alg/layered/p4nodes/NetworkSimplexPlacer*.ts` (section-split pattern), `test/helpers/layered-routing-replay-ops.ts`
(`runCall`), `decisions.md` R6, R8, R12, R14.

## Architecture decisions

R1 (incl. `NubsSelfLoop`), R6, R8, R12 (`calls` rows as the proof), R14, P1, M15.

## Interface contract (consumed by T8, T9)

Java names exactly: `NubSpline` constructors (`(isUniform, dim, controlPoints: KVector[] | KVectorChain)`, the copy
constructor), `generateDerivedNUBS`, `generateInvertedNUBS`, `getPointOnCurve`, `toBezier`, `getControlPoints`,
`getOuterBox`; `NubsSelfLoop` factories.

## Acceptance criteria

- Given every `calls/NubSpline/*` and `calls/NubsSelfLoop/*` row, when run through `runCall`, then `compareCall` is `[]`.
- Given the hand-back, when read, then it states the C6 result and the recursion check.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
