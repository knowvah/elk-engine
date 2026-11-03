<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Oracle recorder `LayeredRoutingVectors`

**Agent:** java-architect (sonnet) · **Commit:** `test(T1): record layered routing vectors from the oracle`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T1/`.

## Context

Mission 7e (README), R1–R3, R7, R12. Edge routing and the six processors around it need oracle expectations recorded
**before** the TS exists (AD-13, L4). `tools/vectors/LayeredPlacementVectors.java` (7d, 2,972 lines, landed, never
edited) drives the oracle's `ElkLayered` whitebox API (`J/ElkLayered.java:407` `prepareLayoutTest`, `:507`
`runLayoutTestStep`, `:525` `getLayoutTestConfiguration`) for pipeline rows and interprets step rows; this task copies
its core into a new launcher (B7: one file, origin cited in the header) and extends it to the P5 stops, the six
processors, the routing geometry and a `calls` group. Read the 7d recorder's header (lines 1–135) first: row kinds,
step ops, positional paths, `expected`, the refusal rule, the N3 presence rule, `-XX:hashCode=2`, the diagnosis
aids; and its `.sh` for the classpath and cache namespace. `.agent-notes/layered-node-placement.md` lists the plan
shapes, hangs and guards you will meet (a port with two or more edges puts `HYPEREDGE_DUMMY_MERGER` in the plan).

## Task

1. **`tools/vectors/LayeredRoutingVectors.java`**, JDK 21 single-file launcher: copy lines 1–1,822 of the 7d
   recorder (through `pipeline(...)`) and 1,926–2,075 (the ELK JSON builders `S` … `opt`); the 7d variant builders
   (`placement`, `seeded`, `variantRows`, `modelSpecs`, 1,823–1,925) and scenario builders (2,076–2,480) are **not**
   copied. Same header structure, same `importGraph(target)`, `normalise`, step interpreter, C4 encoding, re-run and
   build-twice checks, strict parse, size check **per output file**. Changes: `runPhase` also accepts
   `P5_EDGE_ROUTING` with an `EdgeRouting` name (the class `EdgeRouterFactory.factoryFor(r).create()` returns,
   `J/p5edges/EdgeRouterFactory.java:48-70`); `stopClass` accepts `P5` and any `IntermediateProcessorStrategy`
   member; the allowed set is the 7b ten + the 7c ten + the 7d five + the 7e six (`HYPEREDGE_DUMMY_MERGER`,
   `HIERARCHICAL_PORT_POSITION_PROCESSOR`, `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR`, `LONG_EDGE_JOINER`,
   `NORTH_SOUTH_PORT_POSTPROCESSOR`, `FINAL_SPLINE_BENDPOINTS_CALCULATOR`) + the P1–P5 phases. `REFUSAL_CATEGORIES`
   = 7d's list minus `HYPEREDGE_DUMMY_MERGER`, plus R1's after-P5 members. `ACCEPTED_REFUSALS` lists each refused
   `<model>/<target or root>/<first refused member>`; a plan member outside every set exits 1 naming the row. A stop
   the plan does not contain skips the row (counted on stderr).
2. **`expected`** = 7d's (`layers`, `layerless`, `hidden`, `edges`, `ports`, `changed`, `geometry` with N3's rule)
   plus, on every row, `geometry.graph = { size, offset }` (`LGraph.getSize()`, `getOffset()`) and `geometry.edges =
   { "<edge path>": { bendPoints: [HexPair], junctionPoints?: [HexPair] } }` for every edge of the traversal (same
   order and paths as `expected.edges`; `junctionPoints` from `LayeredOptions.JUNCTION_POINTS`, key absent when the
   edge has no such property); on a `P5` SPLINES stop also `geometry.splines = { "<start edge path>": { chain:
   [edge paths], route: [{ box: HexQuad (x, y, width, height), rank, isStraight, xDelta: Hex, westOfInitialLayer,
   centerControlPointY: Hex }] } }` from `InternalProperties.SPLINE_EDGE_CHAIN` and `SPLINE_ROUTE_START`
   (`J/options/InternalProperties.java:385-397`, `J/p5edges/splines/SplineSegment.java:60-121`; read the public
   fields reflectively). Step rows under ten nodes keep the full 7a dump. Doubles as 16 hex digits.
3. **Group `models`** (`models/<model>/<target or root>/<stop>/<variant>`), file `layered-routing.json`: every
   vendored model at every edge-bearing hierarchy level (7b's level rule), per R2: `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR`;
   `P5` × {`ORTHOGONAL`, `POLYLINE`, `SPLINES`} (variant = the routing name; `org.eclipse.elk.edgeRouting`);
   `LONG_EDGE_JOINER` (ORTHOGONAL), `NORTH_SOUTH_PORT_POSTPROCESSOR` and `FINAL_SPLINE_BENDPOINTS_CALCULATOR` where
   the plan has them (variant = the routing name); `HIERARCHICAL_PORT_POSITION_PROCESSOR` on external-port levels;
   `HYPEREDGE_DUMMY_MERGER` and `P4` (`BRANDES_KOEPF`) on the hyperedge levels (7d's 14 accepted
   `HYPEREDGE_DUMMY_MERGER` refusals, `LayeredPlacementVectors.java:187-220`, and every vendored 7e model with a
   hyperedge port). Variant families on the **variant set** (three smallest flattened ptolemy models + the vendored
   7e `.elkt`; measure, then trim per R2 and journal): `org.eclipse.elk.layered.unnecessaryBendpoints=true`
   (ORTHOGONAL); `…layered.edgeRouting.splines.mode=SLOPPY` × `…splines.sloppy.layerSpacingFactor` {default, 0.6};
   `…layered.edgeRouting.polyline.slopedEdgeZoneWidth` {default, 0.0}; `…layered.mergeEdges=true` (ORTHOGONAL: the
   merger joins the plan); `…layered.spacing.edgeEdgeBetweenLayers`, `…spacing.edgeNodeBetweenLayers`,
   `…spacing.nodeNodeBetweenLayers` at one non-default value each; `…layered.feedbackEdges=true`. Option ids as in
   `src/alg/layered/options/LayeredOptions.ts` (`EDGE_ROUTING` getter `:639`, `EDGE_ROUTING_SPLINES_MODE` `:522`,
   `…SLOPPY_LAYER_SPACING_FACTOR` `:531`, `…POLYLINE_SLOPED_EDGE_ZONE_WIDTH` `:1549`, `UNNECESSARY_BENDPOINTS` `:969`,
   `MERGE_EDGES` `:1103`, the spacings `:241-263`, `FEEDBACK_EDGES` `:1154`). Default placement (BK) on every row:
   7d proves the placers.
4. **Vendor** `tests/layered/splines/**` (12), `tests/layered/hyperedge_merging/**` (8; `hyperedge_labels.elkt` and
   `unequal_src_tgt_with_labels.elkt` carry edge labels and become `LABEL_DUMMY_INSERTER` accepted refusals, their
   before-P2 stops excluded), `tests/layered/hierarchical_ports/**` (9) and `tickets/layered/{726_edgesMissingBendPoints,
   341_polylineUnnecessaryBendpoints,371_strangeSplineSpacing}.elkt` from `$ELK_MODELS_DIR` byte-identical, manifest
   rows the 7a way (`test/golden/inputs/manifest.json`, pinned commit `ac5af2ba…`), and a `LAYERED_ROUTING_INPUTS`
   list beside `LAYERED_PLACEMENT_INPUTS` in `test/golden/algorithm-refs.test.ts:86` (extend the "nothing else"
   assertion at `:225-226` and its title). Pin every vendored input in `MODEL_TABLE` (the `.sh` checks the same lines).
5. **Group `scenarios`** (`scenarios/<class>/<name>`), file `layered-routing-steps.json`, inline `elk`, steps
   `importGraph`, `normalise`, `runPhase P1_CYCLE_BREAKING GREEDY`, `runPhase P2_LAYERING NETWORK_SIMPLEX`,
   `runPhase P3_NODE_ORDERING LAYER_SWEEP`, the before-P4 and before-P5 processors a pipeline would run in enum order
   (`J/intermediate/IntermediateProcessorStrategy.java`; `HYPEREDGE_DUMMY_MERGER` on hyperedge graphs under
   ORTHOGONAL, `NORTH_SOUTH_PORT_POSTPROCESSOR` before P5 under SPLINES), `runPhase P4_NODE_PLACEMENT BRANDES_KOEPF`,
   then `runPhase P5_EDGE_ROUTING <R>` and the after-P5 processors to the stop, `dump`. At least two small graphs
   (3–10 nodes) per routing, per variant family, per processor; among them long edges (dummies), hyperedges (a port
   with two or more edges; `mergeEdges`), north/south ports, inverted ports, external ports, in-layer edges
   (`PolylineEdgeRouter.java:392-462`), a graph with no edges and one with no layers (`SplineEdgeRouter.java:186`),
   feedback edges, both spline modes. Scenario options live in the graph's `layoutOptions` so `ROUTING_CROSSCHECK=1`
   can run each as a pipeline row and compare (7d's `PLACEMENT_CROSSCHECK`).
6. **Group `calls`** (`calls/<Class>/<name>`, same file): a step row whose last step is
   `["call", "<Class>.<method>", <args…>]` after `importGraph`; args are `["port", "<path>"]`, `["double", Hex]`,
   `["boolean", b]`, `["enum", "<Type>.<NAME>"]`; `expected.result = { type, value }` with `type` one of `double`,
   `boolean`, `vector` (HexPair), `rectangle` (HexQuad `top, right, bottom, left` as `J/p5edges/splines/Rectangle.java`
   stores them), `nubs` (`{ controlPoints: [HexPair], knotVector: [Hex], dim, outerBox: HexQuad, firstLabelPosition?:
   HexPair }`). Record the five `NubsSelfLoop` factories (`J/p5edges/splines/NubsSelfLoop.java:127,158,233,266,298`)
   on ports of each side with two sizes and label-size variants, `SplinesMath.intersect`/`innerAngle`/
   `lengthToOrthogonal`/`portSideToDirection`/`distPortToNodeEdge`/`isBetween`/`getMarginOnPortSide`
   (`:67-296`) and `Rectangle.union`/`enlarge`/`getFromPortSide`/`toNodeMargins` (`:148-307`) on a few inputs
   each, and `NubSpline.getPointOnCurve`, `generateDerivedNUBS`, `generateInvertedNUBS`, `toBezier`
   (`:189-240,688-760`) on three control-point chains. T13 adds more.
7. **`tools/vectors/layered-routing-vectors.sh`:** the 7d script's structure, cache namespace `layered-routing`, same
   `THIRD_PARTY` list and JVM flags, writes both refs; `shellcheck -x` clean; byte-identical on a second run.
   Diagnosis aids as 7d's, prefixed `ROUTING_` (`ROUTING_FILTER`, `ROUTING_DISCOVER`, `ROUTING_MARKERS`,
   `ROUTING_CROSSCHECK`, `ROUTING_STATS`, `ROUTING_CAP_MB`).

## Write-set

`tools/vectors/{LayeredRoutingVectors.java,layered-routing-vectors.sh}`, `test/golden/refs/java/{layered-routing,
layered-routing-steps}.json`, `test/golden/inputs/tests/layered/{splines,hyperedge_merging,hierarchical_ports}/**`,
`test/golden/inputs/tickets/layered/{726,341,371}_*.elkt`, `test/golden/inputs/manifest.json`,
`test/golden/algorithm-refs.test.ts`.

## Read-set

`tools/vectors/{LayeredPlacementVectors.java,layered-placement-vectors.sh}` (read only), `J/ElkLayered.java:400-530`,
`J/GraphConfigurator.java:55-80,120-130,175-185,220-232,265-280`, `J/p5edges/{EdgeRouterFactory,OrthogonalEdgeRouter,
PolylineEdgeRouter}.java` (the configurations: `:59-216`, `:60-200`), `J/p5edges/splines/SplineEdgeRouter.java:77-182`
and `:183-315` (what `process` leaves on the graph), `J/p5edges/splines/SplineSegment.java:54-145`,
`J/p5edges/splines/{NubsSelfLoop,NubSpline,SplinesMath,Rectangle}.java` (public signatures only),
`J/intermediate/{HyperedgeDummyMerger,HierarchicalPortPositionProcessor,LayerSizeAndGraphHeightCalculator,
LongEdgeJoiner,NorthSouthPortPostprocessor,FinalSplineBendpointsCalculator}.java` (headers and `process`),
`J/options/InternalProperties.java:350-420`, `JT/p5edges/BasicEdgeRouterTest.java`, `JT/issues/Issue726Test.java`,
`test/golden/inputs/manifest.json`, `decisions.md` R1–R3, R7, R12, `.agent-notes/layered-node-placement.md`,
`.agent-notes/layered-crossing-min.md`.

## Architecture decisions

R1 (scope and refusal categories), R2 (stops, variant set, two refs, trimming order), R3 (geometry), R7 (seed 1,
whole prefix), R12 (`calls` shape), AD-10 (`-XX:hashCode=2`), B7 (single-file launcher ≤ 3,000 lines), R14.

## Interface contract (output, consumed by T3–T14)

7d's row format exactly (`id`, `group`, `input`, `target`, `options`, `steps`, `prefix`, `expected`) with
`expected.geometry` as in step 2 (`graph` and `edges` on every row; `splines` only on `P5` SPLINES stops; `ports`/
`labels` per N3), `runPhase`'s first argument also allowing `P5_EDGE_ROUTING` with an `EdgeRouting` name, prefix
entries `P5_EDGE_ROUTING/<ROUTING>` and the 7e processor names, the `call` step and `expected.result` as in step 6;
`rowCounts: { models }` in the first file and `{ scenarios, sites: 0, calls }` in the second; ids unique and stable
across both files.

## Acceptance criteria

- Given two consecutive runs, when compared, then both files byte-identical, strict JSON, each under 5 MiB, the
  second a cache hit.
- Given every row, when re-loaded and re-run in the JVM, then `expected` is reproduced.
- Given the `scenarios` and `calls` groups, when counted, then every routing, every variant family, each of the six
  processors and each listed method has at least one row (state which).
- Given a prefix naming a processor outside the 7b–7e sets, when recorded, then the recorder exits 1 naming the row
  unless the row is in `ACCEPTED_REFUSALS` under an R1 category.
- Given `git status`, when inspected, then no landed file under `test/golden/refs/` changed; the recorder is under
  3,000 lines.

## Observability / Rollback

Stderr counters per run: skipped levels, skipped stops not in the plan, accepted refusals, bytes per row family
(`ROUTING_STATS=1`), row timeouts (60 s each). Reversible: revert the commit.
