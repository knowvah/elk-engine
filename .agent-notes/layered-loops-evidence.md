<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: layered-loops-evidence (issue #55, 2026-11-21)

Planning-time notes are in `layered-loops-evidence-planning.md`. Journal: `plans/layered-loops-evidence/decision-journal.md`.
Verdicts: `plans/layered-loops-evidence/mutants.md`. Arm outcomes: `plans/layered-loops-evidence/unreached.md`.

## Observation: a filtered recorder run is a faster pre-screen than a cloned row

- **Context**: T1-T3 had to tell whether a candidate graph kills a mutant before recording it.
- **Finding**: `LOOPS_FILTER=<text>` makes the loops recorder build only the rows whose id contains the text (one build,
  no coverage check), and a cold filtered run takes seconds. A scratch copy of the repository with the candidate rows
  added to its recorder, a scratch test that replays `loadLoopsRows(undefined, <file>)`, and a script that applies one
  mutant to the copy's `src/` give "killed or not" on a real oracle row in under a minute. The filter takes one
  substring; the scratch copy's recorder was changed to accept `a|b` alternatives. For a TS-only screen, a `layoutSite`
  row needs no plan: its steps are always `importGraph <target>`, `normalise`, `layout`, so a pseudo-row with an empty
  `expected` runs through `runLoopsRow` and returns the exported layout.
- **Impact**: record first, screen on the row. Cloning a landed row's steps only works while the candidate has the same
  plan.
- **Confidence**: High (all 15 rows and about 90 candidates went through it)

## Observation: `EPSILON` windows make "unreachable" arms reachable

- **Context**: M7-M9, `ComponentsCompactor.includeExternalEdgesInSize` (`ComponentsCompactor.java:155-169`).
- **Finding**: the method reads an external anchor's coordinate across its port side only when the segment that leaves
  the anchor counts as parallel to the side, which geometry rules out for a real segment. `DoubleMath.fuzzyEquals` with
  `EPSILON = 1e-4` does not rule it out: an `elk.padding` of 4e-5 puts the external-port dummy that close to its
  neighbour's anchor, and the "wrong" arm fires with a coordinate outside the compacted size. The y arm also needs the
  segment to fail the x test without a bend point: `elk.direction=DOWN`, `nodePlacement.strategy=SIMPLE` and a port
  5e-4 off the node's centre stay under the orthogonal router's 1e-3 tolerance (`OrthogonalRoutingGenerator`), so the
  edge is drawn straight although its ends differ in x.
- **Impact**: when an arm looks dead by geometry, check every tolerance on the path (1e-4 in the components compactor,
  1e-3 in the orthogonal router). Two tolerances of different size leave a window.
- **Confidence**: High (three oracle rows, `sites/ComponentsCompactor/externalEdgeOffset/*`)

## Observation: where an external-port dummy gets a margin

- **Context**: M6 and M10 both needed a north or south external-port dummy with a non-zero margin; planning saw only 0.
- **Finding**: such a dummy is taken out of the layers before phase 3 and restored by
  `HierarchicalPortOrthogonalEdgeRouter.restoreDummy` (`.java:217-246`), which runs the node margin calculator on it
  only if the graph's `nodeSize.constraints` hold `PORT_LABELS`. With `portLabels.placement=INSIDE` the labels are
  stacked below the port (a bottom margin). With `OUTSIDE` only the label's x is set and the imported y stays: a label
  imported above its port gives a top margin, below it a bottom margin. The margin calculators that run earlier never
  see the dummy.
- **Impact**: the SOUTH placeholder of components compaction has the height of that top margin
  (`ComponentsCompactor.java:463-479`), and the horizontal compactor subtracts the bottom margin
  (`LGraphToCGraphTransformer.java:654`). Both are 0 without `PORT_LABELS`.
- **Confidence**: High (four oracle rows)

## Observation: the layout transfer overwrites what a nested compaction did to an external dummy

- **Context**: M6; a `layoutSite` row did not change under the mutant although the compactor's result did.
- **Finding**: the y of a north or south external-port dummy is recomputed from the graph size by
  `LGraphUtil.getExternalPortPosition` when the layout is transferred (`ElkGraphLayoutTransferrer.java:105-111`), so a
  whole-layout row cannot show what `HORIZONTAL_COMPACTOR` wrote there. A step row can, if its import target is the
  nested node: `chainOf(elk, target, stop, manager)` takes a target, and `levelStopSite` in
  `LayeredLoopsVectorsSites.java` is the `stopSite` that passes one.
- **Impact**: for an arm that writes an external dummy's position, stop on the nested level instead of laying it out.
- **Confidence**: High

## Observation: components compaction needs free or side-fixed external ports

- **Context**: M9 candidates with `portConstraints=FIXED_POS` on the compound node never reached the compactor.
- **Finding**: `ComponentsProcessor.split` separates components only when the graph's port constraints are not
  order-fixed (`ComponentsProcessor.java:106-113`); otherwise the simple row placer runs and
  `compaction.connectedComponents` has no effect. Compaction also runs with a single component.
- **Impact**: a components-compaction graph uses FREE or FIXED_SIDE on the node whose level is compacted.
- **Confidence**: High

## Observation: the layer unzipper breaks the spline router's adjacency assumption

- **Context**: `SplineEdgeRouterSegments.ts:137 if[1]`, for which 7g found no graph.
- **Finding**: with `layerUnzipping.strategy=ALTERNATING`, an inverted port whose edge stays forward (the port's node is
  in a cycle: W.p0 → T, W → X, X → T) reaches P5 with edges between non-adjacent layers. `clearThenFillMappings` drops
  them, and the Java then throws a `NullPointerException` in `getSplinePath` (`SplineEdgeRouter.java:956`); the port
  throws a `TypeError` at the same place. Planning's graph (W.p0 → T alone) does not reach it: the edge is reversed.
  The oracle's test API (`ElkLayered.prepareLayoutTest`, `runLayoutTestUntil(SplineEdgeRouter.class, false, state)`)
  gives the graph just before the router from a single-file probe, and the port has the same API.
- **Impact**: an oracle throw can be pinned without a recorder row: probe the state before the throwing processor, assert
  that state and the throw site in the port. Filed as `needs-ruling` #148 for upstream.
- **Confidence**: High (two probes, three test cases)

## Observation: V8's sort passes the later element first

- **Context**: Sc28, `PointQuadrant.ts:63`: reached only if the sort calls the comparator with a Q1 point first and a
  point of another quadrant second, and the hull list holds every Q1 point before the others.
- **Finding**: on Node v26.3.1 (V8 14.6.202.34), `Array.prototype.sort` called the comparator with the first argument at
  the lower input index in 0 of 1,522,874 calls (900 lists, six input families, n = 2 to 5,000), and never with one
  element twice. 7g's "needs 32+ points" described the JDK's sort.
- **Impact**: whether a comparator arm is reachable in the port depends on the engine's call order, not on the Java's.
  The class is "U on V8", measured, not proven from the language specification.
- **Confidence**: Medium (empirical, one engine build)

## Observation: a `-t` filter by row family misses the converted row

- **Context**: T4 measured the hull arms over "the components-compaction rows" with
  `-t "ComponentsCompactor|components-compaction"`.
- **Finding**: the ticket-213 row is `full/converted/labels/ticket-213_componentsCompaction` (camel case, another
  family), so the filter left it out. The rerun over both replay suites unfiltered gave the same zeros.
- **Impact**: measure arm counts over whole suites; a title filter is a lower bound on what reaches a class.
- **Confidence**: High

## Observation: line coverage already held two of the five "unreached" arms

- **Context**: closing the arms #55 lists.
- **Finding**: `SplineEdgeRouterSegments.ts:137 if[1]` and `PointQuadrant.ts:63 binary-expr[1]` had no open branch in the
  base coverage report: structural cases written after 7g's unreached map (7e's hand-built state, 7g T21's quadrant-pair
  loop) cover them. The map lists what no oracle graph reaches, which is a different question from coverage.
- **Impact**: read `coverage/cobertura-coverage.xml` for the line before searching for a graph, and say which question a
  follow-up asks.
- **Confidence**: High

## Observation: other work on the machine pushes the load past the recorder limit

- **Context**: the queue rule "above 12, wait" before a JVM recorder.
- **Finding**: the load average was between 6 and 55 during the mission, from subagent test runs and other sessions. A
  wait loop in front of the recorder (`sysctl -n vm.loadavg`, 20 to 30 s steps) took up to 8 minutes. The first scratch
  recorder runs of the mission were started without the wait.
- **Impact**: put the wait in the script that starts the JVM, not in the operator's head.
- **Confidence**: High
