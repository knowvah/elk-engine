<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — layered-node-placement (mission 7d, 2026-11-02)

## Observation: a port holding two or more edges puts `HYPEREDGE_DUMMY_MERGER` (7e) in the plan

- **Context**: T1 recording P4 rows on the vendored models.
- **Finding**: most ptolemy levels and two of the three smallest flattened ptolemy models (`randomwalk`,
  `thalesdynamicmodalmodelpn`) carry a hyperedge port, so their P4 and later rows are accepted refusals; the before-P4
  processor stops of those levels are still recorded. Scenario graphs use one edge per port.
- **Impact**: ptolemy P4 rows arrive only after 7e; the N10 sweep is the breadth proof until then.
- **Confidence**: High

## Observation: the plan after P3 is greedy switch, then the three before-P4 processors, in a fixed order

- **Context**: T1 cross-checking scenario chains against pipeline rows (`PLACEMENT_CROSSCHECK=1`).
- **Finding**: every small-graph plan runs `EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER` (before P1),
  `LAYER_CONSTRAINT_PREPROCESSOR`/`LAYER_CONSTRAINT_POSTPROCESSOR` (around P2, `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR`
  right after the postprocessor on external-port graphs), then after P3 `TWO_SIDED_GREEDY_SWITCH` (the default type,
  under the node threshold), `IN_LAYER_CONSTRAINT_PROCESSOR`, `LABEL_AND_NODE_SIZE_PROCESSOR`,
  `INNERMOST_NODE_MARGIN_CALCULATOR`, and `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR` on external-port graphs. Omitting the
  layer-constraint processors changes the layering on external-port graphs; omitting `INVERTED_PORT_PROCESSOR` on an
  inverted-port graph throws `ArrayIndexOutOfBoundsException` in `BinaryIndexedTree.rank`.
- **Impact**: a hand-built TS chain that stops at P4 or a 7d processor must follow the plan; the scenario rows do.
- **Confidence**: High

## Observation: `NODE_PLACEMENT_REPEATER` depends on the recompute property alone

- **Context**: T1 flexibility rows (`GraphConfigurator.java:335-338`).
- **Finding**: the `anyMatch(nodeFlexibility != null)` is always true because the graph default `NONE` is not null, so
  only `hasProperty(…recomputeNodePlacement)` decides.
- **Impact**: a TS plan builder (7f `GraphConfigurator`) needs only the property check to match.
- **Confidence**: High

## Observation: the 7c row format makes `changed` about 65 % of a row

- **Context**: T1 hitting the 5 MiB cap (12.4 MB untrimmed for models alone).
- **Finding**: about 21 KB of a 32 KB row is the `changed` list; a P4 variant family costs 20–95 KB per level.
- **Impact**: the variant set shrank to one ptolemy model plus three `.elkt` (journal); a later recorder with this row
  format reaches the cap quickly, so plan the variant set against measured sizes.
- **Confidence**: High

## Observation: the replay names a label first met after import by the context's own scheme

- **Context**: T3 `placementDump` label paths.
- **Finding**: `Ctx.pathOf` names a new label `x/l<k>`, not `new/l<k>`; `new/p<k>` is applied to ports only through
  `phaseDump` registration. None of the five 7d processors creates a label.
- **Impact**: if a later row's processor creates labels, T1's and the replay's label paths must be reconciled first.
- **Confidence**: Medium

## Observation: `compareObjects` reports a node's geometry diffs in alphabetical key order

- **Context**: T3 tests indexing diff messages.
- **Finding**: `margin`, then `pos`, then `size` (sorted keys), not struct order.
- **Impact**: tests that assert on message positions use alphabetical order.
- **Confidence**: High

## Observation: `NEdge.of(origin)` discards its argument in Java as well

- **Context**: T7 porting `transformEdge` (`NetworkSimplexPlacer.java:601,610`).
- **Finding**: `NEdge.java:59-61` returns a fresh builder and ignores `origin`; the 6a port does the same. The T7 agent
  read it as a 6a defect and chained `.origin(lEdge)`; the orchestrator removed the chains (nothing reads
  `NEdge.origin` in the placer).
