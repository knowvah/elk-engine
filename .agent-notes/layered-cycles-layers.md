<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — layered-cycles-layers (mission 7b, 2026-10-28)

## Observation: `IntermediateProcessorStrategy` has 59 members, not 63

- **Context**: T2 port of the enum.
- **Finding**: `IntermediateProcessorStrategy.java` declares 59 constants and 59 switch arms; the 7b brief said 63
  (and 42 for the 7f share, which is 38).
- **Impact**: plan counts derived from the brief are off by four; the code and its test pin 59.
- **Confidence**: High

## Observation: LNode identity hashes make `BFSNodeOrderCycleBreaker` nondeterministic across JVM runs

- **Context**: T1 recording P1 rows.
- **Finding**: `BFSNodeOrderCycleBreaker.java:121` iterates a `HashSet<LNode>` of sources, so which edges are reversed
  differed between two oracle runs on the same input. `tools/vectors/layered-phase-vectors.sh` runs the JVM with
  `-XX:+UnlockExperimentalVMOptions -XX:hashCode=2`, under which identity-hashed `HashSet`/`HashMap`s iterate in
  insertion order — but only up to 10 entries (bins treeify from the 11th and the order is perturbed; verified by a
  scratch probe). Only `:121` iterates such a collection among the 7b classes.
- **Impact**: the TS port uses insertion order (AD-10); the recorder refuses BFS rows with more than 10 sources; any
  later recorder that reuses the flag must enforce the same bound, and any `HashSet<LNode>` iteration in a later
  mission needs the same audit.
- **Confidence**: High

## Observation: `StretchWidthLayerer` never terminates on a zero-height NORMAL node

- **Context**: T1 recording `STRETCH_WIDTH` P2 rows on vendored models.
- **Finding**: `StretchWidthLayerer.java:149` computes the normalized size (dividing by the node height) before `:151`
  clamps the minimum height to 1; a zero-height node yields `Infinity`, `conditionGoUp()` is always true and the
  `maxWidth++` reset loop never ends. The Java tests avoid it through `@DefaultConfiguration` node sizes.
- **Impact**: no zero-size inputs for `STRETCH_WIDTH` in replay; the port keeps the Java statement order (the hang is
  faithful behaviour, not a bug to fix).
- **Confidence**: High

## Observation: `InteractiveLayerer` declares no edge reverser

- **Context**: T1 `INTERACTIVE` layerer rows on the layer-constraint inputs.
- **Finding**: its processor configuration has `INTERACTIVE_EXTERNAL_PORT_POSITIONER` instead of
  `EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER`, so a FIRST/LAST node with an ordinary incoming/outgoing edge makes
  `LayerConstraintPostprocessor` throw `UnsupportedConfigurationException`.
- **Impact**: that combination cannot be recorded; the TS port must throw the same way.
- **Confidence**: High

## Observation: `GraphConfigurator` is package-private and needs reflection from a recorder

- **Context**: T1 `normalise` step.
- **Finding**: `GraphConfigurator` and `configureGraphProperties` are not public; `configureGraphProperties` already
  calls `copyPortContraints`, so a faithful normalisation calls only the former.
- **Impact**: recorders mirroring the configurator use reflection; the TS twin cites `GraphConfigurator.java:96-165`.
- **Confidence**: High

## Observation: wiring a strategy enum's arms closes an ESM cycle through `LayeredOptions`

- **Context**: T6/T7 replaced the throwing `CycleBreakingStrategy`/`LayeringStrategy` arms with `new <Class>()`.
- **Finding**: the phase classes import `LayeredOptions`, which imports `LayeredLayoutProvider` → `ElkGraphTransformer`
  → `ElkGraphImporter` → `ElkGraphImporterModelOrder`, which reads the strategy enums at module top level (`:13`); the
  generated `LayeredMetaDataProvider.ts:226` reads `CycleBreakingStrategy.GREEDY` at class-static time. Entering the
  graph at either enum, at the metadata provider, or at a phase base class with a subclass throws a TDZ error, and the
  landed `test/melk/layered-registry.test.ts` fails.
- **Impact**: every ported phase-strategy enum (7c `CrossingMinimizationStrategy`, 7d `NodePlacementStrategy`, …) will
  make its enum non-leaf; the melk `NON_LEAF_DEFAULT_TYPES` list and any module-level read of an enum constant in
  `graph/transform` must be adjusted in the same mission, and tests enter through the enum, not the class.
- **Confidence**: High

## Observation: adjacent `Random` seeds draw the same first `nextInt` for small bounds

- **Context**: T6 `GreedyCycleBreaker` tie row, which the brief said must differ under seed 2.
- **Finding**: `new Random(s).nextInt(4)` is 2 for every seed 1–8 and `nextInt(2)` is 1, so adjacent seeds choose the
  same node; seed 3 is the first that changes the tie row's result.
- **Impact**: a "wrong seed differs" assertion needs a scanned seed, not seed + 1.
- **Confidence**: High

## Observation: `StretchWidthLayerer` also never terminates on a self-loop

- **Context**: T7 port of `StretchWidthLayerer`.
- **Finding**: a self-loop edge stays in `remainingOutGoing` because `updateOutGoing` runs only for incoming edges of
  placed nodes, so the layer loop spins forever; production masks it through `SELF_LOOP_PREPROCESSOR`.
- **Impact**: no self-loop inputs for `STRETCH_WIDTH` step rows; the port is faithful, not fixed.
- **Confidence**: High

## Observation: running a vitest deep case under `--jitless`

