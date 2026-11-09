<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — layered-crossing-min (mission 7c, 2026-10-30)

## Observation: the 7b `runPrefix` rejects `P3_NODE_ORDERING`

- **Context**: T3 building the order replay helpers against the T1 row contract.
- **Finding**: `test/helpers/layered-phase-replay-ops.ts:39` fixes the prefix phase set to P1/P2 and `runPrefixEntry`
  throws for any other phase, while the `runPhase` step passes any phase string to `createPhase`. The 7b file is
  landed and never edited.
- **Impact**: each later phase mission needs its own `run<X>Prefix` twin (7c: `layered-order-replay-ops.ts`
  `runOrderPrefix`); step rows need nothing.
- **Confidence**: High

## Observation: P3 and the greedy-switch processors are one class

- **Context**: T1 stopping a pipeline row at `ONE_SIDED_GREEDY_SWITCH`.
- **Finding**: both greedy arms and `LAYER_SWEEP`/`MEDIAN_LAYER_SWEEP` instantiate `LayerSweepCrossingMinimizer`, told
  apart only by the private `crossMinType` (`IntermediateProcessorStrategy.java:316,361`,
  `CrossingMinimizationStrategy.java:67-71`), so `runLayoutTestUntil(class)` stops at the P3 phase; the recorder walks
  the plan with `runLayoutTestStep` and names processors by instance.
- **Impact**: processor identity in the TS replay cannot be by class; the replay factories create by name.
- **Confidence**: High

## Observation: `MODEL_ORDER` is attached at import only

- **Context**: T1 scenario that set `considerModelOrder.strategy` after import.
- **Finding**: `ElkGraphImporter` attaches `MODEL_ORDER` only when the strategy is not `NONE` at import time; a
  post-import `setProperty` leaves it null and `SortByInputModelProcessor.java:125` throws a NullPointerException.
- **Impact**: model-order options belong on the ELK root before import in step rows and in any TS test.
- **Confidence**: High

## Observation: the first `Random` draw chooses the port distributor

- **Context**: T1 attributing classes to rows.
- **Finding**: `ISweepPortDistributor.java:55-62` draws once from `InternalProperties.RANDOM`; seed 1 always yields
  `LayerTotalPortDistributor`, seed 2 `NodeRelativePortDistributor`, regardless of the graph.
- **Impact**: the TS replay must keep the exact draw order; scenario rows with seeds 2 and 3 are what reach the
  node-relative distributor.
- **Confidence**: High

## Observation: hand-placed in-layer edges crash `CrossingsCounter`

- **Context**: T1 scenario with a hand-placed layering and an in-layer EAST→WEST edge on plain nodes, then `LAYER_SWEEP`.
- **Finding**: `ArrayIndexOutOfBoundsException` in `BinaryIndexedTree.rank` (`:72`) via
  `CrossingsCounter.countInLayerCrossingsOnPorts` (`:397`); valid in-layer edges come from `InvertedPortProcessor`
  (`InvertedPortProcessor.java:63-72`).
- **Impact**: scenarios and TS tests build in-layer edges through the processor, never by hand.
- **Confidence**: Medium (index not traced)

## Observation: models with centre edge labels cannot be recorded before 7f

- **Context**: T1 recording the `preserve_order/**` and `partitioning-withEdgeLabels` models.
- **Finding**: their plans run `LABEL_DUMMY_INSERTER` before P3, a 7f class, so every row is an accepted refusal
  under C2; the 15 `preserve_order` models the Java `SortByInputModelProcessorTest` names yield no rows.
- **Impact**: the ported invariant runs over label-free scenario replicas until 7f re-records these models.
- **Confidence**: High

## Observation: `LayerSweepTypeDecider` and `GraphInfoHolder` children need nested graphs

- **Context**: T1 class attribution.
- **Finding**: on flat levels `LayerSweepTypeDecider` reaches only its `rootNode()` branch; `GraphInfoHolder` child
  graphs and `sweepInHierarchicalNodes` are unreachable until 7h.
- **Impact**: those branches are U in the 7c coverage map, not sites.
- **Confidence**: High

## Observation: `hashCode()` arithmetic in ELK is 0 under the oracle flag

- **Context**: T5 porting `HyperedgeCrossingsCounter`'s `Hyperedge.compareTo` and `HyperedgeCorner.compareTo`.
- **Finding**: both end in `this.hashCode() - other.hashCode()` on identity hashes (`HyperedgeCrossingsCounter.java:82,119`).
  The oracle runs under `-XX:hashCode=2`, where every identity hash is the same constant, so the subtraction is always
  0 and the stable `Arrays.sort` keeps array order; the TS `identityHashCode` shim hands out a creation-order counter,
  which reorders ties. The port returns 0 at both sites.
