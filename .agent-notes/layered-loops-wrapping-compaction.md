<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — layered-loops-wrapping-compaction (mission 7g, 2026-11-10)

## Observation: a reflected `SelfLoopHolder` costs about 1 MB per node in a dump

- **Context**: T1 recording `selfLoopHolder` through the recorder's reflecting Encoder.
- **Finding**: the nested holder graph is encoded in full; the property is now ignored in `changed` and `dump`, and
  `expected.selfLoops` (a per-node summary) replaces it. The TS twin is `test/helpers/layered-loops-replay-selfloops.ts`.
- **Impact**: a later recorder that dumps a node with a `SELF_LOOP_HOLDER` property must summarise it, or the ref outgrows
  16 MiB.
- **Confidence**: High

## Observation: a recorder's opaque objects need explicit Encoder arms and a label-manager twin named after the recorder

- **Context**: T11 (`BPInfo`, `IndividualSpacings`) and T20 (red gate after T21).
- **Finding**: the landed `Ctx.encode` has no arm for objects the recorder reflects; `layered-loops-replay-wrapping.ts`
  re-implements the recorder's encoding. A dump writes an opaque option value by its Java class name, and the label manager
  is a nested class of the recorder that wrote the row, so the twin's class name must follow the row's recorder. A wrap that
  was unconditional gave 24 mismatches on `layered-labels.json` rows, every one on
  `properties[org.eclipse.elk.labels.labelManager]` only.
- **Impact**: a replay helper that reads rows of several refs tags each row with its ref at load (`LOOPS_RECORDED`) and picks
  the twin from the tag.
- **Confidence**: High

## Observation: a class `extends` on the enum's import chain makes the base class unusable as an entry point

- **Context**: T15, entry-point fitness test failing after wiring.
- **Finding**: `IntermediateProcessorStrategyCreate` imports `SelfLoopRouter` → `SplineSelfLoopRouter`, whose `extends
OrthogonalSelfLoopRouter` is evaluated before the base binding exists when a process enters at the base class
  (`ReferenceError`, or `Class extends value undefined` under vitest). Eight landed base classes fail the same probe.
- **Impact**: enter such a base class through the enum (7b decision E1, part 3); do not list it as an entry point and do not
  add an entry-order import.
- **Confidence**: High

## Observation: root-level `selfLoopDistribution` and `selfLoopOrdering` do not reach the loop nodes

- **Context**: T18 measuring which arms the 27 `full/self-loops/*/distribution-*/ordering-*` rows take.
- **Finding**: the rows set the two options on the root; the loops sit on child nodes, which do not read them, so
  `REVERSE_STACKED` and `SEQUENCED` in `PortRestorer` did not run there. A row that sets them on the node (`Sc19`) does.
- **Impact**: set per-node layout options on the node that owns the behaviour; these 27 rows are listed in issue #55.
- **Confidence**: High

## Observation: the JVM's NaN sign bit is not reproducible between runs

- **Context**: T19, 23 hash mismatches at stride 1 on the first run.
- **Finding**: layouts with NaN coordinates (13 to 93 per dump) differ in the NaN sign bit between interpreted and compiled
  code; the raw-bits hash of one case changed with what ran earlier in the JVM, and two fresh `--dump` runs of
  `416_longSelfLoops` differ. Oracle and port are equal once NaN is canonical. Rows with NaN also need the landed
  `strictNumbers` to parse (`ticket-213_componentsCompaction`).
- **Impact**: a sweep hash must canonicalise NaN (`Double.doubleToLongBits`); issue #53 asks whether the landed sweeps adopt it.
- **Confidence**: High

## Observation: a site row can reach an arm without observing it

- **Context**: T21 mutation checks.
- **Finding**: the `invertedPorts/*` site rows reach `NetworkSimplexCompaction`'s inverted-port arms, yet mutants in them
  survive; full rows discriminate where the site rows do not. Eleven mutants survived in total.
- **Impact**: a site row is evidence of reach, not of observation; survivors need a new oracle graph (issue #55).
- **Confidence**: High

## Observation: the layered `compaction/oned` is reached only through `ComponentsCompactor`

- **Context**: T18 coverage map.
- **Finding**: `HorizontalGraphCompactor` drives the `alg.common` copy; the layered copy runs only through
  `OneDimensionalComponentsCompaction`, which starts every compaction at `LEFT` and never sets the constraint or compaction
  algorithm. Its quadratic calculation and the `UNDEFINED → RIGHT/UP/DOWN` transitions are covered by `CompactionTest` only.
  7e's list called the far arms of `segmentAllowsSloppyRouting` unreachable; they are reached (for example
  `full/compaction/compaction_oned-labels-edgeLabelAndSplines/edge-length-scanline-splines`).
- **Impact**: coverage of the layered `oned` cannot come from compaction rows over the `alg.common` path.
- **Confidence**: High

## Observation: `JUNCTION_POINTS` is never null

- **Context**: T18 classifying the junction-merge arms.
- **Finding**: the property is a cloned default, so its null arms are unreachable and no junction-merge scenario exists.
- **Impact**: classify such arms U with the Java line; do not look for a graph.
- **Confidence**: High

## Observation: `DummySelfLoopProcessor` needs a plan without the self loop arms

- **Context**: T1/T14 recording its rows.
- **Finding**: the `SELF_LOOP_*` arms hide the loops the processor works on, so its rows run a plan without them, with the
  `processor` step op in front of `NORTH_SOUTH_PORT_PREPROCESSOR`; no enum arm calls it.
- **Impact**: a row for it must be built on such a plan; `/end` rows run the rest of the plan and reach
  `NorthSouthPortPostprocessor.processSelfLoop`.
- **Confidence**: High

## Observation: a targeted test run before a commit missed a regression in a shared helper

- **Context**: T20 committed on a targeted run; T21's full run reported 24 mismatches in
  `test/helpers/layered-loops-replay-rows.test.ts`.
- **Finding**: the regression reproduced at T20's commit; T21 did not cause it.
- **Impact**: after changing a shared helper, run the helper's own tests (`*-replay-rows.test.ts`) before the commit.
- **Confidence**: High

## Observation: wall time of `npm test` is bound by `test/corpus/elkt-sweep.test.ts` and tracks machine load

- **Context**: stop 11 measurements, batches 1 to 10.
- **Finding**: readings from 66.0 s at load 9.5 to 116.9 s with another repository's workers loading the machine; the
  JSON-reporter runs put `elkt-sweep.test.ts` (landed, untouched) at 85 to 93 s alone.
- **Impact**: compare a wall time with the baseline only at a similar load; judge the mission's own files by their per-file
  durations.
- **Confidence**: High
