<!-- SPDX-License-Identifier: EPL-2.0 -->

# Model-order comparator arms (issue #59, arms 7-17)

The eleven arms of the model-order comparators that mission 7h left unreached (`tools/arm-search/arms.json`, group
`model-order`). Ten are reached by the five order rows of `candidates.json`; arm 12 is dead.

| Candidate                                                 | Arms                      | Outcome               |
| --------------------------------------------------------- | ------------------------- | --------------------- |
| `scenarios/ModelOrderPortComparator/noModelOrderPorts`    | 15                        | 1 (through layout)    |
| `sites/ModelOrderNodeComparator/sourceThenTargetFeedback` | 8, 9                      | 2 (constructed state) |
| `sites/ModelOrderNodeComparator/targetFeedbackPair`       | 7, 10, 11, 13, 14         | 2 (constructed state) |
| `sites/ModelOrderPortComparator/westLongEdgeSources`      | 16                        | 2 (constructed state) |
| `sites/ModelOrderPortComparator/edgesWithoutModelOrder`   | 17                        | 2 (constructed state) |
| none                                                      | 12 (`:178 if[1]`, `:456`) | 3 (proof below)       |

`ModelOrderNodeComparatorHelperDummies.ts:172`, `:175` and `:178` are the Java tests `:450` (source, target), `:453`
(target, source) and `:456` (target, target); `:170` is `:440` (source, source), which is not one of the arms. The
planning table of `arms.md` names `:440` for arms 8-9; the arms themselves (file, line, v8 arm) are those of
`arms.json`. In the v8 report `binary-expr[0]` counts the evaluations of the condition and `binary-expr[1]` those of its
right operand.

## Files

- `generate.ts`: builds the five graphs and their steps. Nothing is random; its header derives each graph from the
  guard of its arm, with the Java lines.
- `candidates.json`: the generator's output, in the format of `tools/arm-search/screen.spec.ts` (kind `order`: a step
  row of `tools/vectors/LayeredOrderVectors.java`).
- `order-recorder-candidates.patch`: for a scratch copy of `tools/vectors/LayeredOrderVectors.java` only: appends the
  order candidates of the JSON file named by `MO_CANDIDATES` to `SCENARIOS`, so that a filtered scratch run records
  them as rows. The recorder in the repository is not changed.
- `instrument/model-order-comparators.patch`: logging lines for scratch copies of `ModelOrderNodeComparator.java` and
  `ModelOrderPortComparator.java`: one `ARM<n>` line in each arm, and `MOARM` lines with the inputs of the guards (the
  feedback flags, reference nodes and `beforePorts` at `:429` and `:434`, the sources at `PC:183`). It is not an oracle
  patch; `instrument.sh apply` applies it to a scratch copy only.

## Reproduce

```sh
scratch="$TMPDIR/layered-arm-search/model-order"
npx tsx tools/arm-search/model-order/generate.ts            # rewrites candidates.json, byte for byte

# the port: every candidate takes its arms
tools/arm-search/screen.sh --each tools/arm-search/model-order/candidates.json

# the oracle: a scratch copy of the order recorder that reads the candidates, and the instrumented classes
cp tools/vectors/LayeredOrderVectors.java "$scratch/"
(cd "$scratch" && patch -p1 <"$OLDPWD/tools/arm-search/model-order/order-recorder-candidates.patch")
tools/arm-search/instrument.sh apply "$scratch/src" tools/arm-search/model-order/instrument/model-order-comparators.patch
tools/arm-search/instrument.sh build "$scratch/src" "$scratch/classes"
MO_CANDIDATES="$PWD/tools/arm-search/model-order/candidates.json" ORDER_FILTER=<candidate id> \
  tools/arm-search/instrument.sh run "$scratch/classes" "$scratch/LayeredOrderVectors.java" \
  "$scratch/out" tools/vectors 2>"$scratch/run.err"
grep '^ARM' "$scratch/run.err"
```

Each `ARM` line appears twice: the recorder runs every row twice. The recorded rows replay in the port through
`runSteps` and the comparators of `LayeredOrderVectors.test.ts`.

## Arm 12 is dead

`:178 if[1]` is the Java `:456` test failing: `orderBeforePorts` (`NC:434-459`) is reached with two dummies that share
the reference node (`NC:429`) and whose flags are none of (s, s), (s, t), (t, s), (t, t). Then one of them, `n`, is
neither a source nor a target dummy, so its reference node is `n` itself (`NC:405-416`; the flags are set at `:407-416`).