- **Impact**: any later ELK site that uses an identity-hash _value_ for ordering (not just hashing) must be ported as
  the constant-hash result, not through the shim; a test pinning the shim's counter is an X7-type assumption.
- **Confidence**: High

## Observation: `IInitializable.init` increments the edge index per initializable

- **Context**: T5 porting `IInitializable.java:54`.
- **Finding**: `e++` is evaluated inside the loop over initializables, so the second initializable sees edge index 1 for
  the same edge; no implementer uses `e`. Kept verbatim and pinned by `IInitializable.test.ts`.
- **Impact**: do not "fix" it.
- **Confidence**: High

## Observation: the model-order comparators are not reflexive and read `biggerThan` for the fourth lookup

- **Context**: T5 comparator contract tests.
- **Finding**: `ModelOrderNodeComparator.compare(n, n)` returns -1 the first time and 1 afterwards (association
  recorded); the fourth cache lookup at `ModelOrderNodeComparator.java:135`/`ModelOrderPortComparator.java:128` reads
  `biggerThan.get(n2)` (copy-paste quirk). Both preserved verbatim and pinned.
- **Impact**: callers must never rely on `compare(x, x) === 0`; do not normalise the lookup.
- **Confidence**: High

## Observation: a `List<Integer>` option default needs the ElkReflect `Array` registration

- **Context**: T5 tests reaching `CM_ENFORCED_GROUP_ORDERS` on a bare `LGraph`.
- **Finding**: without `LayoutMetaDataService.initElkReflect()`, `getProperty` throws `IllegalStateException` (cannot
  clone the default); tests set the list explicitly instead.
- **Impact**: any T6/T7 test that builds a bare `LGraph` and reaches a comparator hits this.
- **Confidence**: High

## Observation: a `#[…]` melk list-literal default is stored by the TS `getProperty` but not by Java

- **Context**: T4b replaying the `SortByInputModelProcessor` rows.
- **Finding**: `MapPropertyHolder.getProperty` stores a default when it is cloneable; Java checks `instanceof Cloneable`
  (`MapPropertyHolder.java:68`) and the Xtend literal compiles to `Collections.unmodifiableList` (not `Cloneable`),
  while `ElkReflect.isCloneable` (`src/graph/util/ElkReflect.ts:92`) accepts every JS array and the melk emitter emits
  the literal as `number[]`. `cmEnforcedGroupOrders` (`Layered.melk:1187`) is the only such default in all melk sources.
- **Impact**: every row through a model-order comparator gains a `changed g0` key the oracle never records until the
  generated default is non-cloneable; the fix is in `tools/melk` + `ElkReflect`, not in the processors.
- **Confidence**: High (TS side read; Java default class from `tools/melk/expr.ts:30` and the 7a dump).

## Observation: the dump encoder names a property value by its constructor

- **Context**: T4b `SortByInputModelProcessor` rows recording `{class:"java.util.HashMap"}` for `TARGET_NODE_MODEL_ORDER`.
- **Finding**: `layered-site-replay-context.ts:353` emits `{class: constructor.name}` for an unknown value, so a TS
  `Map` can never equal the Java name; `compareChanged` does not strip packages.
- **Impact**: the 7c `compareOrder` maps `Map` → `java.util.HashMap` (AD-10 twin); any future Java collection stored as
  a property value needs an entry there, never a renamed production class.
- **Confidence**: High

## Observation: hand-built `LGraph` tests need `LayoutMetaDataService.initElkReflect()`

- **Context**: T4b and T5 unit tests touching `IN_LAYER_SUCCESSOR_CONSTRAINTS` / `CM_ENFORCED_GROUP_ORDERS`.
- **Finding**: without it `getProperty` throws `IllegalStateException` when cloning a list default; row replays call it
  implicitly through import.
- **Impact**: call it in `beforeAll` for hand-built graphs.
- **Confidence**: High

## Observation: `GreedyPortDistributor` depends on `greedyswitch`

- **Context**: T6 porting the p3order lower half.
- **Finding**: `GreedyPortDistributor.java` and `ISweepPortDistributor.create` import
  `intermediate.greedyswitch.BetweenLayerEdgeTwoNodeCrossingsCounter`; the batch-3 overview's claim that the lower
  half does not depend on greedyswitch is wrong for those two.
