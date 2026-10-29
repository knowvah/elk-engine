<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — layered-cycles-layers, mission 7b (locked 2026-10-28)

The user approved B1–B10 and the scope calls SC1–SC4 during planning, as recommended. They amend, and never rewrite,
AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`), the standing rules (`plans/core-metadata/decisions.md`),
M-rows, R-rows, AC1–AC6/P1–P7 (`plans/alg-common/decisions.md`), NS/Q/U rows, D1–D7/E1–E3
(`plans/ad13-rederivation/decisions.md`) and L1–L7/S1–S4/X1–X7 (`plans/layered-framework/decisions.md`).

## Scope (Phase 2)

| ID  | Decision |
| --- | -------- |
| SC1 | **Complete intermediate set.** 7b ports the five processors the phases declare and the five `GraphConfigurator` adds between P1 and P3 (`NodePromotion`, `HighDegreeNodeLayeringProcessor`, `Partition{Pre,Mid,Post}processor`), 7,138 Java lines in all |
| SC2 | **Coordinate tests go to 7f** (S1 list grows): `ModelOrderLayerAssignmentTest` (7 cases), `PartitionTest`, `Issue871Test`. Their hand-built graphs are recorded as 7b `scenarios/*` rows so the layer assignment they encode is proven now |
| SC3 | **`TestGraphCreator` moves to 7c** (amends L6): `BasicCycleBreakerTest` extends it but calls none of its builders; its consumers are the p3order tests |
| SC4 | **`GraphConfigurator` and `ElkLayered` stay in 7f** (L2 unchanged). The replay mirrors the property normalisation and runs the recorded processor prefix by name (B4); 7f re-replays every 7b row through the real pipeline |

## Architecture (Phase 3)

| ID  | Decision |
| --- | -------- |
| B1  | **Recording.** `models/*` rows are recorded through the real pipeline: `ElkLayered.prepareLayoutTest(lgraph)` then `runLayoutTestUntil(<phase class>, true, state)` (`ElkLayered.java:407-492`); the row stores the ordered names of every processor that ran (`getLayoutTestConfiguration`, `:525`) as its `prefix`. `scenarios/*` and `sites/*` rows are step rows (`importGraph`, `normalise`, `setProperty`, `layers`, `runProcessor`, `runPhase`, `dump`) run by one Java interpreter and replayed by its TS twin |
| B2  | **Row expected.** `layers` (ordered node paths per layer), `layerless`, `hidden` (`InternalProperties.HIDDEN_NODES`), `edges` (`{ path, src, tgt, reversed }` for every edge, created ones as `new/e<k>`, created ports `new/p<k>`, in creation order), `changed` (per element path, the properties whose C4 value differs from the post-import dump, removed ones as `null`; `processors`, `random`, `spacings` ignored). Step rows with fewer than 10 nodes also store the full 7a `dumpLGraph`. The file stays under 5 MB |
| B3  | **Components.** Every row sets `SEPARATE_CONNECTED_COMPONENTS=false` on the root (`ComponentsProcessor.split` is 7h), a journaled deviation from the Java tests' default; 7f re-runs the rows under the default |
| B4  | **Prefix replay.** `test/helpers/layered-phase-replay-normalise.ts` mirrors `GraphConfigurator.configureGraphProperties` and `copyPortContraints` (`GraphConfigurator.java:96-165`, cited line by line): edge-spacing clamp (2.0), `DIRECTION` via `LGraphUtil.getDirection`, `InternalProperties.RANDOM = new Random(seed)`, favor-straightness default, original port constraints, `Spacings`. The replay then runs the `prefix` entries: `<MEMBER>` through `IntermediateProcessorStrategy.<MEMBER>.create()`, `P1_CYCLE_BREAKING/<STRATEGY>` and `P2_LAYERING/<STRATEGY>` through the phase factories. The recorder **refuses** a row whose prefix names anything outside the 7b set. A seed of 0 is a stop |
| B5  | **Inputs.** `models/*`: the 9 vendored ptolemy models, every hierarchy level its own `target` (an ELK id, imported as 7a's `importGraph(targetId)`); 12 `.elkt` vendored from elk-models at the pinned commit with manifest rows (`tests/layered/layer_constraints` 6, `tests/layered/partitioning` 4, `tickets/layered/600_outgoingEdgeInLastSeparateNode.elkt`, `656_brokenLayoutPartitions.elkt`); hand-built graphs of `ModelOrderLayerAssignmentTest`, `PartitionTest`, `Issue871Test` inline. `input` is `{ path, sha256 }` when the prepared graph is the vendored file plus root `options`, otherwise the prepared ELK JSON inline (`elk`, the interactive rows with their seeded positions). The Java runner's `DefaultConfiguration` sizing is not reproduced |
| B6  | **Sweep.** `tools/oracle/phase-sweep.sh` runs `LayeredPhaseVectors.java --sweep` over `$ELK_MODELS_DIR` and writes one canonical-dump SHA-256 per `(model, target, strategy)` to `test/corpus/.phase-sweep/results.jsonl` (gitignored, stamped like `json-sweep.sh`); `test/corpus/phase-sweep.test.ts` replays each case and compares hashes, skipping with a message when the dir is absent (AD-5). `--dump <case>` writes one full row for diagnosis. Phase dumps contain no computed doubles, so hashing is sound |
| B7  | **Coverage.** L4 under X5 applies: replay-alone coverage per 7b class after T8; every unreached branch gets a `sites/*` row and an anchored test (T11, T12). The recorder is one single-file launcher (`LayeredPhaseVectors.java`) whose dump/C4 core is copied from `LayeredSiteVectors.java` with the origin cited (JDK 21's source launcher takes one file); `javac` multi-file launch is a tooling follow-up |
| B8  | **Recursion (AC6).** Ten methods recurse to input-dependent depth: `DepthFirstCycleBreaker.dfs` (`:133`), `DFSNodeOrderCycleBreaker.dfs` (`:146`), `InteractiveCycleBreaker.findCycles` (`:107`), `CoffmanGrahamLayerer.dfs` (`:279`), `LongestPathLayerer.visit` (`:99`), `LongestPathSourceLayerer.visit` (`:102`), `NetworkSimplexLayerer.connectedComponentsDFS` (`:153`), `NodePromotion.promoteNode` (`:629`), `HighDegreeNodeLayeringProcessor.degree` (`:268`), `LayerConstraintPreprocessor.hide` (`:104`). Each becomes an explicit-stack loop reproducing the Java visit, side-effect and accumulation order, proven in its test file against a verbatim recursive twin on the oracle rows plus a deep-path case run under `--jitless` |
| B9  | **Enum arms.** L1's first clause extends to `IntermediateProcessorStrategy.create()`: an arm whose class is not ported throws `UnsupportedOperationException('<Class> is ported in mission <7x>')` with no import, per the table below. T2 writes every arm throwing; T8 wires the ten 7b arms |
| B10 | **Branch and landing.** Mission `layered-cycles-layers`, branch `feature/layered-cycles-layers`, unsigned per-task commits, stop-14 regroup into at most 5 commits (README), backup branch; the user signs by rebase and merges with a merge commit |

### B9 member table

| Mission | Members |
| ------- | ------- |
| 7b | `EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER`, `LAYER_CONSTRAINT_PREPROCESSOR`, `LAYER_CONSTRAINT_POSTPROCESSOR`, `REVERSED_EDGE_RESTORER`, `INTERACTIVE_EXTERNAL_PORT_POSITIONER`, `NODE_PROMOTION`, `HIGH_DEGREE_NODE_LAYER_PROCESSOR`, `PARTITION_PREPROCESSOR`, `PARTITION_MIDPROCESSOR`, `PARTITION_POSTPROCESSOR` |
| 7c | `ONE_SIDED_GREEDY_SWITCH`, `TWO_SIDED_GREEDY_SWITCH` (`p3order.LayerSweepCrossingMinimizer`) |
| 7f | every other `intermediate` root class and `unzipping.AlternatingLayerUnzipper`: `DIRECTION_PREPROCESSOR`/`_POSTPROCESSOR` (`GraphTransformer`), `COMMENT_*`, `PORT_SIDE_PROCESSOR`, `LABEL_DUMMY_*`, `LONG_EDGE_*`, `HIERARCHICAL_*`, `LABEL_AND_NODE_SIZE_PROCESSOR`, `INNERMOST_NODE_MARGIN_CALCULATOR`, `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR`, `CONSTRAINTS_POSTPROCESSOR`, `SORT_BY_INPUT_ORDER_OF_MODEL`, `SEMI_INTERACTIVE_CROSSMIN_PROCESSOR`, `INVERTED_PORT_PROCESSOR`, `PORT_LIST_SORTER`, `IN_LAYER_CONSTRAINT_PROCESSOR`, `NORTH_SOUTH_PORT_*`, `HYPEREDGE_DUMMY_MERGER`, `HYPERNODE_PROCESSOR`, `NODE_PLACEMENT_REPEATER`, `END_LABEL_*`, `LABEL_SIDE_SELECTOR`, `CENTER_LABEL_MANAGEMENT_PROCESSOR`, `END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR`, `FINAL_SPLINE_BENDPOINTS_CALCULATOR`, `ALTERNATING_LAYER_UNZIPPER` |
| 7g | `SELF_LOOP_PREPROCESSOR`, `SELF_LOOP_PORT_RESTORER`, `SELF_LOOP_ROUTER`, `SELF_LOOP_POSTPROCESSOR` (their model is the staged `loops` package), `BREAKING_POINT_INSERTER`/`_PROCESSOR`/`_REMOVER`, `SINGLE_EDGE_GRAPH_WRAPPER` (`wrapping`), `HORIZONTAL_COMPACTOR` (`compaction`) |

## Baseline

Recorded at planning (Phase 8) on `main` at `6d7fa4f`: typecheck and format clean; `npm test` 22,907 passed + 70 skipped in
65.1 s wall, measured alone at 1-minute load 11 → 17 (journal row). Stop 11 compares a later run at similar load.

## Execution decisions (user, during the run; append-only)

| ID  | Date | Decision |
| --- | ---- | -------- |
| E1  | 2026-10-29 | **Strategy-enum import cycle (stop 1).** Wiring the `CycleBreakingStrategy`/`LayeringStrategy` arms (T6, T7) closes the ESM cycle enum → phase class → `LayeredOptions` → `LayeredLayoutProvider` → `ElkGraphTransformer` → `ElkGraphImporter*` → enum, which the Java also has. Approved, three parts: (1) `tools/melk/config.ts` `NON_LEAF_DEFAULT_TYPES` += both enums and regenerate (the 7a X3 lazy-default mechanism; S4 byte-identity for the other bundles holds); (2) `ElkGraphImporterModelOrder.ts` evaluates the six strategy comparisons inside `needsModelOrderBasedOnParent` as `ElkGraphImporter.java:484-489` does instead of in a module-level array; (3) a test of an abstract phase base class enters through the enum. The `tools/melk/**` and `src/alg/layered/graph/transform/**` edits are a one-time widening of the T6 write-set; no `TEMP` entry-order import remains |
| E2  | 2026-10-29 | **Boxed `Integer` reference comparisons: value equality everywhere.** `SCCNodeTypeCycleBreaker.java:80,88`, `NodePromotion.java:541` and `CoffmanGrahamLayerer.java:244` compare boxed `Integer`s with `==`/`!=`; the port compares values at all three sites (T7's `Integer.valueOf`-cache emulation at `:244` removed). The Java result depends on boxing identity, which the oracle cannot reach (no row has ids or layers beyond 127); T13 lists the three sites as one known divergence in `docs/conformance.md` |
| E2a | 2026-10-29 | **E2 amended on evidence (executor; pending the user's confirmation).** T8's replay showed E2's premise false: in `NodePromotion.java:541` the left-to-right cascade promotes nodes to layer ids in the thousands on eight committed `models/*` rows, and the Java terminates only because the boxed `Integer` keys above 127 are distinct objects; value equality never terminates. At all three sites the compared boxes are provably fresh `Integer.valueOf` results (the multimap stores the key object `put` receives; `inTopo.put` boxes an `int` per call; the group ids are parsed option values), so `==` holds exactly when the values are equal and inside the `valueOf` cache. The port compares them through `JavaInteger.sameValueOfBox` (`-128..127`, the Javadoc guarantee and the JDK default `IntegerCache.high`, which the oracle runs with). T13 documents the emulation and its assumption instead of a known divergence |