1. The only `LONG_EDGE` nodes before `SORT_BY_INPUT_ORDER_OF_MODEL` are those of `LongEdgeSplitter.java:113-171` and
   `InvertedPortProcessor.java:182-205`, `:252-276` (`DummySelfLoopProcessor` is in no plan; `CuttingUtils` and
   `AlternatingLayerUnzipper` run after P3). Each gets two ports with one edge each. Later processors only move edge
   ends between ports of other nodes (`edge.setTarget` on the edge into a normal node's port), and the `reverseEdge`
   step swaps the two ends of one edge. So a dummy has exactly two incident edges.
2. If a dummy lacks an incoming or an outgoing edge, `getFirstIncomingSourcePortOfNode` or
   `getFirstOutgoingTargetPortOfNode` (`NC:492-525`) dereferences `null` before the flags exist. So each dummy that
   reaches `NC:405` has one incoming and one outgoing edge, and these are its first ones.
3. The other dummy `m` has `n` as its reference node: `m`'s first incoming edge comes from `n`, or its first outgoing
   edge goes to `n`, with equal layer ids. That edge is `n`'s only outgoing (or only incoming) edge, so `n`'s first
   target (or source) is `m`, in a layer with `n`'s id: `n` is a target (or source) dummy. Contradiction.
4. `n` and `m` are the same node only in `compare(D, D)`. The insertion sorts (`SBIM:158-171`) compare two positions,
   and `handleLongEdgeAndNormal` / `handleNormalAndLongEdge` pass a normal node; the one other call is
   `compare(n1ReferenceNode, n2ReferenceNode)` at `NC:479` after a shared reference `D`, which by 3 is not neither.

The argument uses neither sort order, hash order nor float values. The port has the same structure
(`LongEdgeSplitter.ts`, `InvertedPortProcessor.ts`, `feedbackNodeOf` and `orderBeforePorts` in
`ModelOrderNodeComparatorHelperDummies.ts`), so the arm is dead on both sides.

## Why a real layout does not reach arms 7-11, 13, 14, 16 and 17

- **Arms 8, 9 (s, t).** In the first sort of `SORT_BY_INPUT_ORDER_OF_MODEL` (`SBIM:70-74`, the only `beforePorts`
  comparator), the first argument is always an element that stood before the pivot in the layer.
  `InvertedPortProcessor` appends the east dummies of a node before its west dummies (`:122-145`), and the target dummy
  of a node `x` is always an east dummy of `x` (a long-edge splitter dummy never shares a layer with its source or its
  target). So a source dummy of `x` never comes before a target dummy of `x`. The recursive call at `NC:479` compares
  reference nodes, which for inverted-port dummies are normal nodes.
- **Arms 7, 10, 11, 13, 14 (t, t).** `handleHelperDummyNodes` is called only if one of the two dummies is not connected
  to the previous layer (`NC:220`, `:247`; both connected is decided at `:168-216`). After `LONG_EDGE_SPLITTER` every edge links adjacent layers or one
  layer, so an east dummy's source is in the previous layer, whose id `SBIM:66` has set: every target dummy is
  connected. Layer 0 has no east dummy.
- **Arm 16.** The long-edge block (`PC:171-198`) needs `LONG_EDGE` sources in a layer with the node's id. At the sort,
  layers before the current one carry their index and later layers are reached only by edges against the layering.
  Same-layer `LONG_EDGE` nodes are inverted-port dummies, which feed an `EAST` port (east dummies) or the next layer
  (west dummies): no node gets two non-`EAST` ports fed that way.
- **Arm 17.** An edge without `MODEL_ORDER` in a graph that sorts by model order is an inside self loop taken from the
  parent's edges by a flat import (`ElkGraphImporter.java:287-299`), or a partition dummy edge, whose ports
  `PartitionPostprocessor` removes before the sort. An inside self loop links two external port dummies (one port each)
  and its split dummies (one `WEST` and one `EAST` port), so no node has two same-side ports with such an edge.

The scratch logs back this: with the patch applied, the full order recorder (every committed row, its output
byte-identical to the committed ref) logs only (t, s) and (s, s) at `NC:434` and only `EAST`/`EAST` at `PC:183`, and
the full compound recorder (540 rows) and the compound corpus sweep (1,169 cases) log no comparator call at all.

## Notes

- Rows with a `layers` step have ten imported nodes (isolated fillers). Below ten the recorder also stores the full
  dump, whose layerless nodes hold `TARGET_NODE_MODEL_ORDER` as `{class: HashMap}` in Java and `{class: Map}` in the
  port; `compareOrderFullDump` does not map the two names as `compareOrder` does for `changed`.
- An edge against the layering through three or more layers makes `LongEdgeSplitter` split it into the last layer, where
  the Java assertion `LongEdgeSplitter.java:90` fails. The JVM runs without `-ea`, the port's tests with dev assertions;
  `westLongEdgeSources` therefore uses two layers, where the splitter returns at once (`:66-69`).
- The graph of `sourceThenTargetFeedback` has an `EAST` output on `x`: a side-fixed node whose ports are all inverted
  has its edges reversed by `EdgeAndLayerConstraintEdgeReverser` (`:172-215`), which removes the inverted ports.