- **Impact**: those files land with the greedyswitch port (T7).
- **Confidence**: High

## Observation: `ModelOrderBarycenterHeuristic` remembers the first answer, not a consistent order

- **Context**: T6 porting `compareNodes`/`compareBasedOnBarycenter` (`ModelOrderBarycenterHeuristic.java:95-100,184`).
- **Finding**: a `value < 0` registers n1 as `bigger`, so a repeated `compare(a, b)` answers +1 from memory and
  `compare(b, a)` −1. Verbatim and pinned.
- **Impact**: do not "fix" it; T7's model-order rows are the proof.
- **Confidence**: High

## Observation: `MedianHeuristic.calculateMedians` seeds min/max with `Double.MIN_VALUE`/`MAX_VALUE`

- **Finding**: the min/max never move, so `avgWeight` is always `(MAX_VALUE + MIN_VALUE) / 2` and unconnected nodes
  always get that constant weight.
- **Impact**: faithful; a test that expects a "real" average is wrong.
- **Confidence**: High

## Observation: the two initial-order tries of the sweep share one property id

- **Context**: T7 porting the thoroughness loops (`LayerSweepCrossingMinimizer.java:257-259`).
- **Finding**: `FIRST_TRY_WITH_INITIAL_ORDER` and `SECOND_TRY_WITH_INITIAL_ORDER` have the same id, so after the first
  sweep `getProperty(FIRST)` already reads false and `SECOND` is never set; the `if (FIRST)` block after `if (SECOND)`
  is dead. Reproduced verbatim.
- **Impact**: the model-order initial-order logic is effectively one try; do not "fix" it.
- **Confidence**: High

## Observation: `GreedyPortDistributor` untangles a nested graph before the child's greedy switch runs

- **Context**: T7 hand-built nested graph with a crossing at the east dummies.
- **Finding**: on a backward sweep (seed 1 starts backward) the root's distributor counts crossings inside the nested
  graph through `BetweenLayerEdgeTwoNodeCrossingsCounter` and switches the host's east ports, so the dummy order flips
  with no `SwitchDecider` switch.
- **Impact**: 7h scenarios for the hierarchical greedy switch need the crossing on the side opposite the sweep direction.
- **Confidence**: High

## Observation: `countModelOrderPortChanges` unboxes `MODEL_ORDER` of every outgoing edge

- **Context**: T7 counting tests on hand-built graphs.
- **Finding**: without `SortByInputModelProcessor` having run, the read is null and the port throws a `TypeError`
  (NPE in Java).
- **Impact**: hand-built tests that reach the model-order counts must set edge `MODEL_ORDER`.
- **Confidence**: High

## Observation: an ELK JSON root id prefixes every node designation

- **Context**: T8 porting `SortByInputModelProcessorTest`, which matches `n_l<layer>p<pos>` names.
- **Finding**: `LNode.toString` goes through `getOriginIdentifier`, which qualifies the id with the parent's
  (`root.l0p0`); an `.elkt` root has no id, so the Java names are bare, and a JSON graph needs `id: ''` on the root for
  bare designations.
- **Impact**: any name-based assertion on a JSON-imported graph.
- **Confidence**: High

## Observation: the ptolemy rows never exercise an inverted port

- **Context**: T8 `InvertedPortProcessorTest.testValidNodeOrder` over the 13 `INVERTED_PORT_PROCESSOR/default` rows.
- **Finding**: no edge leaves a WEST port or enters an EAST port in any of them, so the Java invariant is vacuous
  there; only the `scenarios/InvertedPortProcessor/*` rows carry inverted ports.
- **Impact**: model-family-restricted invariants can pass without testing anything; check non-vacuity per test.
- **Confidence**: High

## Observation: the order sweep is far cheaper than the 7b sweeps

- **Context**: T10 oracle sweep over the 550 ptolemy models at the P3 stop.
- **Finding**: 6,728 cases ran in 38 s with no timeouts and no throws; the P3 stop never reaches the `StretchWidthLayerer`
  or `Tarjan` hangs (default `GREEDY`/`NETWORK_SIMPLEX`). The only refusal category is `SELF_LOOP_PREPROCESSOR`
  (112 levels × 4 strategies); no ptolemy model needs `LABEL_DUMMY_INSERTER`. Editing the recorder source invalidates
  the vector cache (salt covers the program), so a "recorded" line after a recorder edit is expected.
