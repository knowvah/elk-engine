<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: barycenter and Forster (arms 18-25)

## Context

These are 8 arms in P3's barycenter machinery:

- the side test of the in-layer ports (`AbstractBarycenterPortDistributor.ts:272 if[1]`);
- the five transitive-order returns of `ModelOrderBarycenterHeuristic` (`:77`, `:179`, `:184`, `:189`, `:194`);
- two arms of the Forster constraint resolver (equal float barycenters, and merging two groups that both have
  outgoing constraints).

Guards and leads, including a proof sketch for arms 19-23 to verify: [arms.md](../arms.md) § Barycenter and Forster.

## Method (D4: proof first, then construct)

1. **Arms 19-23.** Check the sketch line by line against `ModelOrderBarycenterHeuristic.java:60-260`,
   `GraphInfoHolder.java:100-111` and `BarycenterHeuristic.java:80-140`.
   - Find every caller of `barycenterStateComparator`, every writer of `biggerThan`/`smallerThan`, and every
     `clearTransitiveOrdering` call.
   - Check the state of the maps at the first sort, and whether `ForsterConstraintResolver` or the port distributor
     can call the comparator between a clear and a sort.
   - If the sketch holds, write the proof (outcome 3). Note whether it depends on the sort being the hand-written
     insertion sort and not the JVM sort (stop 8: the port uses `ModelOrderBarycenterHeuristicInsertionSort.ts`).
   - If it fails, the failing step names the input to build.
2. **Arm 18.** Prove or refute "every port reaching P3 has a defined side" for every assembled plan:
   - `PortSideProcessor`, `ElkGraphImporter.ensureDefinedPortSide`, and the processors that create ports before P3;
   - the in-layer edges that put a port into `inLayerPorts`.
   If the claim holds, a real layout cannot reach the arm. A constructed `UNDEFINED` side throws in
   `BinaryIndexedTree` (7c), so no row can record it. Report outcome 3 for layouts, with the throw noted.
3. **Arm 24.** Find the writers of `IN_LAYER_SUCCESSOR_CONSTRAINTS`, then build two constraint-linked nodes with equal
   float barycenters where the predecessor's index is higher. Equal barycenters can come from both nodes being
   connected only to the same fixed-layer node. Confirm with an instrumented copy of
   `ForsterConstraintResolver.java:260`.
4. **Arm 25.** Find out why a merge inside a chain a → b → c never happened in 7c's 720 variants: read the merge order
   of `ForsterConstraintResolver.java:233-300`. Construct the chain, or prove that the merge order excludes it.
5. Screen in TS, then confirm on the oracle, as in T3.

## Deliverable (report to the orchestrator)

For each of arms 18-25:

- the outcome (D3);
- the row input and steps, or the proof;
- for outcome 4, the closest approach;
- the instrumented log lines.

Commit-ready files go in `tools/arm-search/barycenter/`.

## Write-set

`tools/arm-search/barycenter/**`, `$TMPDIR/layered-arm-search/barycenter/`.

## Read-set

`J/p3order/{ModelOrderBarycenterHeuristic,BarycenterHeuristic,AbstractBarycenterPortDistributor,ForsterConstraintResolver,GraphInfoHolder,LayerSweepCrossingMinimizer}.java`;
`J/intermediate/PortSideProcessor.java`; the TS twins under `src/alg/layered/p3order/` (read only);
`tools/vectors/LayeredOrderVectors.java:60-140`; `plans/layered-crossing-min/unreached.md`.

## Acceptance criteria

- Given each of arms 18-25, when the task ends, then the report gives exactly one outcome with its evidence.
- Given an outcome-3 claim, then every step cites a Java line, and the claim says whether it relies on JVM order or
  float rounding (stop 8).
- Given a claimed reached arm, when the orchestrator replays the input on the oracle and in TS, then the arm is taken on
  both sides.

## Observability

N/A.

## Rollback

Reversible: new tool files only.