- **Impact**: do not "fix" `NEdge.of(origin)`; an `NEdge` created through it has a null origin in both implementations.
- **Confidence**: High

## Observation: `PortSide.SIDES_*` are `ImmutableSet`s (`.has`), `EnumSet`s are `.contains`

- **Context**: T7 compile error `Property 'contains' does not exist on type 'ImmutableSet<PortSide>'`.
- **Finding**: the Guava `ImmutableSet` shim extends the JS `Set`; the `EnumSet` shim does not.
- **Impact**: pick the method by the declared type; a mix is a runtime `TypeError`.
- **Confidence**: High

## Observation: the N6 recursive twins overflow at 5,000 depth under the default JIT too

- **Context**: T5 (`fillSegment`), T6 (`placeBlock`), T7 (`follow`) deep cases.
- **Finding**: all three verbatim recursive twins throw `RangeError` at depth 5,000 with and without `--jitless`
  (a trivial recursive function reaches 8,000 under `--jitless`, so the frame size of the generator-based list
  iterators is the limit); the loops pass. The tests tolerate the twin's `RangeError` as the 7b precedent does.
- **Impact**: the explicit loops are needed for long edges spanning thousands of layers; twin equality is proven on
  the rows and at depth 200.
- **Confidence**: High

## Observation: `placeBlock` has one recursive call site; `BKNodePlacer` has five log sites

- **Context**: T6 against the brief (N6 said two sites, N8 said four).
- **Finding**: `BKCompactor.java:208` is the only self-call; `getClasses` logs "There are no classes in a balanced
  layout." at `BKNodePlacer.java:551` besides the four named sites.
- **Impact**: counts in later briefs derived from a planning scan need a source check.
- **Confidence**: High

## Observation: Java quirks kept verbatim in the placers

- **Context**: T5–T7 ports.
- **Finding**: `LinearSegmentsNodePlacer.java:361-436` `continue` on an empty layer skips `layerIndex++`;
  `mergeRegions` (`:782`) calls `next()` unguarded on an empty layer; `ThresholdStrategy.java:313` repeats an operand
  (`su[x] || su[x]`); `NetworkSimplexPlacer.markCrossingEdges` removes the matched edge only when `hasPrevious()`,
  so a match at index 0 stays; `BasicProgressMonitor.getLogs()` is `null` with logging off.
- **Impact**: none is a bug to fix.
- **Confidence**: High

## Observation: no replayed row has a type-1 conflict, a dependency-cycle split or an original-position dummy

- **Context**: T5/T6 scanning the 602 rows.
- **Finding**: every BK row logs `Marked edges: []`; no LINEAR_SEGMENTS row reaches `splitCurrentSegment`
  (`LinearSegmentsNodePlacer.java:392-413`); no INTERACTIVE row has `ORIGINAL_DUMMY_NODE_POSITION`; the six
  `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR` rows hold at most one N/S dummy per layer.
- **Impact**: T11 site-row candidates.
- **Confidence**: High

## Observation: the Java `BasicNodePlacementTest` has 15 runs, not 14

- **Context**: T8 porting `JT/p4nodes/BasicNodePlacementTest.java:48-176`.
- **Finding**: 14 `@ConfiguratorProvider`s plus the `@DefaultConfiguration` run; the BK providers are NONE × 6
  alignments and IMPROVE_STRAIGHTNESS × 5 (no IMPROVE × NONE), so the recorded `bk-IMPROVE_STRAIGHTNESS-NONE` rows are
  outside the invariant.
- **Impact**: plan counts derived from a scan need a source check (the brief said 14 configurations / 12 variants).
- **Confidence**: High

## Observation: `IntermediateProcessorStrategy.ts` is at 499 of 500 lines

- **Context**: T8 wiring the five 7d arms.
- **Finding**: the next arm wired (7e) hits the file cap.
- **Impact**: 7e splits the enum's `create` switch into a section file first.
- **Confidence**: High

## Observation: a class test that pins row ids by selector must list the site rows once T11 lands

- **Context**: batch-5 coverage gate after the 26 site rows.
- **Finding**: six "finds the recorded rows" inventories (BK ×2, LabelAndNodeSize, Interactive, LinearSegments,
  NetworkSimplex) matched the new `sites/*` rows and failed until the ids were listed in recorded order (the
  `toEqual` is order-sensitive).
