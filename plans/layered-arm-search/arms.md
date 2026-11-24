<!-- SPDX-License-Identifier: EPL-2.0 -->

# The 25 arms: Java lines, leads at planning, outcomes

The source is `plans/layered-compound/unreached.md` § Open, items 1 and 2. Arms are keyed as in its § Measurement:
`if[0]` is the consequent, `if[1]` the alternative, `binary-expr[k]` the k-th operand.

TS lines are those of the measured tree (`679df4b`). The arm files are unchanged since then, except the two Forster
files (`ff25872d`, `928302b8`); their current lines are given. T1 re-checks every line against a fresh run A and
records any shift here.

Paths are relative to `src/alg/layered/`. `J` stands for `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/`.

The outcome column (D3: 1, 2, 3 or 4, with the row id, proof or closest approach) is filled in by the orchestrator from
the T2-T4 reports.

## North/south routing strategies (T2, 6 arms)

| # | Arm (both files) | Java | Guard | Outcome |
| - | ---------------- | ---- | ----- | ------- |
| 1-2 | `p5edges/orthogonal/direction/NorthToSouthRoutingStrategy.ts:38 if[0]`, `SouthToNorthRoutingStrategy.ts:38 if[0]` | `J/p5edges/orthogonal/direction/NorthToSouthRoutingStrategy.java:47` (South: same line) | `segment.isDummy()`: a dummy segment exists only after the routing generator splits a segment on a critical cycle (`J/p5edges/orthogonal/OrthogonalRoutingGenerator.java:176,408,452-464`) | 1: `sites/HierarchicalPortOrthogonalEdgeRouter/splitSegment/south` (arm 1), `sites/HierarchicalPortOrthogonalEdgeRouter/splitSegment/north` (arm 2) |
| 3-4 | `:58 if[1]` | `:62` | `|sourceX − targetX| ≤ 1e-3`: a straight edge between a source port and its target | 1: `sites/HierarchicalPortOrthogonalEdgeRouter/straightEdge/south` (arm 3), `sites/HierarchicalPortOrthogonalEdgeRouter/straightEdge/north` (arm 4) |
| 5-6 | `:78 if[0]` | `:72` | `segment.getSplitPartner() != null`: the non-dummy half of a split segment | 1: `sites/HierarchicalPortOrthogonalEdgeRouter/splitSegment/south` (arm 5), `sites/HierarchicalPortOrthogonalEdgeRouter/splitSegment/north` (arm 6) |

Leads:

- The strategies run only from `HierarchicalPortOrthogonalEdgeRouter` (7g hand-off). The segments there are the hyper
  edges between the north/south external port dummies and the nodes of the first or last layer.
- Arms 1-2 and 5-6 need the same event, a split. Build two hyper edge segments whose dependencies form a critical
  cycle: two segments that cross each other both ways. The usual shape is two external ports at swapped x positions,
  each connected to a node whose x lies past the other port's x. Read `OrthogonalRoutingGenerator.java:452-464` for the
  exact condition before building anything.
- Arms 3-4: a target anchor x within 1e-3 of the source port x. With `portConstraints=FIXED_POS` on the parent, solve
  for the port x that equals the node anchor x the placement gives. Read that x from a first oracle run, then set it;
  do not scan. `.agent-notes/layered-loops-evidence.md` (the `EPSILON` windows) shows that the 1e-3 tolerance is
  reachable with a 5e-4 offset.
- Earlier attempts not to repeat: 22 random chain graphs, a scan of 22 `FIXED_POS` and 17 `FIXED_RATIO` positions, and
  single-child straight-edge designs (`plans/layered-compound/unreached.md` § Open, item 1).

## Model-order comparators (T3, 11 arms)

| # | Arm | Java | Guard | Outcome |
| - | --- | ---- | ----- | ------- |
| 7 | `intermediate/preserveorder/ModelOrderNodeComparatorHelperDummies.ts:120 if[1]` | `J/intermediate/preserveorder/ModelOrderNodeComparator.java:384-483` (`:434` the `beforePorts` test) | two feedback long-edge dummies on the **same** reference node, where no case of the before-ports or reference-port ordering applies (`null`) | 2: `sites/ModelOrderNodeComparator/targetFeedbackPair` (a `layers` step; the fall-through at `:429` to `:479` in the second sort) |
| 8-9 | `:172 if[0]`, `:172 binary-expr[1]` | `:440` | `beforePorts`, and both reference nodes are source feedback nodes | 2: `sites/ModelOrderNodeComparator/sourceThenTargetFeedback` (the sort runs twice). The TS line is the Java `:450` test (source, target), not `:440` |
| 10 | `:175 if[1]` | `:450` | `beforePorts`, and not (source, target) | 2: `sites/ModelOrderNodeComparator/targetFeedbackPair` |
| 11-14 | `:178 if[0]`, `if[1]`, `binary-expr[0]`, `binary-expr[1]` | `:453`, `:456` | `beforePorts`, and (target, source), or falling through | arms 11, 13, 14 (`if[0]`, `binary-expr[0]`, `binary-expr[1]`): 2, `sites/ModelOrderNodeComparator/targetFeedbackPair`. Arm 12 (`if[1]`): 3, a dummy that is neither a source nor a target feedback dummy cannot share a reference node (`tools/arm-search/model-order/README.md`) |
| 15 | `intermediate/preserveorder/ModelOrderPortComparator.ts:148 if[1]` | `J/intermediate/preserveorder/ModelOrderPortComparator.java:322` | two ports with no in/out split, where at least one has no `MODEL_ORDER` | 1: `scenarios/ModelOrderPortComparator/noModelOrderPorts` (a node with `considerModelOrder.noModelOrder`; Java `:322` false, the `else` at `:346`) |
| 16 | `intermediate/preserveorder/ModelOrderPortComparatorIncoming.ts:157 if[1]` | `ModelOrderPortComparator.java:174` | `checkReferenceLayer` decides, and the two ports are not both `EAST` | 2: `sites/ModelOrderPortComparator/westLongEdgeSources` (a `layers` step; Java `:185`) |
| 17 | `intermediate/preserveorder/ModelOrderPortComparatorOutgoing.ts:107 if[1]` | `ModelOrderPortComparator.java:275` | the first outgoing edge of a port has no `MODEL_ORDER` | 2: `sites/ModelOrderPortComparator/edgesWithoutModelOrder` (the strategy set after the import) |