- **Impact**: stride 1 (89 s) is affordable; the default stays 2 per the brief.
- **Confidence**: High

## Observation: the replay-alone coverage of 7c is dominated by nested-graph paths

- **Context**: T9 coverage map (`plans/layered-crossing-min/unreached.md`).
- **Finding**: of 388 untaken branches, 89 (and 36 of 88 functions) need `INCLUDE_CHILDREN` nesting (`LayerSweepTypeDecider`
  beyond `rootNode()`, the hierarchical sweep, `GraphInfoHolder` children, the hierarchical greedy switch); 60 are dead
  by construction, the largest groups being null-barycenter comparator arms (`fillInUnknownBarycenters` runs first)
  and the force/non-force arms of the two barycenter heuristics (`GraphInfoHolder` picks the class by the flag).
- **Impact**: 7h must re-measure the nested paths; anchored tests for 7c cannot reach them.
- **Confidence**: High

## Observation: the TS order dump omitted detached baseline edges (fixed in 7c's `orderDump`)

- **Context**: T11's `sites/NorthSouth/selfLoops/sameSide` row failed replay with `edges g0/e1: missing`.
- **Finding**: the recorder lists baseline edges the port traversal no longer meets (`src`/`tgt` null) after the
  reachable ones; the 7b `collect()` in `test/helpers/layered-phase-replay-dump.ts` walks ports only, so an edge
  `NorthSouthPortPreprocessor` detaches (`NorthSouthPortPreprocessor.java:652-653`, `setSource(null)`) never appeared.
  The 7c `orderDump` now appends them (`edgesNotMet`); the 7b helper is untouched. No landed row has a null-ended edge.
- **Impact**: any later row where a processor detaches an edge replays; 7b's `phaseDump` alone still omits them.
- **Confidence**: High

## Observation: the first sweep randomizes every barycenter; the sweep stream is re-seeded from the graph's `Random`

- **Context**: designing the equal-barycenter and `Median/forwardFirst` site rows (T11).
- **Finding**: `compareDifferentRandomizedLayouts` calls `setSeed(randomSeed)` where `randomSeed` is the first
  `nextLong()` of the graph's `Random`; seed 1 gives a `LayerTotalPortDistributor` and a backward first sweep, seed 2
  `NodeRelativePortDistributor` with a forward first sweep; `Median/forwardFirst` needed seed 4.
- **Impact**: scenarios needing a forward first sweep or real (non-filled) barycenters must scan seeds on the TS port.
- **Confidence**: High

## Observation: model-order "known association" arms are reached only through the crossing-count loop

- **Context**: `ModelOrderNodeComparator`/`ModelOrderPortComparator` association arms stayed untaken under sorting.
- **Finding**: `countModelOrderNodeChanges`/`countModelOrderPortChanges` compare every pair of a layer with one
  comparator instance, which is what records the associations; the insertion sort compares a fresh pivot against the
  sorted prefix and never asks a pair twice. The arms need `crossingCounterNodeInfluence`/`PortInfluence` non-zero.
- **Impact**: anchored tests (T12) for those arms must set the influence options, not rely on sorting.
- **Confidence**: High

## Observation: `SortByInputModelProcessor` sorts ports of `FIXED_SIDE` or `FREE` nodes only

- **Context**: S9/S10 site rows with `FIXED_ORDER` ports reached nothing.
- **Finding**: ports are sorted only below `FIXED_ORDER` (`SortByInputModelProcessor.java`); rows use `FIXED_SIDE`.
- **Impact**: model-order port scenarios need `FIXED_SIDE` ports.
- **Confidence**: High

## Observation: the full-dump comparison does not apply the `JAVA_CLASS_TWINS` map equivalence

- **Context**: hand-placed layerings with `SORT_BY_INPUT_ORDER_OF_MODEL` under 10 nodes (T11, full dump recorded).
- **Finding**: `targetNode.modelOrder` dumps as `{class:"java.util.HashMap"}` on the Java side and `Map` on the TS
  side; `compareOrder` maps the twins, `compareOrderFullDump` does not, so such rows mismatch on the full dump. T11
  avoided it with non-hand-placed layerings for SBI rows.
- **Impact**: a later row needing both a full dump and a `HashMap`-valued property needs the twin map in the full-dump
  comparison too (7c follow-up, roadmap).
- **Confidence**: High

## Observation: the `ForsterConstraintResolver` group `degree` is only assigned by the merge constructor

