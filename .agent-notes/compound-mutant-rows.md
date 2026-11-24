<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: compound-mutant-rows (issue #60, 2026-11-23)

Planning-time notes are in `compound-mutant-rows-planning.md`. Journal: `plans/compound-mutant-rows/decision-journal.md`.
Outcomes: `plans/layered-compound/unreached.md` § "Mutant rows (issue #60, compound-mutant-rows)".

## Observation: a fourth pinned value over the compound ref, a count of `models` stops

- **Context**: T3 recorded three new `models` runs (24 rows); every row replayed and one existing test failed.
- **Finding**: `src/alg/layered/compound/CompoundGraphPreprocessorSections.test.ts:112-115` asserts that the `models` group
  holds exactly 10 `CompoundGraphPreprocessor` stops and that each is at index 0. A `models` spec records every stop of its
  run, so any new `models` run adds a preprocessor stop. A run whose root is a flat graph over two compound nodes also puts
  the second node's preprocessor stop at index 4. The planning note named `DIFFERING_ROWS` as the only pinned list over
  compound rows; `.agent-notes/layered-arm-search.md` lists three id lists. This is a pinned count, not an id list, so a
  grep for `_ROWS` does not find it (`toHaveLength(` over rows filtered from a ref does).
- **Impact**: a brief that adds a `models` run to `layered-compound.json` must ask for this assertion in the issue (#165).
  Run the whole suite, or at least `src/alg/layered/compound/`, right after the first scratch recording.
- **Confidence**: High

## Observation: a compound node under a quiet flat root gives a `sites` row its tree

- **Context**: the resizer group needs a layered run whose top-level graph has an ElkNode parent (a root without
  `INCLUDE_CHILDREN` holding a compound node with it).
- **Finding**: on such a run the recorder's `StopRecorder` and the TS `RunRecorder` also record the flat root's
  hierarchy-aware processors (`P3_NODE_ORDERING/LAYER_SWEEP`, then `TWO_SIDED_GREEDY_SWITCH`, once per connected component),
  after the compound node's four stops. A `sites` row keeps the tree of the last stop, and `replayScenario` requires that
  stop to be the postprocessor. With `crossingMinimization.strategy=NONE` and `crossingMinimization.greedySwitch.type=OFF`
  on the root, its flat layout runs no hierarchy-aware processor and makes no stop, so the last stop is the compound
  node's `CompoundGraphPostprocessor` and the row replays with the landed machinery. `levelPath` and the plans then name the
  compound node (`root/c`), not the root. `algorithm=fixed` on the root gives the same four stops in the port (not recorded).
- **Impact**: a state that exists only at the top level of a compound run under a parent can be a `sites` row; it needs
  one row per compound node, because the tree is the notified graph's own tree.
- **Confidence**: High (three rows recorded and replayed)

## Observation: a dummy edge's property can be made visible after the postprocessor through the layout

- **Context**: D15 (the thickness of merged hierarchical dummy edges). The dummy edges are removed by the postprocessor,
  so the last tree and the export of the issue's graph are equal with and without the merge.
- **Finding**: `LongEdgeSplitter` makes a long-edge dummy as high as its edge is thick. A second node behind the port's
  node (`x -> z` in `d`) makes the merged dummy edge pass a layer, and the layout then differs between thickness 3 and 1 in
  every stop tree and in the export.
- **Impact**: before asking for an intermediate-stop row, look for a later reader of the value (`EDGE_THICKNESS` is read
  by `LongEdgeSplitter`, the label dummies and the end-label processors).
- **Confidence**: High

## Observation: an arm named in an issue is not the mutant; rebuild by survival and separation

- **Context**: T1 rebuilt 7h's mutants from ids and arm names.
- **Finding**: the three obvious mutants at the arm #60 names for G18 (the default port passed as `null`, the `exported`
  test negated, `!==` as `===`) are killed at base by 55 to 105 tests: landed rows already merge incoming edges at an inner
  level. The survivor that `mergeInDeep` separates is the guard on the push (`!==` → `true`: a reused port added to the
  created ports twice). For the resizer guard, the issue's graph grows both axes, so it cannot separate a mutant of one
  operand; one-axis variants were needed.
- **Impact**: rebuild a mutant as "survives every row at base **and** the issue's graph separates it in TS" (a scratch
  probe that hashes every stop's tree and the export, with and without the mutant, takes 10 s for 20 graphs). Check both
  before recording anything.
- **Confidence**: High

## Observation: "killed" needs its test set stated: the class test kills what no row observes

- **Context**: the two resizer groups (R29-R38, R1-R12 in 7h's numbering).
- **Finding**: `HierarchicalNodeResizingProcessor.test.ts` (Java-structure cases) kills every rebuilt mutant of both
  groups at base, while `LayeredCompoundVectors`, `LayeredCompoundSites` and `LayeredCompoundTwins` pass. 7h's journal says
  so for both groups; the brief applied it to one group only and counted class tests as kills.
- **Impact**: when an issue asks for oracle rows, report the base status per suite (rows, class tests) and decide rows on
  the row suites.
- **Confidence**: High

## Observation: what the monitor tree of a compound run looks like

- **Context**: the `worked` row (`sites/ElkLayered/recursiveWork`, two levels).
- **Finding**: 49 monitors begin: `Recursive Graph Layout` (work 3, the node count), `Layered layout` (2),
  `Compound graph preprocessor` (1), `Recursive hierarchical layout` (43, the sum of both plans), then one sub-monitor per
  processor run (work 1 each), and `Compound graph postprocessor`. The sub-monitors of the hierarchical monitor are created
  in run order: the nested graph up to its pause before P3, the root up to P3, the nested graph's rest, the root's rest.
  Every `begin` of the run passes a whole number.
- **Impact**: the list also pins the processor run order across levels; a change of that order shows as a `work[i]` diff
  on the task name.
- **Confidence**: High

## Observation: recorder timing and load

- **Context**: five recordings and several filtered scratch runs.
- **Finding**: a cold run of the compound recorder took 10 to 19 s at a 1-minute load of 10 to 12; a filtered run
  (`COMPOUND_FILTER`, cache off) 6 to 10 s; a cache hit 1.2 s. The machine's load was above 12 for minutes at a time
  (other sessions), and a polling wait for `load < 12` took up to 5 minutes.
- **Impact**: write the code of the next task while waiting for the load, and batch the checks that need the JVM.
- **Confidence**: Medium (one evening)
