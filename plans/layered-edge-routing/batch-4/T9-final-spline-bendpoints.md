<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — `FinalSplineBendpointsCalculator`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T9): port the final spline bend point calculator`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T9/`.

## Context

Mission 7e (README), R1, R5, R6, R9, R14. 619 Java lines, after P5 under SPLINES (`SplineEdgeRouter.java:88-91`),
after `LongEdgeJoiner` (T5) in enum order: `process` `:82` (reads `COMPACTION_POST_COMPACTION_STRATEGY` into a field;
collects the start edges with a stream `:92-97`), `indexNodesPerLayer` `:116`, `calculateControlPoints` `:135`
(iterates `segment.edges` `:142,174` and takes its first element `:185`: the R9 insertion-order site),
`calculateControlPointsStraight` `:181`, `…InvertedEdge` `:201`, `…Conservative` `:259`, `…Sloppy` `:334` (`assert`
`:336`), `nodeToBoundingBox` `:427`, `computeSloppyCenterY` `:434` with `(int) Math.signum` `:454`,
`calculateBezierBendPoints` `:465` (`SplineEdgeRouter.isQualifiedAsStartingNode` `:478`, `new NubSpline(true,
SplineEdgeRouter.SPLINE_DIMENSION, allCP)` `:541`), `insertStraighteningControlPoints` `:546`, `absMin` `:576`,
`segmentAllowsSloppyRouting` `:584` (reads the compaction strategy `:586`; `HorizontalGraphCompactor` is a Javadoc
link only, no import needed), `segmentNodeDistanceThreshold` `:616`. Its arm is the sixth 7e arm (R5).

## Task

1. Port `FinalSplineBendpointsCalculator.ts` with sections at method boundaries if over 500 TS lines
   (`…ControlPoints.ts`: the four `calculateControlPoints*` methods and their helpers; `…Bezier.ts`:
   `calculateBezierBendPoints`, `insertStraighteningControlPoints`), `@see`, every branch, Java order; `d2i` for the
   `signum` cast (R6); the `assert` omitted with a comment; `segment.edges` iterated in insertion order (R9).
2. `IntermediateProcessorStrategyCreate.ts`: the `FINAL_SPLINE_BENDPOINTS_CALCULATOR` arm instantiates
   (`J/intermediate/IntermediateProcessorStrategy.java:229`); `IntermediateProcessorStrategy.test.ts`'s "ports
   exactly" case counts 31 ported / 28 pending.
3. C6 and R8 checks; state the results.
4. Tests, colocated, L4 (R14): replay every `models/*` and `scenarios/*` row whose stop is
   `FINAL_SPLINE_BENDPOINTS_CALCULATOR` with the class injected and every other name through the real enums (the
   prefix runs T8's router and T5's joiner), assert `compareRouting` (and the full dump where present) is `[]`: the
   bend points of every edge are the proof, `CONSERVATIVE` and `SLOPPY` modes both. No hand-derived control point.
5. `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, `npx vitest run <files>` clean.

## Write-set

`src/alg/layered/intermediate/FinalSplineBendpointsCalculator*.ts` (+ tests),
`src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts` (one arm),
`src/alg/layered/intermediate/IntermediateProcessorStrategy.test.ts` (the ported-set case only).

## Read-set

`J/intermediate/FinalSplineBendpointsCalculator.java`, `J/p5edges/splines/SplineEdgeRouter.java:995-1010`, the T6–T8
files (signatures), `src/alg/layered/intermediate/LongEdgeJoiner.ts` (T5), `src/core/math/{ElkMath,ElkRectangle,
KVectorChain}.ts`, `src/alg/layered/options/{GraphCompactionStrategy,SplineRoutingMode}.ts`, `test/helpers/
layered-routing-replay-*.ts` (T3 contract), `decisions.md` R5, R6, R9, R14.

## Architecture decisions

R1, R5 (the arm in the section), R6, R9, R14, C6.

## Interface contract (consumed by T10)

`FinalSplineBendpointsCalculator` with a no-argument constructor and `process(graph, monitor)`; the arm returns
`new FinalSplineBendpointsCalculator()`.

## Acceptance criteria

- Given every `FINAL_SPLINE_BENDPOINTS_CALCULATOR` row, when replayed with the class injected, then `compareRouting`
  is `[]`.
- Given the enum, when `create()` runs for every 7e member, then an instance; the tally and the 31/28 counts hold.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
