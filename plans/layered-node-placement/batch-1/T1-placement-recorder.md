<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Oracle recorder `LayeredPlacementVectors`

**Agent:** java-architect (sonnet) · **Commit:** `test(T1): record layered placement vectors from the oracle`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T1/`.

## Context

Mission 7d (README), N1–N3. Node placement and the five processors around it need oracle expectations recorded
**before** the TS exists (AD-13, L4). `tools/vectors/LayeredOrderVectors.java` (7c, 2,995 lines, landed, never edited)
drives the oracle's `ElkLayered` whitebox API (`J/ElkLayered.java:407` `prepareLayoutTest`, `:446` `runLayoutTestUntil`,
`runLayoutTestStep`) for pipeline rows and interprets step rows; this task copies its core into a new launcher (B7:
one file, origin cited in the header) and extends it to the P4 stop, the five processors and a `geometry` field.
Read the 7c recorder's header (lines 1–140) first: row kinds, step ops, positional paths, `expected`, the refusal
rule, the BFS guard, `-XX:hashCode=2`; and its `.sh` for the classpath and cache namespace.
`.agent-notes/layered-crossing-min.md` and `layered-cycles-layers.md` list the hangs and guards you will meet.

## Task

1. **`tools/vectors/LayeredPlacementVectors.java`**, JDK 21 single-file launcher: copy lines 1–1,926 of the 7c
   recorder (everything up to and including `gj(...)`; the 7c scenario builders from line 1,927 on are **not**
   copied), same header structure, same `importGraph(target)`, `normalise`, step interpreter, C4 encoding, re-run and
   build-twice checks, strict parse, ≤ 5 MB. Changes: `runPhase` also accepts `P4_NODE_PLACEMENT` (the class
   `NodePlacementStrategy.<S>.create()` returns); `stopClass` accepts `P4` and any `IntermediateProcessorStrategy`
   member; the allowed set is the 7b ten + the 7c ten + the 7d five (`INNERMOST_NODE_MARGIN_CALCULATOR`,
   `LABEL_AND_NODE_SIZE_PROCESSOR`, `IN_LAYER_CONSTRAINT_PROCESSOR`, `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR`,
   `NODE_PLACEMENT_REPEATER`) + the P1–P4 phases. `REFUSAL_CATEGORIES` = 7c's five before-P3 ones plus, per N1:
   `LABEL_DUMMY_SWITCHER`, `LABEL_SIDE_SELECTOR`, `END_LABEL_PREPROCESSOR`, `CENTER_LABEL_MANAGEMENT_PROCESSOR`,
   `END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR`, `COMMENT_NODE_MARGIN_CALCULATOR`, `ALTERNATING_LAYER_UNZIPPER` (7f),
   `HYPEREDGE_DUMMY_MERGER` (7e), `SELF_LOOP_PORT_RESTORER`, `SELF_LOOP_ROUTER`, `SINGLE_EDGE_GRAPH_WRAPPER`,
   `BREAKING_POINT_PROCESSOR` (7g). `ACCEPTED_REFUSALS` lists each refused `<model>/<target or root>/<first refused
   member>`. A plan containing a member outside every set makes the recorder exit 1 naming the row.
2. **`expected`** = 7c's order expected (`layers`, `layerless`, `hidden`, `edges`, `ports`, `changed`) plus
   `geometry: { nodes: { "<node path>": { pos: HexPair, size: HexPair, margin: HexQuad } }, layers: [HexPair],
   ports?: { "<port path>": { pos: HexPair } }, labels?: { "<label path>": { pos: HexPair } } }` — `nodes` for every
   node of the traversal (layered or layerless), `layers` the root LGraph's `Layer.getSize()` in layer order; `ports`
   and `labels` present **only** when the stop is `LABEL_AND_NODE_SIZE_PROCESSOR` or
   `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR`, or the imported graph holds a node with
   `NodeFlexibility.getNodeFlexibility(n) != NONE` (`J/options/NodeFlexibility.java:84`), else absent (N3). Step rows
   under ten nodes keep the full 7a dump (`FULL_DUMP_BELOW`). Doubles as 16 hex digits (7c `hex`).
3. **Group `models`** (`models/<model>/<target or root>/<stop>/<variant>`): every vendored model at every
   edge-bearing hierarchy level (7b's level rule). Stops: `P4` × `NodePlacementStrategy` {`SIMPLE`, `INTERACTIVE`,
   `LINEAR_SEGMENTS`, `BRANDES_KOEPF`, `NETWORK_SIMPLEX`} with default options; the five processor stops on every
   level whose plan contains them (`NODE_PLACEMENT_REPEATER` only on flexibility rows: `J/GraphConfigurator.java:335-338`
   adds it when a node has flexibility and the graph **has** the `…nodeFlexibility.recomputeNodePlacement` property,
   an `IProperty<NodePlacementStrategy>`, see `J/intermediate/NodePlacementRepeater.java:46`). On the **variant set**
   (the three smallest flattened ptolemy models and every vendored `.elkt`, the 22 new ones included) also:
   `org.eclipse.elk.layered.nodePlacement.bk.edgeStraightening` {`NONE`, `IMPROVE_STRAIGHTNESS`} ×
   `…nodePlacement.bk.fixedAlignment` {`NONE`, `LEFTUP`, `LEFTDOWN`, `RIGHTUP`, `RIGHTDOWN`, `BALANCED`} (12 BK rows);
   `…nodePlacement.favorStraightEdges` toggled against its default; `…nodePlacement.linearSegments.deflectionDampening`
   at one non-default value; `…nodePlacement.networkSimplex.nodeFlexibility.default` {`PORT_POSITION`,
   `NODE_SIZE_WHERE_SPACE_PERMITS`, `NODE_SIZE`} each with and without `…recomputeNodePlacement = NETWORK_SIMPLEX`
   (option ids as in `src/alg/layered/options/LayeredOptions.ts:2041-2473`). `INTERACTIVE` rows take the model with
   the seeded node positions of the 7c `interactiveConfigurator` (`LayeredOrderVectors.java:1699-1716`, `Random(0)`,
   max 10,000, breadth-first); `JT/p4nodes/BasicNodePlacementTest.java` has no position configurator (its two
   `INTERACTIVE_*` constants are unused). Trimming rule if the 5 MB cap nears: the BK matrix only on the variant set
   first, then `favorStraightEdges`; journal the rule applied.
4. **Vendor** `tests/layered/node_placement/**/*.elkt` (22 files, 35 KB) from `$ELK_MODELS_DIR` byte-identical,
   manifest rows the 7a way (`test/golden/inputs/manifest.json`, pinned commit `ac5af2ba…`), and a
   `LAYERED_PLACEMENT_INPUTS` list beside `LAYERED_ORDER_INPUTS` in `test/golden/algorithm-refs.test.ts:55` (extend the
   "nothing else" assertion at `:196-198` and its title). Pin every vendored input in `MODEL_TABLE` (the `.sh` checks
   the same lines).
5. **Group `scenarios`** (`scenarios/<class>/<name>`), inline `elk`, steps `importGraph`, `normalise`,
   `runPhase P1_CYCLE_BREAKING GREEDY`, `runPhase P2_LAYERING NETWORK_SIMPLEX` (or `layers`), `runPhase P3_NODE_ORDERING
   LAYER_SWEEP`, then the before-P4 processors a pipeline would run in `IntermediateProcessorStrategy` order
   (`IN_LAYER_CONSTRAINT_PROCESSOR`, `LABEL_AND_NODE_SIZE_PROCESSOR`, `INNERMOST_NODE_MARGIN_CALCULATOR`, and
   `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR` on external-port graphs; enum order `J/intermediate/IntermediateProcessorStrategy.java:94-132`),
   `setProperty` as needed, then `runPhase P4_NODE_PLACEMENT <S>` or `runProcessor <X>`, `dump`. At least two small
   graphs (3–10 nodes) per strategy, per BK straightening and alignment value, per flexibility value (node-level
   `…networkSimplex.nodeFlexibility` and the graph default), per processor; among them long edges (dummies), nodes of
   different heights, margins, node and port labels (`LabelAndNodeSizeProcessor`), in-layer constraints (the
   processor reads `InternalProperties.IN_LAYER_CONSTRAINT`, `J/intermediate/InLayerConstraintProcessor.java:73-74`,
   set by `NorthSouthPortPreprocessor` and `HierarchicalPortConstraintProcessor`: use north/south and external ports,
   never a hand-set constraint), external ports (`HierarchicalPortDummySizeProcessor`), and a recompute row
   (`NODE_PLACEMENT_REPEATER`). Rows under ten nodes carry the full dump.
6. **`tools/vectors/layered-placement-vectors.sh`:** the 7c script's structure, cache namespace `layered-placement`,
   same `THIRD_PARTY` list and JVM flags, writes `test/golden/refs/java/layered-placement.json`; `shellcheck -x` clean;
   byte-identical on a second run.

## Write-set

`tools/vectors/{LayeredPlacementVectors.java,layered-placement-vectors.sh}`, `test/golden/refs/java/layered-placement.json`,
`test/golden/inputs/tests/layered/node_placement/**`, `test/golden/inputs/manifest.json`, `test/golden/algorithm-refs.test.ts`.

## Read-set

`tools/vectors/{LayeredOrderVectors.java,layered-order-vectors.sh}` (read only), `J/ElkLayered.java:380-500`,
`J/GraphConfigurator.java:44-80,195-340`, `J/p4nodes/*.java` and `J/p4nodes/bk/BKNodePlacer.java:120-135`
(`HIERARCHY_PROCESSING_ADDITIONS`), `J/intermediate/{InnermostNodeMarginCalculator,LabelAndNodeSizeProcessor,
InLayerConstraintProcessor,HierarchicalPortDummySizeProcessor,NodePlacementRepeater}.java`,
`J/p3order/LayerSweepCrossingMinimizer.java:672-681` (the P3 phases' `IN_LAYER_CONSTRAINT_PROCESSOR`),
`J/p5edges/{OrthogonalEdgeRouter,PolylineEdgeRouter}.java:110-170` and `J/p5edges/splines/SplineEdgeRouter.java:100-125`
(the routers' before-P4 additions), `J/options/NodeFlexibility.java`, `JT/p4nodes/BasicNodePlacementTest.java`,
`test/golden/inputs/manifest.json`, `decisions.md` N1–N3, `.agent-notes/layered-crossing-min.md`,
`.agent-notes/layered-cycles-layers.md`.

## Architecture decisions

N1 (scope and refusal categories), N2 (stops, variant set, seeded INTERACTIVE positions), N3 (`geometry`, presence
rule, full dump under ten nodes, 5 MB and trimming), AD-10 (`-XX:hashCode=2`), B7 (single-file launcher ≤ 3,000 lines).

## Interface contract (output, consumed by T3–T12)

7c's row format exactly (`id`, `group`, `input`, `target`, `options`, `steps`, `prefix`, `expected`) with
`expected.geometry` as in step 2 (`ports`/`labels` keys absent, not empty, when the N3 rule does not apply),
`runPhase`'s first argument also allowing `P4_NODE_PLACEMENT`, prefix entries `P4_NODE_PLACEMENT/<STRATEGY>` and
the 7d processor names; `rowCounts: { models, scenarios, sites: 0 }`; groups in order `models`, `scenarios`,
`sites`; ids unique and stable.

## Acceptance criteria

- Given two consecutive runs, when compared, then byte-identical, strict JSON, under 5 MB, the second a cache hit.
- Given every row, when re-loaded and re-run in the JVM, then `expected` is reproduced.
- Given the `scenarios` group, when counted, then every `NodePlacementStrategy` value, every BK alignment and
  straightening value, every flexibility value and each of the five processors has at least one row (state which).
- Given a prefix naming a processor outside the 7b, 7c and 7d sets, when recorded, then the recorder exits 1 naming
  the row unless the row is in `ACCEPTED_REFUSALS` under an N1 category.
- Given `git status`, when inspected, then no landed file under `test/golden/refs/` changed; the recorder is under
  3,000 lines.

## Observability / Rollback

Stderr counters per run: skipped levels, skipped stops not in the plan, accepted refusals, row timeouts (60 s each).
Reversible: revert the commit.
