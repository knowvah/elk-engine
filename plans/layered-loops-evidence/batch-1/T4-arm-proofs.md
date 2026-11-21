<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: Sc28 proofs and the spline `:137` trace

## Context

[D5](../decisions.md#d5) and [D6](../decisions.md#d6) give the planning claims. [unreached.md](../unreached.md) holds
them, marked *to verify*.

## Task

1. **Sc28, three "dead" arms** (`RectilinearConvexHull.ts:17` cond-expr[0], `:223` if[1],
   `RectilinearConvexHullRectangleEventHandler.ts:71` if[1]): write each argument from the code, citing the
   `MaximalElementsEventHandler`, `addConcaveCorners`, quadrant and sort-order lines that establish it. Check it against
   an instrumented scratch run over the hulls of every landed `full/components-compaction/*` and
   `sites/ComponentsCompactor/*` row, plus random point sets. A counterexample voids the argument: hand it back as a
   candidate row.
2. **`PointQuadrant.ts:63` binary-expr[1]**: write a scratch script that wraps the comparator `Scanline.ts:44` passes
   to `Array.prototype.sort` and records every call where the first argument precedes the second in the input list and
   is a Q1 point at equal x with a non-Q1 point. Run it on the landed rows' hulls and on random, sorted,
   reverse-sorted, blocked and sawtooth inputs with n = 2..5,000. Hand back the counts and `node --version`. Zero calls
   gives the **U on V8** classification. Any call gives a candidate row.
3. **Spline `:137 if[1]`**: build the D5 graph:
   - W (`portConstraints=FIXED_SIDE`, one WEST port, output) → T;
   - root `edgeRouting=SPLINES`, `layerUnzipping.strategy=ALTERNATING`;
   - `crossingMinimization.strategy=NONE` if needed to keep [W, D].
   Run it through the TS layered layout in a scratch copy with a counter on the `:137` else arm. Hand back: the arm
   count, both Java sites hit (left-layer EAST and right-layer WEST), the thrown error, and its stack frame at
   `getSplinePath`. If the arm is not reached, try the variant orders and journal them. Then hand the orchestrator the
   graph as ELK JSON for the D5 oracle probe.
4. **Orchestrator, after the hand-back**: run the D5 probe. A single-file Java program under `$TMPDIR` on the oracle
   classpath (copy the classpath assembly of `tools/vectors/layered-loops-vectors.sh`) lays out the graph and prints
   the exception class, message and first `org.eclipse.elk` frame. Journal the output (`evidence`).

## Write-set

None in the repository. Scratch: `$TMPDIR/layered-loops-evidence/T4/`.

## Read-set

`src/alg/layered/compaction/recthull/*.ts` and `compaction/recthull/*.java`; `src/alg/layered/p5edges/splines/SplineEdgeRouter.ts:220-460`,
`SplineEdgeRouterSegments.ts:100-160`; `SplineEdgeRouter.java:220-490, :940-960`;
`src/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.ts`; `plans/layered-loops-wrapping-compaction/unreached.md:95-140, :620-660, :950-960`.

## Acceptance criteria

- Given the three dead-arm arguments, when the instrumented scratch run covers every landed hull and the random sets,
  then no arm is hit, and each argument cites the lines it rests on.
- Given the comparator script, when it runs, then the count of earlier-Q1-first calls and the Node version are handed
  back.
- Given the D5 graph, when it runs through the TS layout, then the `:137` else arm count is > 0 and the TypeError's
  stack names `getSplinePath`, or the deviation is handed back for stop 2.

## Observability

N/A: scratch search, no runtime code.

## Rollback

Nothing to roll back (no repository write).