- **Context**: `ForsterConstraintResolverConstraintGroup.ts:91 if[0]` (`degree > 0`) in T9's S2.
- **Finding**: `summedWeight`/`degree` are written only in the merge constructor (`ForsterConstraintResolver.java:372-374`,
  `442-446`); single-node groups keep 0/0, so the arm is dead by construction.
- **Impact**: U, not a scenario; T12 cannot anchor it.
- **Confidence**: High

## Observation: the TS order dump encodes numbers as `number`, the rows as `int`/`double`

- **Context**: T12c anchored cases asserting `crossingHint` and `EDGE_THICKNESS` literals copied from `layered-order.json`.
- **Finding**: the replayed `changed` props hold `{t:'number', v:2}`; the row JSON holds `{t:'int', v:2}` or
  `{t:'double', v:'0.0'}`. Only `compareOrder`/`compareChanged` normalise the two; a raw `toEqual` against the row
  literal fails. Enum, ref and list literals match the row verbatim. Row dumps carry no per-port side.
- **Impact**: a test asserting numeric property literals from a row must use the TS encoding (or decode `v` only).
- **Confidence**: High

## Observation: S11's `checkPortModelOrder` caller was misattributed in `unreached.md`

- **Context**: T12b mapping the S11 northSouth arms to site rows.
- **Finding**: `ModelOrderPortComparator.checkPortModelOrder` is public in the Java but called only from inside the
  comparator (`ModelOrderPortComparator.java:216,260`); `NorthSouthPortPreprocessor.modelOrderNorthSouthInputReversing`
  (`:377-392`) is private and never calls it. The TS facade `ModelOrderPortComparator.ts:190` is reachable by no row.
- **Impact**: J (unit-tested in `ModelOrderPortComparator.test.ts`), not S11; recorded in `unreached.md` § T12 corrections.
- **Confidence**: High

## Observation: the session scratchpad is shared between parallel agents

- **Context**: T12b writing `gen.cjs` into the scratchpad while the sibling T12 agents ran.
- **Finding**: a sibling agent's `gen.cjs` replaced it; shell variables do not persist between Bash calls.
- **Impact**: parallel agent briefs must name a private scratchpad subdirectory per task.
- **Confidence**: High

## Observation: per-row v8 coverage maps arms to rows cheaply

- **Context**: T12b building the arm-to-row table.
- **Finding**: `npx vitest run -t '> <row id>: replays' --coverage --coverage.reporter=json src/alg/layered/LayeredOrderVectors.test.ts`
  takes about 5 s per row; a baseline with `-t '^(?!.*sites/)'` gives the arms only the site rows reach.
- **Impact**: reusable by 7d–7h to pick the rows for anchored cases.
- **Confidence**: High

## Observation: the full dump of an order row has no port sides or anchors for layered nodes

- **Context**: anchoring `sites/NorthSouth/portOptions/allowNonFlow` (`SweepCopy.java:161-175`, the N/S side switch and
  anchor mirroring) in T12a.
- **Finding**: `expected.dump.graphs[0].layers` holds node paths only and `layerlessNodes` is empty for post-P3 rows, so
  the recorded dump carries no `PortDump.side` or `anchor` for layered nodes; a side switch is visible only through the
  port order and the layer order.
- **Impact**: asserting sides or mirrored anchors needs a recorder that dumps layered node bodies (7d+ follow-up).
- **Confidence**: High

## Observation: `replaySite`/`siteFactories` is duplicated across the anchored test files

- **Context**: T12a–c set up a local site-row replay in every file because `test/helpers/` was out of their write-sets.
- **Finding**: 13 p3order files (and the T12b/T12c files in their own variants) carry the same block built on
  `IntermediateProcessorStrategy` and the three strategy enums.
- **Impact**: a cleanup can move it to `test/helpers/layered-order-replay-site.ts` (roadmap follow-up).
- **Confidence**: High

## Observation: timed gates are sensitive to foreign load on this machine

- **Context**: batch 7 and 8 gates of mission 7c.
- **Finding**: other repositories' vitest runs pushed the 1-minute load to 135–160; `npm test` took 80.5 s at load 12–22
  and 55.9 s at 5.7; an orphaned elk-engine worker (parent launchd) had run for 29 hours at a full core. A
  `sysctl -n vm.loadavg` wait loop until the load is below 6 makes the timing comparable.
- **Impact**: time `npm test` and the replay only at settled load and check `ps` for orphaned vitest workers first;
  the session cannot kill processes (auto-mode classifier), so ask the user.
- **Confidence**: High
