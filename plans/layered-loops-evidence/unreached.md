<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-loops-evidence: reclassified arms and equivalence proofs

This file corrects `plans/layered-loops-wrapping-compaction/unreached.md` without editing it ([D10](decisions.md#d10)).
It uses that file's classes: **S** (reached by a sites row), **U** (unreachable, with the reason), **X** (the Java
throws), **J** (covered by a ported JUnit test or a structural case). Each entry names the 7g line it corrects. The
evidence rows are in [decision-journal.md](decision-journal.md) (2026-11-21, tasks T4 and T7). TS lines are at the base
`4c380f26`.

## `p5edges/splines/SplineEdgeRouterSegments.ts:137 if[1]` (7g: S, Sc22, "no graph found")

**Class: X** (as 7g's `:246 if[1]` and `:257 if[1]`), reached by a graph, on the oracle and in the port.

- **Arm.** The `else` after `else if (targetLayer === leftLayer)` in `addOutgoingEdges`: an outgoing edge of an EAST port
  of the left layer, or of a WEST port of the right layer, whose target is in neither layer of the pair. The edge was
  added to `edgesRemainingLayer` and is removed again. The Java has the code twice
  (`SplineEdgeRouter.java:398-402` and `:445-449`); the port has it once.
- **Producer.** `AlternatingLayerUnzipper` (`layerUnzipping.strategy=ALTERNATING`), which 7g did not consider. It moves
  the nodes of one layer into sub-layers, and the dummies of an inverted port's edge end up in different ones.
- **Graph.** W (30 × 30, `portConstraints=FIXED_SIDE`, one WEST port W.p0), X, T; edges W.p0 → T, W → X, X → T; root
  `elk.direction=RIGHT`, `edgeRouting=SPLINES`, `layerUnzipping.strategy=ALTERNATING`.
  - Planning's graph (W.p0 → T alone, D5) does **not** reach the arm: the edge is reversed and T is placed left of W. The
    cycle W → X → T keeps the WEST port's edge forward. On the oracle the plain graph lays out (root 108.0 × 54.0).
- **Oracle, before the router** (`SplineArmProbe.java`: the plan up to, not including, `SplineEdgeRouter`): five layers
  - 0: W, a long edge dummy
  - 1: three long edge dummies
  - 2: X, a long edge dummy
  - 3: two long edge dummies
  - 4: T

  and two edges that meet the arm's condition, one per Java site:
  - pair (none, 0), `:445-449`: W's WEST port → a long edge dummy in layer 1;
  - pair (1, 2), `:398-402`: a long edge dummy of layer 1 (EAST port) → a long edge dummy in layer 0.
- **Oracle, the layout** (`SplineProbe.java`):
  `java.lang.NullPointerException: Cannot assign field "sourcePort" because "segment" is null` at
  `SplineEdgeRouter.getSplinePath(SplineEdgeRouter.java:956)`, called from `SplineEdgeRouter.process(SplineEdgeRouter.java:307)`.
  A dropped edge stays a start edge and has no segment.
- **Controls on the oracle.** The same graph lays out with `layerUnzipping.strategy=NONE` (root 168.0 × 66.5) and with
  `edgeRouting=ORTHOGONAL` (208.0 × 75.0).
- **Port.** `SplineEdgeRouter.sites.test.ts`, describe "SplineEdgeRouter on an inverted port whose dummies the layer
  unzipper splits (layered-loops-evidence, X)":
  - "takes the unhandled arm once per site…" runs the plan up to the router, compares the five layers with the probe, and
    checks that `clearThenFillMappings` drops exactly the two edges above;
  - "throws where the Java throws…" expects a `TypeError` whose first stack frame is `getSplinePath`
    (`SplineEdgeRouter.ts:444`, the write to the missing segment);
  - "lays the same graph out without the unzipper and with orthogonal routing" pins the two control sizes.

  With the arm's statement removed in a scratch copy, the first two cases fail (and so does the older structural case).
- **Why no row.** The loops recorder does not record a row whose oracle run throws (D5). The throw itself looks like an
  upstream defect (a layout option combination that ends in a `NullPointerException`); it is reported in the follow-up
  `needs-ruling` issue of this mission ([upstream-drafts.md](upstream-drafts.md)), not fixed here.

## Sc28: the four rectilinear-hull arms (7g: S, "hulls of 32+ points, out of the size budget")

`RectilinearConvexHull.of(points).splitIntoRectangles()` has one caller, `ComponentsCompactor.transformLGraph`
(`ComponentsCompactor.java:304-305`). The arguments below hold for every point list with **finite** coordinates that gets
past `initialLastX` (`RectilinearConvexHull.ts:231-234`; the Java throws a `NullPointerException` there for a list
without a second leftmost point, 7g's X entry). They rest on four facts of the hull `of` builds.

- **F1, one convex point per x and quadrant.** Each staircase scan sorts by x, ties by y so that the best point of an x
  comes first (`RIGHT_LOW_FIRST` … `LEFT_HIGH_FIRST`, `RectilinearConvexHull.ts:19-49`; Java `:185-209`), and
  `MaximalElementsEventHandler.handle` keeps a point only when its y is strictly better than the best so far
  (`…MaximalElementsEventHandler.ts:51-55`; Java `:261-266`). So the convex points of one quadrant have pairwise different
  x. The first scanned point is kept (the best so far starts at ±∞), so Q1 and Q4 each have a convex point at the smallest
  x, and Q2 and Q3 at the largest.
- **F2, concave points sit at inner x.** `addConcaveCorners` (`RectilinearConvexHull.ts:244-257`; Java `:171-183`)
  inserts `(next.x, last.y)` in front of every convex point but the first. A quadrant's concave points therefore have
  pairwise different x, each the x of one convex point of that quadrant that is not its first.
- **F3, hull order.** The list is Q1, reversed Q2, Q3, reversed Q4 (`:159-163`; Java `:128-132`): every Q1 point
  precedes every other point.
- **F4, the order at equal x.** `RIGHT_SPECIAL_ORDER` (`:58-77`; Java `:277-295`) is a total order. At one x it puts Q1
  and Q4 before Q2 and Q3 (the ordinals are Q1, Q4, Q2, Q3: `PointQuadrant.ts:16-19`); within Q1/Q4 concave before
  convex, then Q1 before Q4; within Q2/Q3 convex before concave, then Q2 before Q3.

| Arm | Class | Argument |
| --- | ----- | -------- |
| `RectilinearConvexHull.ts:17`, the `a === b ? 0` arm of `integerCompare` | **U** | It needs two points of one quadrant at one x with equal convexity (`:64-72` returned otherwise). By F1 and F2 a quadrant has at most one convex and one concave point at an x. The only other way is a comparator call with the same element twice, which V8's sort never made (0 of 1,522,874 calls, below) |
| `RectilinearConvexHull.ts:223 if[1]` (no rectangle is queued after the scan) | **U** | By F1, F2 and F4 the last point of the scan is Q3's convex point at the largest x, and Q2's convex point at that x precedes it. `handle` sets `minY` from the Q2 point and `maxY` from the Q3 point; a convex Q3 point is a queueing point (`…RectangleEventHandler.ts:81-90`), both are set, so the last call queues a rectangle |
| `RectilinearConvexHullRectangleEventHandler.ts:71 if[1]` (a queueing point before `minY` and `maxY` exist; the Java's "FIXME else?") | **U for finite coordinates** | By F1, F2 and F4 the first two points of the scan are the convex Q1 and Q4 points at the smallest x. Neither queues (Q1 and Q4 queue only when concave); the first sets `minY`, the second `maxY`, and neither is unset later |
| `PointQuadrant.ts:63 binary-expr[1]` (`q2 === Quadrant.Q4`, evaluated when `q1` is Q1) | **J**, and **U on V8** through the hull | Covered since 7g's T21 by the structural case of `compaction/CompactionAnchored.test.ts:514-523`, which calls the predicate with every quadrant pair (the base coverage report shows no open branch on the line). Through `RIGHT_SPECIAL_ORDER` it needs a comparator call `(p1, p2)` with p1 in Q1, p2 in another quadrant and equal x. By F3 such a p1 precedes p2 in the list, and `Array.prototype.sort` (`Scanline.ts:44`) passed the earlier element first in none of the measured calls |

Measurements (scratch scripts under `$TMPDIR/layered-loops-evidence/T4/`, Node v26.3.1, V8 14.6.202.34; instrumented
counters in a scratch copy of the hull classes):

- **Every row of the loops ref** (the two replay suites on the ref with this mission's rows; rerun by the orchestrator
  because the first filter had left out `full/converted/labels/ticket-213_componentsCompaction`): 475 `of` calls, hulls
  of 4 to 83 points, no NaN or ∞ in any hull input. The equal arm of `:17`, the `:223` else, the `:71` else and the
  right operand of `:63`: 0 hits each. With the unit suites of `components/` and `compaction/` added: 1,425 `of` calls,
  the same zeros, and 4 evaluations of the `:63` operand, all from the structural case (the four pairs that start with
  Q1).
- **Fuzz, finite.** 57,000 point sets from 19 generators (random floats, grids with many ties, duplicates, one point
  repeated, horizontal, vertical and diagonal lines, diamonds, −0/0, negative and half-integer coordinates; 0 to 60
  points). 51,688 complete; the others throw at `initialLastX` or on the empty list, before any arm. 0 hits of the three
  arms.
- **Fuzz, non-finite.** 6,000 sets with ±∞ or NaN: the `:71` else is hit 189 times, the other two never. The smallest
  set is (2, 1), (0, +∞): Q1 keeps no point at x 0, so the first scanned point is a queueing Q3 point. This is a
  hand-built point list, not a layout: no row of the ref hands `of` a non-finite point (the NaN of
  `ticket-213_componentsCompaction` arises after the hulls are built). Whether to pin the non-finite case with a JVM
  vector is left to the follow-up issue.
- **Comparator call order.** Over the hulls of 1,193 `of` calls of the landed rows (11,211 comparator calls of
  `RIGHT_SPECIAL_ORDER`) and over hull-ordered inputs with n = 2 to 5,000 (seven point-cloud shapes × random, sorted,
  reversed, blocked and sawtooth input order; 5,075 lists; 1,520,931 calls) the right operand of `:63` ran 0 times. On
  hand-built lists in other orders it ran 127,387 times, always with the later element as the first argument. An
  independent script (`order-check.mjs`: 900 lists of six input families, n = 2 to 5,000, 1,522,874 calls) found no call
  with the first argument at the lower input index and no call with one element twice.

7g's "hull of 32+ points" described the JDK's sort, which the port does not use; a larger hull does not reach these arms
in the port. The class of `:63` depends on the engine's sort: a runtime whose sort passes the earlier element first
would run the operand. The comparator is a consistent total order, so the sorted result is the same either way.

## Mutant findings (T6)

Every mutant of [mutants.md](mutants.md) is `killed` by an oracle row, so this section holds no equivalence proof and no
`open` entry. What the searches established on the way (TS traces first, then the oracle rows):

- **M2.** #55's recipe (one skip edge per span) keeps the cuts at 2 and 6 under both operators. The tie needs an index
  that is cheaper than both manual cuts and equally far from them: five edges n0 → n3 and four n4 → n7 make index 4 such
  an index.
- **M3.** Planning found no negative `delta`. It is negative whenever the incident node is the vertical segment of a
  north or south port far right in its node's group (`LGraphToCGraphTransformer` groups the segment with the node at the
  port's x). The clamp matters when another node constrains only that segment and the node is pulled left.
- **M4, M5.** The landed `invertedPorts/*` rows never run the WEST block: the edge of a WEST output port is reversed
  before compaction unless a cycle keeps it forward. Where the block does run, the separation constraint between the
  segment and the node has `delta = ceil(spacing.edgeNodeBetweenLayers)` = 10, which is never below the inverted-port
  edge's 1. With that spacing at 0, the edge decides.
- **M6.** An external-port dummy on the north or south side gets its margin only in
  `HierarchicalPortOrthogonalEdgeRouter.restoreDummy` (`.java:217-246`), and only if the graph's size constraints hold
  `PORT_LABELS`. The layout transfer overwrites the dummy's y afterwards (`LGraphUtil.getExternalPortPosition`), so only
  a stop at `HORIZONTAL_COMPACTOR` on the nested level shows the value.
- **M7-M9.** After `applyPositions` an external-port dummy is clamped to the frame of the graph before compaction, so its
  coordinate across the port side can lie outside the compacted size. `includeExternalEdgesInSize` reads that coordinate
  only if the segment leaving the dummy counts as parallel to the port side, which a real segment never is. It does
  count as parallel inside the method's `EPSILON` (1e-4): a padding of 4e-5 puts the dummy that close to the anchor of
  its neighbour. For the y arm the segment must also fail the x test, so the two anchors differ by more than 1e-4 in x
  without a bend point: direction DOWN, `nodePlacement.strategy=SIMPLE`, and a port 5e-4 off the node's centre, under
  the orthogonal router's tolerance of 1e-3. The only landed row where the method changed a result
  (`ticket-213_componentsCompaction`) does so through NaN.
- **M10.** #55's recipe (a single WEST or EAST edge routed below every node) cannot move the result: a WEST or EAST
  placeholder spans the y-range of its own hull and moves with it. Only a SOUTH placeholder ends below every hull, and
  its height is the top margin of the SOUTH dummies. That margin is positive when an OUTSIDE port label was imported
  above its port and `PORT_LABELS` is among the size constraints (the M6 mechanism).