- **Context**: B8 deep-path cases (T5–T7).
- **Finding**: `node --jitless npx vitest …` fails (`WebAssembly is not defined` in vitest's main process), but
  `npx vitest run <files> --pool=forks --execArgv=--jitless -t "<case name>"` runs the forked worker without the JIT;
  `node --jitless --import tsx <script>` works for a standalone check.
- **Impact**: use the `--pool=forks --execArgv=--jitless` form for AC6/B8 proofs instead of concluding jitless is
  impossible.
- **Confidence**: High

## Observation: phase classes' static processor configurations join the enum cycle once the processor enum is wired

- **Context**: T8 pre-flight, wiring two `IntermediateProcessorStrategy` arms.
- **Finding**: thirteen `p1cycles`/`p2layers` classes built `INTERMEDIATE_`/`BASELINE_PROCESSING_CONFIGURATION` in a
  `static readonly` field (module evaluation time), reading `IntermediateProcessorStrategy` members. Once that enum
  imports the processor classes, the chain enum → processor → `LayeredOptions` → `LayeredLayoutProvider` →
  transformer → strategy enum → phase class reaches those fields while the enum module is still evaluating, so every
  production entry point (`CycleBreakingStrategy`, `LayeredMetaDataProvider`, any layerer) throws a TDZ error. Java
  initialises the field lazily at class initialisation. The fix is a cached static getter (`static #X` plus
  `private static get X()`), the same mechanism as the melk lazy defaults; classes that build the configuration inside
  `getLayoutProcessorConfiguration` (`StretchWidthLayerer`, `MinWidthLayerer`, `InteractiveLayerer`) need nothing.
  Entering at a base class that has a subclass reached through the cycle (`GreedyCycleBreaker`,
  `SCCModelOrderCycleBreaker`) still fails; tests import the enum first.
- **Impact**: every later phase mission (7c `p3order`, 7d `p4nodes`, 7e `p5edges`) must write its phase classes'
  processor configurations as lazy getters from the start, and probe `import()` of each enum and the metadata provider
  after wiring its arms.
- **Confidence**: High

## Observation: `NodePromotion` left-to-right model order terminates in Java only through `Integer` box identity

- **Context**: T8 generic replay of the `NODE_PROMOTION/LONGEST_PATH/MODEL_ORDER_LEFT_TO_RIGHT` rows.
- **Finding**: `promoteNodeByModelOrder` (`NodePromotion.java:522-545`) cascades promotions and its layer ids pass 127
  within a few thousand promotions on 20-node graphs; the stop condition at `:541` is a reference comparison of two
  boxed `Integer`s whose right operand is always a fresh `Integer.valueOf` box, so it is false above 127. A port that
  compares values never terminates. The same `valueOf`-cache rule is exact at `CoffmanGrahamLayerer.java:244` and
  `SCCNodeTypeCycleBreaker.java:80,88` (`JavaInteger.sameValueOfBox`).
- **Impact**: any later `Integer`/`Long` `==` in ELK must be ported by tracing the box provenance, never as value
  equality by default; the emulation assumes the JDK default `IntegerCache.high` (the oracle runs with it).
- **Confidence**: High

## Observation: the replay must set row options on the imported target, not the root

- **Context**: T8 replay of non-root `target` rows.
- **Finding**: `LayeredPhaseVectors.java:1299-1300` applies `options` to the imported node; a replay that sets them on
  the root loses the strategy for every hierarchy level, which only shows on rows whose strategy is not the default.
- **Impact**: every recorder/replay pair that supports a `target` must agree on where options land; test with a
  non-default strategy on a non-root target.
- **Confidence**: High

## Observation: BF/DF model-order layerings do not satisfy the forward-edge and partition-order invariants

- **Context**: T8 porting `BasicLayerAssignmentTest` and `PartitionPostProcessorTest`.
- **Finding**: on oracle-identical BF/DF model-order layerings, `testEdgesPointTowardsNextLayers` fails (23 rows) and
  `testPartitionOrder` fails (4 rows); the Java tests never run those layerers (`@TestAfterProcessor` lists six
  layerers; the partition test uses the default). Likewise `NodePromotionTest` pairs `MODEL_ORDER_LEFT_TO_RIGHT` only
  with `LONGEST_PATH_SOURCE` (`NodePromotionTest.java:87-106`); with `LONGEST_PATH` the forward-edge invariant fails.
- **Impact**: ported invariant tests run over exactly the Java test's configurations, not over every recorded row.
- **Confidence**: High

## Observation: ELK's `Tarjan` never pops a component whose root has a DFS index of 128 or more

- **Context**: T10 sweep, `P1/SCC_CONNECTIVITY` on flattened ptolemy models with more than 127 nodes.
- **Finding**: `Tarjan.java:86` compares `TARJAN_LOWLINK` and `TARJAN_ID` with `==` on boxed `Integer`s that were boxed
  separately, so the root test holds only inside the `Integer.valueOf` cache; nodes with id ≥ 128 stay on the stack
  with `onstack` true. The oracle sweep shows 14 `SCC_CONNECTIVITY`/`SCC_NODE_TYPE` 20 s timeouts on large models,
  consistent with `SCCModelOrderCycleBreaker.java:99` looping on components that are never found.
- **Impact**: the port reproduces it (`JavaInteger.sameValueOfBox`); the SCC strategies are unusable on 128+ node
  graphs in Java and in the port alike. Candidate upstream report. Any `Integer`/`Long` `==` in later missions needs
  the same provenance check before porting as value equality.
- **Confidence**: High (oracle dump diff; the comparison's operands are int autoboxes)
