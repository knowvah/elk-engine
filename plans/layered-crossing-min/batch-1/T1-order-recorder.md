<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Oracle recorder `LayeredOrderVectors`

**Agent:** java-architect (sonnet) · **Commit:** `test(T1): record layered order vectors from the oracle`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered`.

## Context

Mission 7c (README), C2–C4. Crossing minimization and the eight processors before it need oracle expectations recorded
**before** the TS exists (AD-13, L4). `tools/vectors/LayeredPhaseVectors.java` (7b, 2,730 lines, landed, never edited)
already drives the oracle's `ElkLayered` whitebox API for pipeline rows and interprets step rows; this task copies
that core into a new launcher (B7: one file, origin cited in the header) and extends it to the P3 stop, the eight
processors, the greedy-switch processors and a port-order field. Read the 7b recorder's header (lines 1–110) first:
row kinds, step ops, positional paths, `expected`, refusal rule, BFS guard, `-XX:hashCode=2`; the 7b `.sh` for the
classpath and cache namespace. `.agent-notes/layered-cycles-layers.md` lists the hangs and guards you will meet.

## Task

1. **`tools/vectors/LayeredOrderVectors.java`**, JDK 21 single-file launcher, same header structure as 7b's, same
   `importGraph(target)`, `normalise`, step interpreter, C4 encoding, re-run and build-twice checks, strict parse,
   ≤ 5 MB. Changes: `runPhase` accepts `P3_NODE_ORDERING`; `stopClass` accepts `P3` (the class
   `CrossingMinimizationStrategy.create()` returns) and any `IntermediateProcessorStrategy` member; `expected` gains
   `ports`: for every node path, its port paths in list order after the stop (the sweep writes node and port orders
   back); the refusal set is the 7b members + C2's ten (`PORT_SIDE_PROCESSOR`, `PORT_LIST_SORTER`,
   `LONG_EDGE_SPLITTER`, `INVERTED_PORT_PROCESSOR`, `NORTH_SOUTH_PORT_PREPROCESSOR`,
   `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR`, `SEMI_INTERACTIVE_CROSSMIN_PROCESSOR`, `SORT_BY_INPUT_ORDER_OF_MODEL`,
   `ONE_SIDED_GREEDY_SWITCH`, `TWO_SIDED_GREEDY_SWITCH`); `ACCEPTED_REFUSALS` lists each refused
   model/target/processor (only C2's categories: label dummies, comments, direction, self loops, breaking points).
2. **Group `models`** (`models/<model>/<target or root>/<stop>/<variant>`): every vendored model at every hierarchy
   level (7b's level rule). Stops: `P3` × `CrossingMinimizationStrategy` {`LAYER_SWEEP`, `MEDIAN_LAYER_SWEEP`,
   `INTERACTIVE`, `NONE`} with default options; on the three smallest flattened models and every vendored `.elkt`
   also `crossingMinimization.greedySwitch.type` {`ONE_SIDED`, `TWO_SIDED`, `OFF`} × `thoroughness` {1, 7},
   `crossingMinimization.semiInteractive=true` (positions from `BasicCrossingMinimizationTest`'s configurator if it
   has one, else the model's), `considerModelOrder.strategy` {`PREFER_EDGES`, `NODES_AND_EDGES`} with and without
   `crossingMinimization.forceNodeModelOrder`, `crossingMinimization.hierarchicalSweepiness` ±1 on hierarchical
   levels; processor stops: each of the eight processors and `ONE_/TWO_SIDED_GREEDY_SWITCH` (choose models where
   `GraphConfigurator.activateGreedySwitchFor` is true: node count under the activation threshold). `INTERACTIVE`
   rows reproduce the Java test's seeded positions (`BasicCrossingMinimizationTest.java`, read its configurator).
3. **Vendor** the models the ten `LayoutTestRunner` tests name and the 7b set lacks: `tickets/layered/528_nodeEdgeOverlap.elkt`,
   `528_violatedNodeOrder.elkt` (`ForsterConstraintResolverTest`), `tests/layered/north_south_ports/**`,
   `tests/layered/preserve_order/**` (manifest rows the 7a way; byte-identical to `$ELK_MODELS_DIR`; extend the pin in
   `test/golden/algorithm-refs.test.ts` as 7b's `LAYERED_PHASE_INPUTS` did). Record them under the same stops.
4. **Group `scenarios`** (`scenarios/<class>/<name>`), inline `elk`, steps `importGraph`, `normalise`,
   `runPhase P1_CYCLE_BREAKING GREEDY`, `runPhase P2_LAYERING NETWORK_SIMPLEX` (or `layers` for a hand-placed layering),
   `setProperty` as needed, then `runProcessor <X>` or `runPhase P3_NODE_ORDERING <S>`, `dump`. At least two small
   graphs (3–10 nodes) per processor of C2 and per `CrossingMinimizationStrategy` value, chosen so that every class of
   T4a, T4b, T5, T6 and T7 is exercised by some row (the heuristics and distributors are reached through P3 options:
   `MEDIAN_LAYER_SWEEP`, model order, greedy switch type, hierarchical levels for the hierarchical distributor);
   fixed port sides (`portConstraints=FIXED_SIDE`/`FIXED_ORDER`), N/S ports, external ports, in-layer edges, long
   edges, in-layer constraints (`crossingMinimization.inLayerPredOf`/`inLayerSuccOf`, `positionChoiceConstraint`)
   and layout units among them. Rows under ten nodes carry the full dump.
5. **`tools/vectors/layered-order-vectors.sh`:** the 7b script's structure, cache namespace `layered-order`, same JVM
   flags, writes `test/golden/refs/java/layered-order.json`; `shellcheck -x` clean; byte-identical on a second run.

## Write-set

`tools/vectors/{LayeredOrderVectors.java,layered-order-vectors.sh}`, `test/golden/refs/java/layered-order.json`,
`test/golden/inputs/tests/layered/{north_south_ports,preserve_order}/**`, `test/golden/inputs/tickets/layered/528_*.elkt`,
`test/golden/inputs/manifest.json`, `test/golden/algorithm-refs.test.ts`.

## Read-set

`tools/vectors/{LayeredPhaseVectors.java,layered-phase-vectors.sh}` (read only), `J/ElkLayered.java:375-531`,
`J/GraphConfigurator.java:44-80,195-340`, `J/p3order/LayerSweepCrossingMinimizer.java:636-681`,
`J/p3order/{InteractiveCrossingMinimizer,NoCrossingMinimizer}.java` (configurations), `J/p5edges/*EdgeRouter.java`
(before-P3 additions), `J/intermediate/IntermediateProcessorStrategy.java`, `JT/p3order/{BasicCrossingMinimizationTest,
ForsterConstraintResolverTest,ModelOrderBarycenterHeuristicTest}.java`, the seven processor tests named in the README,
`test/golden/inputs/manifest.json`, `decisions.md` C2–C4, `.agent-notes/layered-cycles-layers.md`.

## Interface contract (output, consumed by T3–T12)

7b's row format exactly (`id`, `group`, `input`, `target`, `options`, `steps`, `prefix`, `expected`), with
`expected.ports: { "<node path>": ["<port path>", …] }` added for every node (layered or layerless) and `runPhase`'s
first argument also allowing `P3_NODE_ORDERING`; `rowCounts: { models, scenarios, sites: 0 }`; groups in order
`models`, `scenarios`, `sites`; ids unique and stable.

## Acceptance criteria

- Given two consecutive runs, when compared, then byte-identical, strict JSON, under 5 MB, the second a cache hit.
- Given every row, when re-loaded and re-run in Java, then `expected` is reproduced.
- Given the `scenarios` group, when counted, then every C2 processor and every `CrossingMinimizationStrategy` value has
  at least one row, and every class listed in the batch-2–4 briefs is reached by some row (state which).
- Given a prefix naming a processor outside the 7b + 7c sets, when recorded, then the recorder exits 1 naming the row
  unless the row is in `ACCEPTED_REFUSALS` under a C2 category.
- Given `git status`, when inspected, then no landed file under `test/golden/refs/` changed.

## Observability / Rollback

N/A — test tooling. Reversible: revert the commit.
