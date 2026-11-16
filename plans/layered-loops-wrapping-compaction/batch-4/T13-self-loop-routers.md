<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Self-loop routers

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T13): port the self-loop routers`
Scratch: `$TMPDIR/7g/T13/`.

## Context

W1, W8, W14. `J/intermediate/loops/routing/{AbstractSelfLoopRouter (29), PolylineSelfLoopRouter (136), OrthogonalSelfLoopRouter
(471), SplineSelfLoopRouter (102)}.java`. They use T10's `RoutingDirector`/`RoutingSlotAssigner`/`LabelPlacer`. 7e's hand-off:
the self-loop spline router builds on the landed `NubsSelfLoop` only if the Java does (`NubsSelfLoop` has no caller at the pin,
R1); port what `SplineSelfLoopRouter.java` calls, nothing more.

## Task

1. Port `JT/intermediate/loops/routing/PolylineSelfLoopRouterTest.java` (2 runs) **first** to
   `src/alg/layered/intermediate/loops/routing/PolylineSelfLoopRouterTest.test.ts`, Java literals unchanged.
2. Port the four classes; `@see` on every symbol; `KVectorChain` and `ElkMath` from the landed core.

## Write-set

`src/alg/layered/intermediate/loops/routing/{AbstractSelfLoopRouter,PolylineSelfLoopRouter,OrthogonalSelfLoopRouter,SplineSelfLoopRouter}.ts`
(plus sections), their tests, `PolylineSelfLoopRouterTest.test.ts`.

## Read-set

The four Java files and the test, T9's and T10's TS files, `src/core/math/{KVectorChain,ElkMath}.ts`,
`src/alg/layered/p5edges/splines/NubsSelfLoop.ts` (reference only), `decisions.md` W8.

## Acceptance criteria

- Given `PolylineSelfLoopRouterTest`, when run, then both cases pass with the Java's assertions unchanged.
- Given the router classes, when `SelfLoopRouter` (T14) selects by `EdgeRouting`, then each router is reachable (the selection
  test is T14's).
- Given `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
