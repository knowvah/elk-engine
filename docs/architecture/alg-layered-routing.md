<!-- SPDX-License-Identifier: EPL-2.0 -->

# alg.layered, part e: edge routing (mission 7e)

What mission 7e (`layered-edge-routing`, roadmap row 7e) ported of `org.eclipse.elk.alg.layered`: the fifth phase
(`p5edges`, `p5edges.orthogonal` with `direction`, `p5edges.splines`) and the six intermediate processors a routed
result needs, how the oracle rows carry edge geometry and spline segments, which Java recursions became loops, the
Java idioms reproduced, the evidence, and a runbook. Decisions cited are `plans/layered-edge-routing/decisions.md`
(R1–R14); task ids T1–T15 are in that mission's `decision-journal.md`; N-rows are 7d's, C-rows 7c's, B/E-rows 7b's,
L/S/X-rows 7a's, AD-n `plans/elk-engine-skeleton/decisions.md`. Parts a–c are [alg-layered.md](alg-layered.md)
§§ 1–9, part d [alg-layered-placement.md](alg-layered-placement.md); this file is part e because `alg-layered.md` is
at its 500-line limit. The pipeline still does not run (`ElkLayered`, `GraphConfigurator` → 7f): every class is proven
by replaying what the oracle's pipeline recorded at the P5 stop of each router and at each processor. Counts live in
[conformance.md](../conformance.md#alg-layered-routing).

| Section                                          | Answers                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| [1. Package map](#part-e-package-map)            | What 7e ported, where it lives, why the six processors                 |
| [2. Rows and the routing geometry](#part-e-rows) | The two refs, the `edges`/`splines` fields, the `calls` group, the cap |
| [3. Recursion rewrites](#part-e-recursion)       | `dfs`, `addPortPositions`; what was not a recursion                    |
| [4. Java idioms reproduced](#part-e-idioms)      | Laziness, `float xpos`, the shared `Random`, hashed containers         |
| [5. Evidence](#part-e-evidence)                  | Rows, the three invariants, the sweep, anchored cases, coverage        |
| [6. Runbook](#part-e-runbook)                    | Re-recording, the sweep, dumping a case, the Java baseline             |

## 1. Package map {#part-e-package-map}

Java packages are under `org.eclipse.elk.alg.layered`; TS paths under `src/alg/layered/` (AD-7). Section modules
behind a facade (P1) and nested types in prefixed files (M15) as in parts a–d; every split is at a Java method, section,
switch-arm or loop boundary with the Java order and names kept. Counts exclude `*.test.ts`.

| Java package                   | TS directory                   | Ported in 7e (task)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `p5edges`                      | `p5edges`                      | `EdgeRouterFactory` (T10), `OrthogonalEdgeRouter` (T4), `PolylineEdgeRouter` (+ `…InLayer` section; T2 wrote the shared `PRED_EXTERNAL_WEST_OR_EAST_PORT` first, T5 the rest)                                                                                                                                                                                                                                                                                                                                                        |
| `p5edges.orthogonal`           | `p5edges/orthogonal`           | `OrthogonalRoutingGenerator` (+ `…Conflicts`, `…Cycles` sections, `…Tolerance` leaf), `HyperEdgeSegment`, `HyperEdgeSegmentDependency` (+ M15 `…DependencyType`), `HyperEdgeSegmentSplitter` (+ M15 `…FreeArea`, `…AreaRating`), `HyperEdgeCycleDetector` (T4)                                                                                                                                                                                                                                                                       |
| `p5edges.orthogonal.direction` | `p5edges/orthogonal/direction` | `RoutingDirection`, `BaseRoutingDirectionStrategy` (its static `forRoutingDirection` is the module function `…ForRoutingDirection.ts`: a static on the base would import its own subclasses and trip the TDZ), `WestToEast…`, `NorthToSouth…`, `SouthToNorth…` (the last two run only from 7f's hierarchical router) (T4)                                                                                                                                                                                                            |
| `p5edges.splines`              | `p5edges/splines`              | `SplineSegment` (unstaged; + M15 `…EdgeInformation`), `SplinesMath`, `Rectangle`, the router's nested `SplineEdgeRouterDependency`, `SplineEdgeRouterSideToProcess` (T6); `NubSpline` (+ `…Knots`, `…Derivation`, `…Bezier` sections, M15 `…PolarCP`), `NubsSelfLoop` (no caller at this commit, R1) (T7); `SplineEdgeRouter` (+ `…Segments`, `…Ranking` sections) (T8)                                                                                                                                                              |
| `intermediate`                 | `intermediate`                 | the six processors of R1 — `HyperedgeDummyMerger` (+ M15 `…MergeState`), `HierarchicalPortPositionProcessor`, `LayerSizeAndGraphHeightCalculator`, `LongEdgeJoiner`, `NorthSouthPortPostprocessor` (T5), `FinalSplineBendpointsCalculator` (+ `…ControlPoints`, `…Bezier` sections) (T9) — and their arms in the new section `IntermediateProcessorStrategyCreate.ts` (T2, R5: the enum's nine-link `create` chain moved out of the 499-line enum file, switching on `name()`; tally now 7b 10 / 7c 10 / 7d 5 / 7e 6 / 7f 19 / 7g 9) |

Why the six processors (R1): a P5 stop recorded by the oracle is the result of every processor the configuration
ran before it, and a routed result needs those after it: `HyperedgeDummyMerger` (hyperedges, `OrthogonalEdgeRouter.java:65-67`),
`HierarchicalPortPositionProcessor` (every placer's hierarchy addition), `LayerSizeAndGraphHeightCalculator` (the
baseline before P5), `LongEdgeJoiner` (every P3 phase declares it after P5), `NorthSouthPortPostprocessor` (before P5
under SPLINES, after it otherwise) and `FinalSplineBendpointsCalculator` (without it a SPLINES result has no bend
points). The other after-P5 members are recorder refusal categories: `HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER`,
`HYPERNODE_PROCESSOR`, `CONSTRAINTS_POSTPROCESSOR`, the label and comment processors, `END_LABEL_SORTER`,
`HIERARCHICAL_NODE_RESIZER` (7f), `SELF_LOOP_POSTPROCESSOR`, `BREAKING_POINT_REMOVER`, `HORIZONTAL_COMPACTOR` (7g).

## 2. Rows and the routing geometry (R2, R3) {#part-e-rows}

Two refs (recorder `tools/vectors/LayeredRoutingVectors.java`, launcher `tools/vectors/layered-routing-vectors.sh`;
core copied from the 7d recorder with the origin cited, B7): `test/golden/refs/java/layered-routing.json` (group
`models`) and `layered-routing-steps.json` (groups `scenarios`, `sites`, `calls`), each under 5 MiB. The row shape is
7d's with two more members of `expected.geometry` on every row and one on `P5` SPLINES stops:

```text
geometry: { nodes, layers, ports?, labels?,                              // the 7d fields (N3 presence rule)
            graph: { size: HexPair, offset: HexPair },                   // LGraph.getSize(), getOffset()
            edges: { "<edge path>": { bendPoints: [HexPair], junctionPoints?: [HexPair] } },   // every edge of the traversal
            splines?: { "<start edge path>": { chain: [edge paths],      // SPLINE_EDGE_CHAIN
                        route: [{ box: HexQuad, rank, isStraight, xDelta, westOfInitialLayer, centerControlPointY }] } } }
```

`junctionPoints` is present only when the edge has the `JUNCTION_POINTS` property; `splines` only at a `P5` stop under
SPLINES (the `splines.route.start` property itself is excluded from `changed` and the full dump, as the recorder's
`IGNORED_IDS` lists it). A `calls` row ends in `["call", "<Class>.<method>", <args…>]` on an imported inline graph
(args `port`, `node`, `double`, `int`, `boolean`, `enum`, `vector`, `vectors`, `rectangle`, `nubs`) and carries only
`expected.result: { type: double | boolean | vector | rectangle | nubs, value }` (R12). The TS twin
(`test/helpers/layered-routing-replay-{rows,dump,compare,ops}.ts`, T3) always computes `edges` and `splines`, compares
`splines` only when the row carries it, coordinates within 1e-6 (AD-4), orders, counts and booleans exact; it also
twins three recorder rules a landed 7a/7b helper cannot: an element that left the graph encodes as
`{class: "org.eclipse.elk.alg.layered.graph.<Class>"}` and loses its entries (the N/S dummies after
`NORTH_SOUTH_PORT_POSTPROCESSOR`), `EdgeRouting` is registered in the enum registry on import, and `calls` rows are
loaded with their slim shape.

- `models/*` (666): every vendored model at every edge-bearing hierarchy level through the real Java pipeline to
  `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR`, `P5` × {`ORTHOGONAL`, `POLYLINE`, `SPLINES`} at the default placement (BK),
  `LONG_EDGE_JOINER`, `NORTH_SOUTH_PORT_POSTPROCESSOR`, `FINAL_SPLINE_BENDPOINTS_CALCULATOR`,
  `HIERARCHICAL_PORT_POSITION_PROCESSOR` on external-port levels, and `HYPEREDGE_DUMMY_MERGER` + `P4` on the hyperedge
  levels 7d refused; on the variant set the `unnecessaryBendpoints`, `mergeEdges`, `SLOPPY` × layer-spacing-factor,
  `slopedEdgeZoneWidth`, three between-layer spacings and `feedbackEdges` families. The 32 `tests/layered/{splines,
hyperedge_merging,hierarchical_ports}/**` and `tickets/layered/{726,341,371}` inputs are vendored
  (`LAYERED_ROUTING_INPUTS`; ticket 341 has no rows: `elk.direction: UP` puts `GraphTransformer` first).
- `scenarios/*` (94) and `sites/*` (25): step rows whose chains run the plan the pipeline would run (eleven graph
  shapes × three routers, the option and spacing families, the six processors; `ROUTING_CROSSCHECK=1` proves each
  scenario chain equals its pipeline twin); the site rows are T11's branch scenarios (T13).
- `calls/*` (158): the five `NubsSelfLoop` factories, `SplinesMath`, `Rectangle` and `NubSpline` methods on concrete
  arguments, incl. the four extreme-point statics that have no Java caller.
- **The variant set and the cap (R2).** An untrimmed `models` file measured 11.4 MB: the variant families run on four
  models (`ptolemy-producer`, `splines-sloppy_curvature`, `ticket-371`, `hyperedge_merging-north_south_ports_01`), the
  ptolemy `P5/POLYLINE`, `P5/SPLINES` and SPLINES `FINAL_SPLINE_BENDPOINTS_CALCULATOR` rows and the `LONG_EDGE_JOINER`
  stops are recorded on the trim set only; the file is 5,190,239 bytes (52,641 under the cap). The steps file is
  1,734,502 bytes.
- Six `hierarchical_ports` levels (hierarchy03–07, 09 / `Compound`) throw a `NullPointerException` in the oracle under
  POLYLINE and SPLINES (only the orthogonal router adds `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR`); the recorder lists
  them in `ORACLE_THROWS` and skips them, every other throw still stops a recording.

## 3. Recursion rewrites (R8, B8) {#part-e-recursion}

| Java                                                                                                                                         | Verdict                                                                  | TS shape                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `HyperedgeDummyMerger.dfs` (`HyperedgeDummyMerger.java:238`)                                                                                 | true recursion over the ports of one hyperedge (the planning scan's one) | explicit-stack loop reproducing the visit and `index` order; a verbatim twin agrees on all 51 hyperedge rows, a 100-dummy chain and a 5,000-port chain under `--jitless` |
| `HyperEdgeSegment.addPortPositions` (`HyperEdgeSegment.java:141`)                                                                            | a second true recursion the plan missed, once per connected port         | explicit stack of connected-port iterators with the lazy `containsKey` test; twin-proven on a 100-rung ladder, walked at 20,000 rungs                                    |
| `recomputeExtent`, `union`, `convertKVectorToString`, `getPointOnCurve`                                                                      | overload pairs                                                           | TS overloads or suffixed names (§ 6.5)                                                                                                                                   |
| `split`, `breakCriticalCycles`, `updateDependencies`, `findAndAddSuccessor`, `insertKnot`, `generateDerivedNUBS`, `fixCoordinates`, `joinAt` | loop calls                                                               | plain loops                                                                                                                                                              |

## 4. Java idioms the port had to reproduce {#part-e-idioms}

- **Class-initialisation laziness (E1 as R4).** Every router's static `LayoutProcessorConfiguration` is a cached
  static getter; `EdgeRouterFactory.factoryCache` is a static `Map`; the predicate the three routers share is a static
  function; `EdgeRouterFactory` joined the entry-point fitness test with no further lazy read (`EdgeRouting` is a core
  leaf enum, so the melk push-forward did not trigger). The enum's `create` chain lives in a section that imports the
  enum as a type only (R5).
- **Numeric idioms (R6).** `OrthogonalEdgeRouter.process` accumulates `xpos` in a Java `float`: every `+=` goes through
  `Float32.add` and the final width widens; `(int) Math.signum` through `d2i`; the boxed-double streams of the generator
  and the splitter keep `Double.compareTo`/`equals` semantics through the `DoubleCompare` shim; `DecimalFormat("#0.0")`
  in `Rectangle.toString` and `SplinesMath.convertKVectorToString` is a local one-decimal HALF_EVEN formatter (prose
  only; `Intl.NumberFormat` is a valid twin on exact ties only); Java `assert` lines omitted with a comment naming the
  line; a Java unboxing of a nullable property (`SPLINE_NS_PORT_Y_COORD` in `SplineSegment.anchorY` and the bend-point
  calculator) is an explicit null check throwing `TypeError`. No boxed `==` exists in the 7e Java (C6 audit per task).
- **Randomness (R7).** `HyperEdgeCycleDetector.computeLinearOrderingMarks` and `SplineEdgeRouter.breakCycles` draw
  `nextInt(bound)` from `InternalProperties.RANDOM`; rows keep seed 1 and replay the whole recorded prefix; the `tie`
  site rows record seeds 1 and 4096 (seeds 1–40 all draw the same first `nextInt(2)`).
- **Hashed containers (R9, AD-10).** `SplineSegment.edges` and the `upEdges`/`downEdges` `HashSet<Pair<…>>` of the
  spline router are insertion-ordered `Set`s. The JVM order of the `Pair` set (two identity hashes mixed) proved
  **unobservable** in 7e: every multi-edge segment on the rows has exactly two edges and the bend-point calculator's
  per-edge bodies are independent (a reversal test pins it); the other consumer, `getSplinePath` under a compaction
  strategy, is 7g's to recheck. `createdJunctionPoints` uses `KVector.equals` semantics, membership only;
  `Sets.newTreeSet(segments)` by `mark`; the lookup maps are plain `Map`s. `-XX:hashCode=2` stays on the recorder.
- **Quirks kept.** `HyperEdgeSegment.insertSorted` compares a `floatValue()` against the exact double, so a non-float
  coordinate is inserted twice; `Rectangle.union(Collection)` unions into the collection's first element and returns
  the untouched copy; `NubSpline.generateNiceCurve` adds one `KVector` object three times; `createUniformKnotVector`
  reads the field, not its parameter; `computeSloppyCenterY` tests `getSource() != null` but reads the target's node;
  `edgeToSegmentMap` is never cleared between runs; the `JUNCTION_POINTS == null` arms are dead because `getProperty`
  stores a clone of the cloneable default. `DebugUtil.logDebugGraphHyperedges` (staged, 7f) stays behind its logging
  guard.

## 5. Evidence {#part-e-evidence}

| Layer                         | What                                                                                                                                                                                                                                                                                                             | Replay / test                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Routing rows (T1, T13)        | `layered-routing.json` 666 `models` rows (5,190,239 bytes) and `layered-routing-steps.json` 94 `scenarios` + 25 `sites` + 158 `calls` (1,734,502 bytes), JDK 21.0.1, oracle `8aaa3c14`, byte-stable; every class also proven on its own rows with the class injected (T4–T9)                                     | `src/alg/layered/LayeredRoutingVectors.test.ts` replays all 943 by name through `EdgeRouterFactory` and the real enums in about 5–6 s (T10)                                                                                                                                                                                                                                          |
| Ported JUnit invariants (T10) | `BasicEdgeRouterTest.checkEdgeRouteIsOrthogonal` (orthogonal configurator only, as upstream) over the 97 `P5/ORTHOGONAL` model rows, `Issue726Test` on the ticket's row, `LayerSizeAndGraphHeigthCalculatorTest.testAllNodesContained` over the 97 calculator rows, each verbatim (R10)                          | 575 edges (150 with bend points) and 727 nodes pass; the Java suites on the oracle: `runs=550 / 550 / 1 failures=0` at mission start and end                                                                                                                                                                                                                                         |
| Breadth sweep (T12, R11)      | `tools/oracle/routing-sweep.sh`: 6,728 oracle cases (1,682 edge-bearing ptolemy levels × `P4` BK, `P5/ORTHOGONAL`, `P5/POLYLINE`, `FINAL_SPLINE_BENDPOINTS_CALCULATOR/SPLINES`), 6,280 ok, 448 `SELF_LOOP_PREPROCESSOR` refusals, 0 throws, 0 timeouts, about 34 s; the modes live in `LayeredRoutingSweep.java` | `test/corpus/routing-sweep.test.ts`: 3,140 cases at stride 2 in about 60–75 s (all 6,280 with `ROUTING_SWEEP_STRIDE=1`, about 180 s), 0 mismatches                                                                                                                                                                                                                                   |
| Anchored unit tests (T14a–b)  | one colocated case per site and call row of `plans/layered-edge-routing/unreached.md`, `// oracle: <row id>; <Java file:line>`                                                                                                                                                                                   | 62 cases over 14 files (T14a 20: the eight orthogonal carriers, the self loops, hierarchical port position, empty layers, the merger; T14b 42: the NURBS extreme points and construction, rectangle extents, the self-loop factories, the spline dependency cycles and nesting, the compaction rows) plus 22 structural cases; 22 mutations checked; every S row of the map is cited |

**Coverage.** Replay-alone coverage of the 7e classes before the site rows (T11): 309 of 1,005 branches untaken and 94
of 439 functions uncovered, classified once each: 172 S (20 scenarios), 164 J, 63 U, 4 X; after T13's 60 rows two
compaction arms moved to U (170 S / 164 J / 65 U / 4 X). After the 60 rows and the anchored cases, per-class branch coverage with the generic replay and the class tests is 100 % for 20 of the 46 files; below 90 % only `HyperedgeDummyMerger` (77.1, the 7f label-dummy arms), `LongEdgeJoiner` (80, two dead arms), `BaseRoutingDirectionStrategyForRoutingDirection` (75, the dead default and the 7f arms), `FinalSplineBendpointsCalculator.ts` (89.7, `inverseOrder` and the far arms) and the two N/S direction strategies (0, 7f); the final partition is S 170 / J 164 / U 65 / X 4. Whole-suite coverage after batch 8:
98.86 / 96.88 / 99.01 / 98.86 (lines / branches / functions / statements).

**Divergences found and fixed before commit (none reached the oracle rows).** `SplineSegment.anchorY` let a null
`SPLINE_NS_PORT_Y_COORD` flow silently where the Java NPEs (explicit check added, AD-16); the landed 7a context encoded
a removed node as a fresh `ref` and the enum registry lacked `EdgeRouting` (both twinned in the 7e helpers); a T8 draft
asserted `isStraight(10, 10.2)` by hand and was wrong in floating point (replaced by a twin, L4). No numeric divergence
between the port and the oracle surfaced in 943 rows and 6,280 sweep cases.

## 6. Runbook {#part-e-runbook}

```bash
tools/vectors/layered-routing-vectors.sh test/golden/refs/java   # both refs; byte-stable, cached by salted input hash
git status --short test/golden/refs/java                         # must show nothing for a same-JDK re-record
tools/oracle/routing-sweep.sh [--force]                          # test/corpus/.routing-sweep/results.jsonl (≈35 s JVM, gitignored)
ROUTING_SWEEP_STRIDE=1 npx vitest run test/corpus/routing-sweep.test.ts   # every ok case (≈180 s; stride 2 ≈60–75 s)
tools/oracle/routing-sweep.sh --dump <case id> <outDir>          # one full row for a mismatch (LayeredRoutingSweep --dump)
MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh org.eclipse.elk.alg.layered.p5edges.BasicEdgeRouterTest \
  org.eclipse.elk.alg.layered.intermediate.LayerSizeAndGraphHeigthCalculatorTest org.eclipse.elk.alg.layered.issues.Issue726Test   # 550/550/1, 0 failures (≈40 s)
```

The recorder is one JDK 21 single-file launcher of at most 3,000 lines (2,998 after T13: the next change needs a
decision) with `-XX:+UnlockExperimentalVMOptions -XX:hashCode=2 -XX:-OmitStackTraceInFastThrow`; the sweep and dump
modes are a subclass compiled together with it by `routing-sweep.sh`. Its diagnosis aids (`ROUTING_FILTER`,
`ROUTING_DISCOVER`, `ROUTING_MARKERS`, `ROUTING_CROSSCHECK`, `ROUTING_STATS`, `ROUTING_CAP_MB`) are documented in its
header.

| Failure                                              | Detection                                                                     | Fix                                                                                                                                                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `geometry edges <path> bendPoints` differs by > 1e-6 | a replay, sweep or anchored-case diff naming an edge, node, layer or segment  | a port defect: `--dump` the case, trace the first departure to its Java line (the default stance is "my port differs"); never widen the tolerance (AD-4) or re-record the row (AD-13) |
| Recorder exits 1 naming a row                        | `refusal OUTSIDE …`: a plan member outside the 7b–7e sets and R1's categories | a later mission's processor reached the plan: add it to the mission that ports it, never to `ACCEPTED_REFUSALS` outside an R1 category (stop 5)                                       |
| Oracle `NullPointerException` on a level             | the recorder's throw report naming `AdjacencyList`                            | the six hierarchical-port levels under POLYLINE/SPLINES are in `ORACLE_THROWS`; any other throw is a new finding, not a skip                                                          |
| `ReferenceError … before initialization`             | the entry-point fitness test after wiring an arm                              | the E1 recipe: cached static configuration getter, in-function enum read, type-only enum import in a section; never an entry-order import (stop 15)                                   |
| `java-tests.sh` prints `runs=1 failures=1`           | JUnit's `initializationError`: the class could not load                       | `MODELS_REPO` is unset or the name misspelled; set `MODELS_REPO=$ELK_MODELS_DIR`                                                                                                      |
| `output is … bytes, over the 5 MB cap`               | the recorder's size check after a new row family                              | trim per R2's order, or take a cap decision; `ROUTING_CAP_MB` measures only                                                                                                           |
| Recorder over 3,000 lines                            | the launcher's line check                                                     | 2 lines of headroom remain: a second launcher (the sweep's pattern) or a cap decision                                                                                                 |
