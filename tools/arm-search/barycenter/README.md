<!-- SPDX-License-Identifier: EPL-2.0 -->

# Barycenter and Forster arms (issue #59, arms 18-25)

The eight arms of phase 3's barycenter machinery that mission 7h left unreached (`tools/arm-search/arms.json`, group
`barycenter`). One is reached through layout by the graph of `candidates.json`; the other seven are dead in the Java
(outcome 3). `J` is `plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered` at the pinned commit.

| #     | Arm                                                                  | Java                                         | Outcome                                                       |
| ----- | -------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| 18    | `AbstractBarycenterPortDistributor.ts:272 if[1]`                     | `AbstractBarycenterPortDistributor.java:270` | 3                                                             |
| 19    | `ModelOrderBarycenterHeuristic.ts:77 if[0]`                          | `ModelOrderBarycenterHeuristic.java:76`      | 3                                                             |
| 20-23 | `ModelOrderBarycenterHeuristic.ts:179`, `:184`, `:189`, `:194 if[0]` | `ModelOrderBarycenterHeuristic.java:152-167` | 3                                                             |
| 24    | `ForsterConstraintResolver.ts:323 if[0]`                             | `ForsterConstraintResolver.java:261`         | 1, `scenarios/ForsterConstraintResolver/equalFloatBarycenter` |
| 25    | `ForsterConstraintResolverConstraintGroup.ts:115 if[0]`              | `ForsterConstraintResolver.java:427`         | 3                                                             |

## Files

- `generate.ts`: builds the arm-24 graph. Nothing is random; its header derives the graph from the guard.
- `candidates.json`: the generator's output, in the format of `tools/arm-search/screen.spec.ts` (kind `order`: a
  `scenarios` step row of `tools/vectors/LayeredOrderVectors.java`; its steps are those of the scenarios rows).
- `instrument/forster.patch`: one logging line in each Forster arm (`ARM24`, `ARM25`), for a scratch copy of
  `ForsterConstraintResolver.java` only. It is not an oracle patch.

## Reproduce

```sh
scratch="$TMPDIR/layered-arm-search/barycenter"
npx tsx tools/arm-search/barycenter/generate.ts             # rewrites candidates.json, byte for byte

# the port: the candidate takes arm 24 once
tools/arm-search/screen.sh --each tools/arm-search/barycenter/candidates.json

# the oracle: a scratch copy of the order recorder with the row appended after siteScenarios() in scenarioSpecs:
#   sc("ForsterConstraintResolver/equalFloatBarycenter", "<the candidate's elk as one JSON string>")
#       .base().procs(SIC, LES, PSP, PLS, SBI).p3("LAYER_SWEEP").done();
tools/arm-search/instrument.sh apply "$scratch/src" tools/arm-search/barycenter/instrument/forster.patch
tools/arm-search/instrument.sh build "$scratch/src" "$scratch/classes"
ORDER_FILTER=ForsterConstraintResolver/equalFloatBarycenter tools/arm-search/instrument.sh run "$scratch/classes" \
  "$scratch/LayeredOrderVectors.java" "$scratch/out" tools/vectors   # prints "ARM24 ForsterConstraintResolver.java:261 ..."
```

## Arm 24: how the graph reaches it

`considerModelOrder.strategy` makes the first run sweep forward from the model order with `preOrdered` set, so a node
without a barycenter gets the mean of its neighbours' values in that order (`BarycenterHeuristic.java:131-160`). In
layer `[p, x, g]` only `x` has no incoming edge: its value is `(p + g) / 2`. The semi-interactive chain `p -> g -> x`
is violated by `p -> g`; the merged group's barycenter is the same mean (`ForsterConstraintResolver.java:445-448`), it
is inserted after `x` (`:323`), and its constraint to `x` then has an equal float barycenter and the higher index.

## Proofs (outcome 3)

**Arm 18.** `inLayerPorts` is filled only at `AbstractBarycenterPortDistributor.java:206` and `:216`, in the branch of
ports that are neither `NORTH` nor `SOUTH` (`:189`, `:192`). The ports iterated are `node.getPorts(side)` with `side`
`WEST` or `EAST` (`:89`, `:101`, `:155`) and the `SOUTH` and `NORTH` ports (`:156-157`); `LNode.getPorts(PortSide)`
filters by side (`graph/LNode.java:261-273`, `graph/LPort.java:52-56`). The list is cleared before each collection
(`:171`) and read right after it (`:175`), so every port at `:260` is `EAST` or `WEST`. This holds for every graph
state, constructed or not; the port is identical (`AbstractBarycenterPortDistributor.ts:131-133`, `LNode.ts:192-199`).

**Arms 19-23.** The comparator of `ModelOrderBarycenterHeuristic` (`:65-105`) is used only by the insertion sort
(`:129`): the `Collections.sort` arm (`:132`) needs the force flag off, but the class is built only with it on
(`GraphInfoHolder.java:106-111`), and `BarycenterHeuristic.java:94` never runs on this class (`:113` overrides that
method without `super`). The maps are private, written only at `:151-166` and `:210-222`, and replaced by empty maps at
construction and after every sort (`:251`, `:257-260`). Every entry means "x sorts before y": `biggerThan[x]` holds y
and `smallerThan[y]` holds x, recorded with the sign the comparator returns (`:95-100`, `:184-195`) and closed
transitively (`:212-223`). The sort compares the prefix element `layer[j-1]` with the pivot (`:245`), and never
changes the relative order of the prefix. A pivot starts each pass with no entry; while it moves, every update is
`update(pivot, p_k)`, which adds only "pivot before ..." entries (its `smallerThan` set stays empty), and no entry
between two prefix elements. So at each comparison no entry relates `layer[j-1]` and the pivot: "before" would need the
stopping comparison, "after" would need `p_k` before `layer[j-1]` for some passed `p_k`, against the prefix order. All
four tests at `:152-167` fail and `:76` is never taken. The argument uses no sort library, hash order or float value;
the port's sort is the same hand-written loop with the same argument order
(`ModelOrderBarycenterHeuristicInsertionSort.ts:35-44`).

**Arm 25.** For a live group X, `X.incomingConstraintsCount` equals the number of occurrences of X in the outgoing
lists of live groups (built at `ForsterConstraintResolver.java:197-198`, `:212-213`; kept by the merge, `:422-440` with
the decrement at `:431`, and by `:332-340`). The two groups a merge removes were both processed in that round (the
predecessor added itself to the group's incoming list, the group was activated), so their incoming lists already had
the size of their counts; those lists are never reset again (`:241` resets list members only) and only grow, so a
removed group is never activated again. Hence a live group is processed at most once per round, and only after all its
live predecessors. The merge `(P, G)` (`:263`, `:267`) has `P` in `G`'s incoming list, so `P` was processed before
`G`; `G -> P` (`candidate == nodeGroup1`, `:427`) would make `G` a predecessor of `P`, processed before it: `G` would
be processed twice. The merge constructor is called only at `:308`. The argument holds for any constraint lists inside
one layer (duplicates and cycles included), the port's translation alike (`ForsterConstraintResolver.ts:253-280`,
`ForsterConstraintResolverConstraintGroup.ts:106-129`). Every writer of `IN_LAYER_SUCCESSOR_CONSTRAINTS` links nodes of
one layer (`SemiInteractiveCrossMinProcessor.java:73`, `NorthSouthPortPreprocessor.java:237`, `:284`,
`HierarchicalPortConstraintProcessor.java:181`). A constructed constraint between two layers breaks the count
invariant but stops the oracle with a `NullPointerException` at `:260` (the other layer's node has no barycenter yet).
