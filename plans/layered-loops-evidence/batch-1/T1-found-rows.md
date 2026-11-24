<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: the rows whose recipe is known (M1, M2, D7)

## Context

The planning scoping found a graph for M1 by reading the Java, and one for M2 that a TS scratch run confirmed. For D7
it identified the four missing FREE-node combinations. T1 turns these into `evidenceSites()` snippets and pre-screens
them ([D2](../decisions.md#d2)). Nothing is recorded here: T5 records.

**Pre-screen method.** Clone a landed `sites` row of the same shape from the ref, replace its inline input with the
candidate graph, and run `runLoopsRow` (`test/helpers/layered-loops-replay-ops.ts:126`) in the base scratch copy and
in a copy carrying the mutant. Then diff the two dumps. For D7 rows there is no mutant: check that the base dump shows
the intended placement.

## Task

1. **M1** `sites/PortSideAssigner/oddCornerSplit/EQUALLY`. Build a single FREE node `a` with no neighbours, so every
   port is hidden. It carries `selfLoopDistribution=EQUALLY`, 15 side-less ports, and five hyper loops of three ports
   each: chains `p3k → p3k+1 → p3k+2`, edges `le(2k, …)`, `le(2k+1, …)`. Use `ro = lo("DIRECTION", RT)` and stop
   `SELF_LOOP_PORT_RESTORER` with `manager` false, copying the shape of Sc20 (`LayeredLoopsVectorsSites.java:210-216`:
   `flat`, `loopNode(ropts(PORT_CONS, "FREE", SELF_DIST, "EQUALLY"), sides…)`, `join(…)`). Do not use `gLoopA`: its
   neighbour edges make ports visible.
   - Why it discriminates: loops are sorted by port count descending, and targets cycle N, S, E, W, NW, NE, SW, SE, so
     loop 5 is the NW corner target. Its ports are sorted by net flow: +1, 0, −1. `trunc(3/2) = 1` puts the middle
     port on NORTH, while `ceil` puts it on WEST (`PortSideAssigner.java:150-195`).
   - Expect the dump's `ports` order of `a` to differ. If it does not, try loop sizes that make loop 5 the only
     odd-count corner loop, and journal the attempt.
2. **M2** `sites/BreakingPointInserter/improveCutsTie`. Use
   `gChain(lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL"), 8, <5 × "n0>n3">, <4 × "n4>n7">)` with
   `cuts(2, 6)`, the default penalty and default `improveCuts`, and stop `BREAKING_POINT_INSERTER`. Copy the shape of
   `breakingSites()` (`:141-167`).
   - The issue's recipe (one skip edge per span) does not discriminate, because the tie at idx 4 never beats idx 2/6.
   - Scoping's TS run: base cuts [1,4], layer sizes [1,6,6,1,…]; mutant cuts [4,7], layer sizes […,5,5,1]. Re-check
     this in your scratch copy.
3. **D7** `sites/PortRestorer/freeDistribution/{NORTH-REVERSE_STACKED, NORTH_SOUTH-REVERSE_STACKED, EQUALLY-SEQUENCED,
   EQUALLY-REVERSE_STACKED}`. Each is a FREE node, all ports hidden, with `SELF_DIST` and `SELF_ORDER` set on the node.
   The node has two-port loops: 2, 3, 9 and 9 loops respectively. In the EQUALLY rows, loops 1 and 9 both target
   NORTH. Stop `SELF_LOOP_PORT_RESTORER`, `manager` false. Check that each dump shows at least two one-sided loops on
   one side. Otherwise the ordering is not exercised: adjust the loop count and journal it.
4. Hand back: the snippets, the ids, the pre-screen diffs (the M1/M2 dump fields that differ), and a size estimate per
   row (measure the TS dump's compact JSON as a proxy).

## Write-set

None in the repository. Scratch: `$TMPDIR/layered-loops-evidence/T1/`.

## Read-set

`tools/vectors/LayeredLoopsVectors/LayeredLoopsVectorsSites.java:1-100, :141-240`; the builders the sites rows call
(`flat`, `plain`, `eds`, `pj`, `ropts` in `LayeredLoopsVectorsBuilders.java`; `withOpts` at `LayeredLoopsVectorsSites.java:87`; `sd` at
`LayeredLoopsVectorsScenarios.java:119`; `cuts` at `LayeredLoopsVectorsSites.java:102`); `src/alg/layered/intermediate/loops/ordering/PortSideAssigner.ts`;
`src/alg/layered/intermediate/loops/ordering/PortRestorer.ts`; `src/alg/layered/intermediate/wrapping/BreakingPointInserter.ts:260-310`;
`test/helpers/layered-loops-replay-ops.ts:120-140`.

## Acceptance criteria

- Given the M1 candidate, when it is run in base and in M1 scratch copies, then the dumps differ in `ports` of `a`.
- Given the M2 candidate, when it is run in base and in M2 copies, then the cut indices and the layer sizes differ.
- Given each D7 candidate, when its base dump is read, then two one-sided loops share one side.

## Observability

N/A: scratch search, no runtime code.

## Rollback

Nothing to roll back (no repository write).