- **Impact**: T11 of a later mission plans the inventory updates with the rows.
- **Confidence**: High

## Observation: labelled N/S external-port dummies never reach `LabelAndNodeSizeProcessor` in a real plan

- **Context**: T11 S1 rows.
- **Finding**: `HierarchicalPortConstraintProcessor.java:215-217,235-246` replaces N/S external dummies by label-less
  copies at `FIXED_SIDE` or higher; under `FREE` the importer derives E/W sides (`LGraphUtil.java:818-824`); the
  greedy switch NPEs (`BetweenLayerEdgeTwoNodeCrossingsCounter.java:283`) on an un-replaced one.
- **Impact**: the NORTH/SOUTH label-box arms are reachable only on chain-forced step rows (omit the processor and the
  greedy switch).
- **Confidence**: High

## Observation: forcing a crossing in a middle gap needs the interactive minimizer

- **Context**: T11 S3, S10, S11 (dependency cycle, two-path, type-1 conflict).
- **Finding**: `LAYER_SWEEP` places a forced crossing wherever ties break; `CROSSING_MINIMIZATION_STRATEGY=INTERACTIVE`
  with explicit positions plus `layerConstraint=FIRST` on the sources (else network simplex slides them) does it; the
  interactive minimizer interpolates a dummy's y at the mean centre x of the positioned normal nodes of its layer and
  falls back to the source y in a dummy-only layer; its configuration has no `TWO_SIDED_GREEDY_SWITCH` and adds
  `PORT_LIST_SORTER` only with `NON_FREE_PORTS`.
- **Impact**: scenario chains under P3 INTERACTIVE drop both for pipeline equality.
- **Confidence**: High

## Observation: `EdgeAndLayerConstraintEdgeReverser` reverses every edge of a fully inverted node

- **Context**: T11 S4/S8 inverted-port graphs.
- **Finding**: a node whose ports are all inverted (input EAST, output WEST) has all its edges reversed, so no
  in-layer edge arises; the scenario needs a mix of normal and inverted ports.
- **Impact**: scenario design.
- **Confidence**: High

## Observation: `PORT_LABELS_PLACEMENT` silently ignores an unknown value

- **Context**: T11 S1 `fixed` row.
- **Finding**: the string `FIXED` is not a `PortLabelPlacement` constant; the importer ignores it and the default
  `OUTSIDE` applies; the empty string yields the empty (fixed) set.
- **Impact**: a "fixed" placement row passes `""`.
- **Confidence**: High

## Observation: BK infeasible layouts do not arise on flat graphs

- **Context**: T11 S14.
- **Finding**: 52,000 random flat graphs (5–28 nodes, N/S/E/W ports, labels, heights 10–200, BALANCED and NONE)
  logged about 100,000 `is feasible` checks with no `breaks on`; every layout keeps layer neighbours at least their
  spacing apart and the balanced layout takes order statistics of the same values.
- **Impact**: `checkOrderConstraint`'s overlap arms are U; the Java comment at `BKNodePlacer.java:248` agrees.
- **Confidence**: High

## Observation: anchored P4 cases assert `y` only; `placementDump` carries no `changed`

- **Context**: T12a.
- **Finding**: node `x` in P4 rows is the layer x set elsewhere; property values (S5's priorities) are read from the
  replayed graph because the placement dump has no `changed` member. `Array.prototype.toSorted` is not in the project's
  TS lib.
- **Impact**: anchored-case conventions for 7e.
- **Confidence**: High

## Observation: the oracle sweep at P4 reaches 23 % of the ptolemy levels before 7e/7g

- **Context**: T10.
- **Finding**: 8,410 cases, 1,970 ok, 5,880 `HYPEREDGE_DUMMY_MERGER` and 560 `SELF_LOOP_PREPROCESSOR` refusals; no
  ptolemy P4 case holds a flexible node, so none carries `ports`/`labels`; the oracle sweep takes 38 s and the replay
  12 s at stride 2 (23 s at stride 1).
- **Impact**: 7e and 7g re-sweep; stride 1 is affordable.
- **Confidence**: High