Leads:

- **Arms 15 and 17, and maybe 16: elements without `MODEL_ORDER`.** The importer gives `MODEL_ORDER` to nodes, ports and
  edges, and the long-edge splitter copies it. List every `new LEdge`/`new LPort` in the processors that run before
  `SORT_BY_INPUT_ORDER_OF_MODEL` and P3, and check which ones copy the property.
  - The external-port dummies, their ports and their edges, created by `CompoundGraphPreprocessor` for a nested graph,
    are the first candidates.
  - The north/south port dummies of `NorthSouthPortPreprocessor` are the second.
  - An input that needs a nested graph goes to a compound `run` row, not to the order recorder, which imports only flat
    levels (D1).
- **Arms 7-14** need two feedback dummies (both not connected to the previous layer) on one reference node, with
  `beforePorts` set. Instrument `ModelOrderNodeComparator.java` (D2) to log, at `:384`, the feedback flags and the
  reference nodes over the order and compound corpus sweeps. That shows which conjunct is never met. 7c's lead was
  "both dummies unconnected to the previous layer plus a same-reference pair".
- **Arm 16:** 7c found that same-layer long-edge dummies feed only `EAST` ports, the way `INVERTED_PORT_PROCESSOR` makes
  them. Look for a `WEST` port whose incoming edge comes from the same layer: a `WEST` inverted port (the
  `westInvertedPortEdge` row of #55 shows one exists) or a north/south dummy.
- Earlier attempts not to repeat: 120 random inverted-port graphs and about 15,000 class scans (7c).

## Barycenter and Forster (T4, 8 arms)

| # | Arm | Java | Guard | Outcome |
| - | --- | ---- | ----- | ------- |
| 18 | `p3order/AbstractBarycenterPortDistributor.ts:272 if[1]` | `J/p3order/AbstractBarycenterPortDistributor.java:261-277` | an in-layer port that is neither `EAST` nor `WEST` | 3: `inLayerPorts` only holds ports of `node.getPorts(WEST or EAST)` (`:89`, `:155`, `:189-216`) |
| 19 | `p3order/ModelOrderBarycenterHeuristic.ts:77 if[0]` | `J/p3order/ModelOrderBarycenterHeuristic.java:75-77` | the transitive sets already order the pair | 3: within one insertion sort no entry relates the pivot and the prefix element it is compared with |
| 20-23 | `:179 if[0]`, `:184 if[0]`, `:189 if[0]`, `:194 if[0]` | `:149-170` | `biggerThan`/`smallerThan` already hold the pair | 3: as arm 19 (`tools/arm-search/barycenter/README.md`) |
| 24 | `p3order/ForsterConstraintResolver.ts:323 if[0]` (`:314` in the measured tree; T1 correction, see below) | `J/p3order/ForsterConstraintResolver.java:261` | a violated constraint whose predecessor has the **same float barycenter** as the group and a higher index in `groups` | 1: `scenarios/ForsterConstraintResolver/equalFloatBarycenter` |
| 25 | `p3order/ForsterConstraintResolverConstraintGroup.ts:115 if[0]` (`:113` in the measured tree; T1 correction, see below) | `J/p3order/ForsterConstraintResolver.java:427` | in a merge, a successor of the second group **is the first group** (`candidate == nodeGroup1`): a constraint cycle between the two merged groups | 3: a group is processed once per round and after all its predecessors, so two groups in a two-cycle are never both processed |

Leads:

- **Arms 19-23 look like outcome 3. This is a sketch, to verify, not a conclusion.**
  - `ModelOrderBarycenterHeuristic` is created only with `forceNodeModelOrder` (`J/p3order/GraphInfoHolder.java:100-111`).
    With that flag the layer is sorted by `insertionSort` (`ModelOrderBarycenterHeuristic.java:129,239-252`), which
    clears both maps after every sort (`:251`).
  - Within one sort, each pivot is fresh: it has never been compared. It is compared with its predecessors in turn and
    stops at the first answer that is not positive.
  - Every recorded relation agrees with the current order of the sorted prefix. Both recording sites
    (`:96-99`, `:185-194`) use the same convention, and the insertion sort never swaps two prefix elements.
  - So the transitive closure would relate the pivot to its next predecessor only through an element that it already
    passed and that ranks below that predecessor. That contradicts the prefix order.
  - Then `:77` and `:179`/`:184` cannot answer within one sort. `:189`/`:194` additionally need `smallerThan` to hold a
    pair that `biggerThan` does not. `updateBiggerAndSmallerAssociations` (`:205-224`) keeps the two maps mirrored.
  - Before claiming dead, verify three things: no other caller compares with `barycenterStateComparator` between a clear
    and a sort; the maps are empty at the first sort; and `BarycenterHeuristic.java:94`, the force path inside the
    parent, is only reached with a `ModelOrderBarycenterHeuristic` instance.
- **Arm 18:**
  - `inLayerPorts` excludes north/south ports, so `if[1]` needs an `UNDEFINED` side at P3. 7c saw that such a port makes
    the counter throw in `BinaryIndexedTree`.
  - Check whether every pipeline gives each port a defined side before P3. `PortSideProcessor` runs before P3 on every
    assembled plan (7c's prefixes); `ElkGraphImporter.ensureDefinedPortSide` does this for fixed sides. If so, a real
    layout cannot reach the arm. A site scenario (outcome 2) would then throw, which no row can record. That points to
    outcome 3 for layouts.
- **Arm 24:** two constraint-linked nodes with equal float barycenters, for example both connected only to the same
  fixed-layer node, where the predecessor's index is higher. In-layer successor constraints come from
  `IN_LAYER_SUCCESSOR_CONSTRAINTS`. Find their writers before building.
- **Arm 25:** a chain of three constraint-linked groups a → b → c, where the merge of (a, b) happens while b still has
  its constraint to c. Before building, find out why 7c's 720 seed-by-constraint variants never merged inside a chain.
- Earlier attempts not to repeat: 300 random force graphs and 720 seed-by-constraint variants (7c).

## T1 line check (2026-11-21)

`tools/arm-search/coverage.sh` over the landed evidence at `b5f98d63` (113 test files, 10,527 tests passed, 12 skipped):
every one of the 25 arms has count 0, so none is class E and all 25 are searched. The lines of 23 arms are those of the
table above. Two were wrong in the planning table and are corrected in it:

- **Arm 24.** In the measured tree (`679df4b`), `ForsterConstraintResolver.ts:314` is the inner test
  `groups.indexOf(predecessor) > groups.indexOf(group)`; `:313` is the float comparison. Today the inner test is `:323`
  (Java `:261`), and its `if[0]` has count 0. Planning named `:322`, the float comparison, whose `if[0]` is taken 2,145
  times by the landed rows.
- **Arm 25.** In the measured tree, `ForsterConstraintResolverConstraintGroup.ts:113` is `candidate === nodeGroup1`.
  `928302b8` moved it to `:115` (Java `:427`), and its `if[0]` has count 0. Planning kept `:113`, which today is
  `nodeGroup2.outgoingConstraints !== null` (taken 12,806 times), and described the guard as "both groups have outgoing
  constraints". The guard of the unreached arm is that the second group of a merge has the first group among its
  successors: 7c's own note says `candidate == nodeGroup1` (`plans/layered-crossing-min/unreached.md:181`).

The leads for arms 24 and 25 above were written for the planning reading. For arm 25 the lead "a chain a → b → c" does
not apply; the arm needs a two-cycle between the groups being merged.

## Batch 2 outcomes (2026-11-23)

The outcome columns above are filled from the three search reports, each re-run by the orchestrator (journal, T2 to T4
rows). Counts: outcome 1 for 8 arms (1-6, 15, 24), outcome 2 for 9 arms (7-11, 13, 14, 16, 17), outcome 3 for 8 arms
(12, 18-23, 25), outcome 4 for none.

Corrections to the planning table that the searches found:

- **Arms 8-14, Java lines.** `ModelOrderNodeComparatorHelperDummies.ts:172`, `:175` and `:178` are the Java tests
  `ModelOrderNodeComparator.java:450` (source, target), `:453` (target, source) and `:456` (target, target). `:440`
  (source, source) is TS `:170` and is not one of the arms. The guards of the table rows 8-9 and 10 read accordingly:
  arms 8-9 are "(source, target)" taken and its right operand evaluated; arm 10 is "(target, source)" false.
- **Arm 15, Java line.** The alternative is the `else` at `ModelOrderPortComparator.java:346`, taken when the test at
  `:322` fails.
- **Arm 16, Java line.** `ModelOrderPortComparator.java:185` (the `EAST`/`EAST` test inside `inPreviousLayer != 0`).
- **Arm 18.** The lead ("an `UNDEFINED` side at P3") does not apply: no port of any side other than `EAST` or `WEST`
  can enter `inLayerPorts`, whatever the graph state.
