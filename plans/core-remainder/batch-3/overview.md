<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Splines, harness switch, comments base, comment vectors

The write-sets are disjoint, so all four run in parallel. T14 runs JVM jobs, so the orchestrator's coverage gate
waits until T14's recording is done.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T11 | `ISplineInterpolator`, `BezierSpline`, `CubicSplineInterpolator` | typescript-pro | src/core/math/{ISplineInterpolator,BezierSpline,BezierSplineBezierCurve,CubicSplineInterpolator}.ts, src/core/math/{BezierSplineTest,CubicSplineInterpolatorTest}.test.ts | T10 | [x] |
| T12 | Layout harness uses `LayoutConfigurator` (exit criterion, P5) | typescript-pro | test/helpers/elkt-layout-harness.ts, test/helpers/elkt-layout-harness.test.ts | T5 | [x] |
| T13 | Comments base: abstract interfaces (R5) + ElkGraph providers | typescript-pro | src/core/comments/{IDataProvider,IBoundsProvider,IMatcher,IDecider,IFilter,IExplicitAttachmentProvider,ElkGraphDataProvider,ElkGraphBoundsProvider}.ts (+ tests) | T8 | [x] |
| T14 | Comment scenario recorder (R6, R7) | java-architect | tools/vectors/{CommentVectors.java,comment-vectors.sh}, tools/vectors/comment-scenarios/**, test/golden/refs/java/comments.json | — (oracle) | [x] |

The batch is done when every task's acceptance criteria pass, the README gates are green, and both golden sets
regenerate byte-stable after T12.
