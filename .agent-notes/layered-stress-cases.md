<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: layered-stress-cases (issue #58, 2026-11-21)

Planning-time notes are in `layered-stress-cases-planning.md`. Journal: `plans/layered-stress-cases/decision-journal.md`.

## Observation: a runner suite on the oracle without `MODELS_REPO` looks like a failing class

- **Context**: T4, the brief's command `tools/oracle/java-tests.sh <Issue665Test> <Issue700Test>` as written.
- **Finding**: both classes print `runs=1 failures=1` and the script exits 1. The per-class log holds one
  `initializationError`: "The system property or environment variable 'MODELS_REPO' needs to be set. / No test graphs
  specified." (`LayoutTestRunner.<init>`). JUnit counts the class that cannot be built as one failed run. With
  `MODELS_REPO=<models checkout>` the same command gives `runs=1 failures=0` and `runs=4 failures=0`.
- **Impact**: read the log named on the `log:` line before treating a `runs=1 failures=1` line as an oracle result. A
  brief's `java-tests.sh` line for a `LayoutTestRunner` suite needs `MODELS_REPO` (as `java-baseline.md` of 7h has it).
- **Confidence**: High

## Observation: the runner must register an algorithm before the model is loaded, not before layout

- **Context**: T3, where to call `registerTestAlgorithms()` in `test/helpers/layout-test-runner.ts`.
- **Finding**: an `.elkt` model resolves `algorithm: elk.stress` and option suffixes such as `desiredEdgeLength` while it
  is parsed (`loadGraphFile`), and `realize` loads the graph through `experiment.graph.provide()`. The registration sits
  right after `registerLayered()` at the top of `realize`; a test asserts the order by reading the service inside a graph
  builder. `loadGraphFile` itself still registers layered only, so a direct caller that loads a model naming another
  algorithm has to register it first.
- **Impact**: a suite added later that names a seventh provider needs it in `registerTestAlgorithms`, not in the suite.
- **Confidence**: High

## Observation: a new provider can unresolve a suffix; force and stress do not

- **Context**: T3, stop 4 (does registering force and stress change another runner suite).
- **Finding**: `LayoutMetaDataService.getOptionDataBySuffix` returns `null` for a suffix more than one option has, so
  registration order does not protect an earlier option: a new option with the same dot-suffix makes both unresolvable by
  that suffix. Measured for this change: the ten ids force and stress add (`org.eclipse.elk.force.{model, iterations,
repulsivePower, temperature, repulsion}`, `org.eclipse.elk.stress.{fixed, desiredEdgeLength, dimension, epsilon,
iterationLimit}`) share no dot-suffix with any id or legacy id of core and layered. The JSON exporter writes the
  shortest unique suffix, so a wider registry can also change exported keys in the same module registry (the
  `SUFFIX_DIFFERENCES` tripwire of the force goldens is that case for rectpacking).
- **Impact**: before registering another provider in a shared helper, list its ids' dot-suffixes against the registered
  ones; a clash is a behaviour change for every suite in that worker.
- **Confidence**: High (probe run; 0 clashes)

## Observation: a title-and-status diff of the JSON reporter shows a helper change's side effects

- **Context**: T2 and T3 had to show that no other runner suite changed.
- **Finding**: `npx vitest run <the 52 files that import the runner> --reporter=json --outputFile=<f>` before and after,
  reduced to one line per test (`file`, `status`, `fullName`) and sorted, diffs to exactly the intended tests. It takes
  10 s in default mode and under a minute with `PIPELINE_SUITES_FULL=1` (5,739 tests), with or without
  `ELK_TEST_TEXT_MEASURER=fixed`. Counts alone would hide a case that swaps for another.
- **Impact**: cheap evidence for any change to `test/helpers/layout-test-*.ts` or to a vendored directory a suite lists.
- **Confidence**: High

## Observation: the port's layout of both stress models is byte-equal to the oracle's

- **Context**: T4. `Issue665Test` asserts nothing and `Issue700Test` only that edges are routed, so passing suites say
  little about the layout.
- **Finding**: `tools/oracle/run.sh <outDir> <the two .elkt>` against the port (`registerLayered`,
  `registerTestAlgorithms`, `loadGraphFile`, `RecursiveGraphLayoutEngine`, `exportLikeOracle` plus a newline) gives the
  same bytes for `665_includeChildrenDoesntStop` (3,685 bytes) and `hierarchicalLayoutMixing` (10,645 bytes): a stress
  child inside a layered `INCLUDE_CHILDREN` parent, and a `SEPARATE_CHILDREN` child with another direction.
- **Impact**: these two models are candidates for goldens if the maintainer wants the mixed-algorithm path pinned; this
  mission adds no ref (ruling boundary).
- **Confidence**: High

## Observation: prettier reflows a whole Markdown table when its widest cell changes

- **Context**: T5, one row of the runbook table in `docs/architecture/alg-layered-compound.md`.
- **Finding**: the edited cell was the widest of its column, so a shorter text made `prettier --write` re-pad all twelve
  rows. A replacement of the same length keeps the diff to one row.
- **Impact**: when a docs edit touches the widest cell of a wide table, match its length or accept the reflow knowingly.
- **Confidence**: High
