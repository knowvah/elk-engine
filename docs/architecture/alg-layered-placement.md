<!-- SPDX-License-Identifier: EPL-2.0 -->

# alg.layered, part d: node placement (mission 7d)

What mission 7d (`layered-node-placement`, roadmap row 7d) ported of `org.eclipse.elk.alg.layered`: the fourth phase
(`p4nodes`, `p4nodes.bk`) and the five intermediate processors a P4 stop needs, how the oracle rows carry geometry,
which Java recursions became loops, the Java idioms reproduced, the evidence, and a runbook. Decisions cited are
`plans/layered-node-placement/decisions.md` (N1–N12); task ids T1–T13 are in that mission's `decision-journal.md`;
C-rows are 7c's, B/E-rows 7b's, L/S/X-rows 7a's, AD-n `plans/elk-engine-skeleton/decisions.md`. Parts a–c are
[alg-layered.md](alg-layered.md) §§ 1–9; this file is part d because that file is at its 500-line limit. The pipeline
still does not run (`ElkLayered`, `GraphConfigurator` → 7f): every class is proven by replaying what the oracle's
pipeline recorded at the P4 stop and at each processor. Counts live in
[conformance.md](../conformance.md#alg-layered-placement).

| Section                                       | Answers                                                          |
| --------------------------------------------- | ---------------------------------------------------------------- |
| [1. Package map](#part-d-package-map)         | What 7d ported, where it lives, why the five processors          |
| [2. Rows and the geometry dump](#part-d-rows) | The placement row format, the N3 presence rule, the 5 MiB cap    |
| [3. Recursion rewrites](#part-d-recursion)    | `placeBlock`, `fillSegment`, `follow`; what was not a recursion  |
| [4. Java idioms reproduced](#part-d-idioms)   | Laziness, numeric casts, hashed containers, logging, `DebugUtil` |
| [5. Evidence](#part-d-evidence)               | Rows, the invariant, the sweep, anchored cases, coverage         |
| [6. Runbook](#part-d-runbook)                 | Re-recording, the sweep, dumping a case, the Java baseline       |

## 1. Package map {#part-d-package-map}

Java packages are under `org.eclipse.elk.alg.layered`; TS paths under `src/alg/layered/` (AD-7). Section modules
behind a facade (P1) and nested types in prefixed files (M15) as in parts a–c; every split is at a Java method, section,
switch-arm or loop boundary with the Java order and names kept. Counts exclude `*.test.ts`.

| Java package   | TS directory   | Ported in 7d (task)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `p4nodes`      | `p4nodes`      | `SimpleNodePlacer`, `InteractiveNodePlacer`, `LinearSegmentsNodePlacer` (+ `…Creation`, `…Balancing`, `…PostProcess` sections; M15 `…LinearSegment`, `…Mode`, `…Properties` for the two private `Property<Integer>`s) (T5); `NetworkSimplexPlacer` (+ `…State`, `…Constants`, `…FlexibleNode`, `…GraphBuilding`, `…AuxiliaryEdges`, `…Weights`, `…StraightEdges`, `…Paths`, `…Apply` sections; M15 `…NodeRep`, `…EdgeRep`, `…Path`) (T7); the five `NodePlacementStrategy` arms create them (T8) |
| `p4nodes.bk`   | `p4nodes/bk`   | all 7: `BKNodePlacer` (+ `…Conflicts`, `…Balancing`, `…Feasibility`, `…Debug` sections), `BKAligner`, `BKCompactor` (+ M15 `…ClassNode`, `…ClassEdge`), `BKAlignedLayout` (+ M15 `…HDirection`, `…VDirection`), `ThresholdStrategy` (+ M15 `…NullThresholdStrategy`, `…SimpleThresholdStrategy`, `…Postprocessable`), `NeighborhoodInformation` (+ M15 `…NeighborComparator`), `ICompactor` (T6)                                                                                                 |
| `intermediate` | `intermediate` | the five processors of N1 — `InnermostNodeMarginCalculator`, `LabelAndNodeSizeProcessor`, `InLayerConstraintProcessor`, `HierarchicalPortDummySizeProcessor`, `NodePlacementRepeater` (T4) — and their `IntermediateProcessorStrategy` arms (T8; tally now 7b 10 / 7c 10 / 7d 5 / 7f 25 / 7g 9)                                                                                                                                                                                                  |
| (root)         | `.`            | `DebugUtil` **staged** for 7f (N8, L1): its three `logDebugGraph` overloads (`logDebugGraphSlot`, `logDebugGraphSegments`, `logDebugGraphHyperedges`) throw naming `DotDebugUtil` and 7f; the guarded call in `LinearSegmentsNodePlacer` stays verbatim                                                                                                                                                                                                                                          |

Why the five processors (N1): a P4 stop recorded by the oracle is the result of every processor the configuration ran
after P3, so the set a 7d replay needs is what the baseline always runs before P4 (`INNERMOST_NODE_MARGIN_CALCULATOR`,
`LABEL_AND_NODE_SIZE_PROCESSOR`, `GraphConfigurator.java:62-63`), what every P3 phase declares before P4
(`IN_LAYER_CONSTRAINT_PROCESSOR`), what external ports add (`HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR`) and what the
flexibility recompute option adds after P4 (`NODE_PLACEMENT_REPEATER`). The other before-P4 members are recorder
refusal categories: the label processors, `COMMENT_NODE_MARGIN_CALCULATOR` and `ALTERNATING_LAYER_UNZIPPER` (7f),
`HYPEREDGE_DUMMY_MERGER` (7e), the self-loop, wrapping and breaking-point processors (7g), with 7c's five before-P3
categories. `HIERARCHICAL_PORT_POSITION_PROCESSOR` (every placer's hierarchy addition, declared before P5) and
`LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR` stay 7e; the placers' `HIERARCHY_PROCESSING_ADDITIONS` getters reference
the enum member only.

## 2. Rows and the geometry dump (N2, N3) {#part-d-rows}

`test/golden/refs/java/layered-placement.json` (recorder `tools/vectors/LayeredPlacementVectors.java`, launcher
`tools/vectors/layered-placement-vectors.sh`; core copied from the 7c recorder's first 1,926 lines with the origin
cited, B7) has the 7c row shape with one more member of `expected`:

```text
geometry: { nodes: { "<node path>": { pos: HexPair, size: HexPair, margin: HexQuad } },   // every node of the traversal
            layers: [HexPair],                                                           // Layer.getSize() in layer order
            ports?: { "<port path>": { pos: HexPair } }, labels?: { "<label path>": { pos: HexPair } } }
```

`nodes` and `layers` are on every row; `ports` and `labels` only when the stop moves them (`LABEL_AND_NODE_SIZE_PROCESSOR`,
`HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR`) or the imported graph holds a node with `NodeFlexibility != NONE` (sticky
over the steps), else the keys are absent. Margins are `(top, right, bottom, left)` as `ElkMargin`'s fields. The TS
twin (`test/helpers/layered-placement-replay-{rows,dump,compare,ops}.ts`, T3) always computes `ports` and `labels`
and compares them only when the recorded row carries them; coordinates compare within 1e-6 (AD-4), everything else
exactly; rows under ten nodes also carry the full 7a dump.

- `models/*` (494): every vendored model at every edge-bearing hierarchy level through the real Java pipeline to the
  P4 class per `NodePlacementStrategy` (`SIMPLE`, `INTERACTIVE` with the 7c seeded positions, `LINEAR_SEGMENTS`,
  `BRANDES_KOEPF`, `NETWORK_SIMPLEX`) and to each of the five processors; on the variant set also the BK straightening
  × alignment matrix (12), `favorStraightEdges=false`, one `deflectionDampening`, and the three flexibility defaults
  with and without `recomputeNodePlacement` (the repeater stop). The 22 `tests/layered/node_placement/**` `.elkt`
  inputs are vendored (manifest rows, `LAYERED_PLACEMENT_INPUTS`).
- `scenarios/*` (84) and `sites/*` (26): step rows of the recorder's interpreter whose chains run the plan the
  pipeline would run (the three layer-constraint processors, `TWO_SIDED_GREEDY_SWITCH`, the before-P4 processors;
  `PLACEMENT_CROSSCHECK=1` proves each chain equals its pipeline twin), two or more graphs per strategy, per BK
  configuration, per flexibility value and per processor; the site rows are T9's branch scenarios.
- **The variant set and the cap.** The row format's `changed` list is about two thirds of a row, and an untrimmed
  variant set (three ptolemy models plus every `.elkt`) measured 12.4 MB against the 5 MiB cap (stop 13). The variant
  set is therefore one ptolemy model (`producer`; the other two smallest are hyperedge refusals) plus three `.elkt`
  (`flexible_ports-graph01`, `graph03`, `bk-classes-classes_leftdown`), and the BK matrix runs on `producer` and
  `classes_leftdown` only; the full matrices live in `scenarios`. The file is 5,242,236 bytes, 644 under the cap
  (follow-up in the roadmap).
- Flat levels only (C3); a port carrying two or more edges puts `HYPEREDGE_DUMMY_MERGER` (7e) in the plan, which
  refuses most ptolemy P4 rows until 7e.

## 3. Recursion rewrites (N6, B8) {#part-d-recursion}

Each candidate was confirmed against the Java first; a true recursion became a loop proven against a verbatim
recursive twin in the test file on every row graph and on a 5,000-deep chain under `--pool=forks --execArgv=--jitless`
(the twins themselves overflow at that depth with and without the JIT).

| Java                                               | Verdict                                                                     | TS shape                                                                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BKCompactor.placeBlock` (`BKCompactor.java:208`)  | true recursion over neighbouring blocks' roots, **one** call site (not two) | explicit stack of frames (root, current node, threshold, neighbour, a `descended` flag); `calculateThreshold` runs after the former call on resume |
| `LinearSegmentsNodePlacer.fillSegment` (`:466`)    | true recursion along a long edge's dummies, no work after a successful call | a plain loop over the chain (a failed call has no side effect, so the caller moves to its next successor)                                          |
| `NetworkSimplexPlacer.follow` (`:1248`)            | true tail recursion along a path of long-edge dummies                       | `for (;;)` loop: add the edge, apply the three stop criteria, mark visited, take the first other handled edge                                      |
| `NetworkSimplexPlacer.getEdgeWeight` (`:796/:803`) | an overload pair (`LEdge` / two `NodeType`s), not recursion                 | one exported name with TS overloads dispatching on `instanceof NodeType` (§ 6.5 of the alg.common rules)                                           |

## 4. Java idioms the port had to reproduce {#part-d-idioms}

- **Class-initialisation laziness (E1 as N4).** `NodePlacementStrategy` joined melk `NON_LEAF_DEFAULT_TYPES` and the
  provider was regenerated before any arm was wired (T2: only `NODE_PLACEMENT_STRATEGY` became a lazy getter); every
  placer's `HIERARCHY_PROCESSING_ADDITIONS` is a cached static getter; the entry-point fitness test imports the enum
  first in a fresh process. Wiring the 5 + 5 arms needed no further lazy read and no import reordering.
- **Numeric casts (N5).** `(int) Math.ceil(…)` and `(int) Math.max(0, …)` through `d2i`; `(int) Math.signum(cmp)` in
  `NeighborComparator` through `d2i(Math.sign(…))` with the stable `Array.prototype.sort`; `Math.round` through the
  JVM shim; `Double.isInfinite` as an explicit ±Infinity test; `Int32.mul` for `THOROUGHNESS * nodes`; the Java
  `assert` lines (`NetworkSimplexPlacer.java:592,1131`, `ThresholdStrategy.java:373,395,403`) omitted with a comment
  naming the line. No boxed `==` exists in the 7d Java (C6 audit per task).
- **Hashed containers (N7, AD-10).** `BKCompactor.sinkNodes` (a `HashMap<LNode,…>` iterated at `:341` and `:378`) is an
  insertion-ordered `Map`; the recorder's `-XX:hashCode=2` makes the Java iterate it in insertion order too (up to 10
  entries, 7b). `markedEdges`, `blockFinished`, `portMap`, `flexibleWhereSpacePermitsEdges` are membership-only;
  `getBlocks`/`getClasses` keep `LinkedHash*` order as `Map`/`Set`; `NEdge`/`NNode` are identity-keyed.
- **Debug logging (N8).** The five `monitor.log` sites of `BKNodePlacer` (four named in the plan plus
  `getClasses`'s "There are no classes in a balanced layout.", `BKNodePlacer.java:551`) are verbatim, with
  `BKAlignedLayout.toString` and Java-shaped `Map`/`List` `toString`s (`{k=[a, b]}`, `[e1, e2]`); a logging-monitor
  test pins them on recorded rows. `LinearSegmentsNodePlacer.java:450` calls the staged `DebugUtil` behind
  `monitor.isLoggingEnabled()`; the throw is pinned, no replay enables logging.
- **Quirks kept.** `createDependencyGraphEdges` skips `layerIndex++` on an empty layer and `mergeRegions` then
  calls `next()` unguarded (the placer throws `NoSuchElementException` on an empty layer, pinned); `ThresholdStrategy.java:253`
  reads the same `su` entry twice (`X || X`; collapsed to one read in the port, equivalent, after a CodeQL finding); `NetworkSimplexPlacer.markCrossingEdges` removes the matched open edge only
  when `hasPrevious()`, so a match at index 0 stays; `NEdge.of(origin)` discards its argument in Java and in 6a;
  `NodePlacementRepeater` is in the plan whenever `recomputeNodePlacement` is set (the `anyMatch` is always true).

## 5. Evidence {#part-d-evidence}

| Layer                        | What                                                                                                                                                                                                                                                                                                                                                              | Replay / test                                                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Placement rows (T1, T11)     | `layered-placement.json`, 604 rows (`models` 494, `scenarios` 84, `sites` 26), 5,242,236 bytes, JDK 21.0.1, oracle `8aaa3c14`, byte-stable; every class also proven on its own rows with the class injected (T4–T7), the 21 repeater rows first at T8                                                                                                             | `src/alg/layered/LayeredPlacementVectors.test.ts` replays all 604 by name in about 4.5 s (T8); the five processor tests and the four placer tests replay their rows through their own factories                |
| Ported JUnit invariant (T8)  | `BasicNodePlacementTest.testProperCoordinates` verbatim (`lastBottomY < y` per layer) over the `models` P4 rows of its 15 runs (14 `@ConfiguratorProvider`s + the default; BK is NONE × 6 + IMPROVE_STRAIGHTNESS × 5)                                                                                                                                             | 236 row cases, 47 per single-strategy run, 2–4 per BK variant; the Java suite on the oracle: `runs=8008 failures=0` at mission start and end                                                                   |
| Breadth sweep (T10, N10)     | `tools/oracle/placement-sweep.sh`: 8,410 oracle cases at the P4 stop over the edge-bearing levels of the 550 ptolemy models, once per `NodePlacementStrategy` (1,970 ok, 6,440 refused — 5,880 `HYPEREDGE_DUMMY_MERGER` → 7e, 560 `SELF_LOOP_PREPROCESSOR` → 7g —, 0 throws, 0 timeouts), one canonical-dump SHA-256 with `geometry` each, gitignored, about 38 s | `test/corpus/placement-sweep.test.ts`: 973 cases at stride 2 in about 12 s (all 1,970 with `PLACEMENT_SWEEP_STRIDE=1`, about 23 s), 0 mismatches                                                               |
| Anchored unit tests (T12a–b) | one colocated case per site row of `plans/layered-node-placement/unreached.md` (with its T11 and T12 corrections), `// oracle: <row id>; <Java file:line>`                                                                                                                                                                                                        | 27 cases over 5 files (label-and-size 6, interactive 1, linear segments 4 + the empty-layer throw, network simplex 11 over 13 rows, BK 4); T12b mutation-checked its branches; every S row of the map is cited |

**Coverage.** Replay-alone coverage of the 7d classes before the site rows (T9): 127 of 635 branches untaken and 39 of
264 functions uncovered, classified once each: 77 S (14 scenarios), 38 J, 11 U dead by construction, 1 X. After the
26 site rows and the anchored cases, per-class branch coverage with the generic replay is 100 % for most classes;
below 90 % only `LinearSegmentsNodePlacer` (83.3, one dead pair) and `BKNodePlacerFeasibility` (60, the unreachable
infeasible arms); the final partition is S 65 / J 38 / U 23 / X 1 branches. No untaken 7d site needs nested graphs
or label dummies. Whole-suite coverage after batch 6: 99.02 / 96.99 / 99.05 / 99.02 (lines / branches / functions /
statements).

**Divergences found and fixed before commit (none reached the oracle rows).** A T7 draft chained `.origin(lEdge)` on
the two `transformEdge` edges after misreading the 6a `NEdge.of(origin)` as defective (the Java discards the argument
too): removed. Hand-built tests whose behavioural expectations were derived from the Java (not from rows) were
removed from T5 and T6 under L4 and routed through T9 → T11 → T12. No numeric divergence between the port and the
oracle surfaced in 604 rows and 1,970 sweep cases.

## 6. Runbook {#part-d-runbook}

```bash
tools/vectors/layered-placement-vectors.sh test/golden/refs/java   # layered-placement.json; byte-stable, cached by salted input hash
git status --short test/golden/refs/java                           # must show nothing for a same-JDK re-record
tools/oracle/placement-sweep.sh [--force]                          # test/corpus/.placement-sweep/results.jsonl (≈40 s JVM, gitignored)
PLACEMENT_SWEEP_STRIDE=1 npx vitest run test/corpus/placement-sweep.test.ts   # every ok case (≈25 s; stride 2 ≈12 s)
java -cp <classpath> tools/vectors/LayeredPlacementVectors.java --dump <case id> $ELK_MODELS_DIR <outDir>   # one full row for a mismatch
MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh org.eclipse.elk.alg.layered.p4nodes.BasicNodePlacementTest   # runs=8008 failures=0 (≈50–100 s)
```

The recorder is one JDK 21 single-file launcher of at most 3,000 lines (2,972 after T11; the `sites` group reuses the
scenario builders) and runs with `-XX:+UnlockExperimentalVMOptions -XX:hashCode=2` as the 7b and 7c ones do. Its
diagnosis aids (`PLACEMENT_FILTER`, `PLACEMENT_DISCOVER`, `PLACEMENT_MARKERS`, `PLACEMENT_CROSSCHECK`, `PLACEMENT_STATS`,
`PLACEMENT_CAP_MB` for measuring only) are documented in its header.

| Failure                                       | Detection                                                                              | Fix                                                                                                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `geometry nodes <path> pos` differs by > 1e-6 | a replay or anchored-case diff naming a node, port, label or layer                     | a port defect: `--dump` the case, trace the first departure to its Java line (the default stance is "my port differs"); never widen the tolerance (AD-4) or re-record the row (AD-13) |
| Recorder exits 1 naming a row                 | `refusal OUTSIDE …`: a plan member outside the 7b + 7c + 7d sets and the N1 categories | a later mission's processor reached the plan: add it to the mission that ports it, never to `ACCEPTED_REFUSALS` outside an N1 category (stop 5)                                       |
| `ReferenceError … before initialization`      | the entry-point fitness test after wiring an arm                                       | the E1 recipe: lazy melk default (`NON_LEAF_DEFAULT_TYPES`), cached static configuration getter, in-function enum read; never an entry-order import (stop 15)                         |
| `java-tests.sh` prints `runs=1 failures=1`    | JUnit's `initializationError`: the class could not load                                | `MODELS_REPO` is unset (the `LayoutTestRunner` suites read `$ELK_MODELS_DIR`) or the name is misspelled; set `MODELS_REPO=$ELK_MODELS_DIR`                                            |
| `output is … bytes, over the 5 MB cap`        | the recorder's size check after a new row family                                       | trim per N3 (the BK matrix to fewer variant models first), or take a cap decision (roadmap follow-up); `PLACEMENT_CAP_MB` measures only                                               |
| Sweep `ok` count far below the case count     | 6,440 of 8,410 refused                                                                 | expected before 7e/7g (`HYPEREDGE_DUMMY_MERGER`, `SELF_LOOP_PREPROCESSOR`); re-sweep when those land                                                                                  |
