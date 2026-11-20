<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: test-helper-consolidation (issue #46, 2026-11-19)

Planning-time notes are in `test-helper-consolidation-planning.md`. Journal:
`plans/test-helper-consolidation/decision-journal.md`. The map of every `Factories` object, replay block and caller
table: `plans/test-helper-consolidation/inventory.md`.

## Observation: the `Factories` exports look alike and are not interchangeable

- **Context**: T1, writing `test/helpers/layered-replay-factories.ts` from 109 per-file objects.
- **Finding**: the exports differ in three ways that change what a replay does: which processors are injected as
  classes rather than created through `IntermediateProcessorStrategy`; which phases are dispatched; and what a phase
  outside that set does (falls through to the last enum, asserts `P5_EDGE_ROUTING` with `expect`, or throws). Strategy
  names such as `INTERACTIVE` exist in several enums, so a broader object changes behaviour silently.
- **Impact**: a new anchored test picks the export whose behaviour it needs and never swaps one for another to save an
  import. An object that injects the class under test, or closes over a test-local value, stays in its file (72 do).
- **Confidence**: High

## Observation: the runner's AWT snapshot measurer throws on a text it never recorded

- **Context**: T3, moving `Issue457Test` to `defineLayoutTest` with `defaultConfiguration: true`.
- **Finding**: `@DefaultConfiguration` labels every label-less node with its identifier, and `ensureSensibleLabelSize`
  sizes labels from `test/golden/refs/java/layered-label-metrics.json`. A text missing from that table throws at
  `test/helpers/layout-test-text-measurer.ts:42` before layout. The 457 graph's node ids (`n`, `ni`) are not recorded;
  `ELK_TEST_TEXT_MEASURER=fixed` runs the suite with fixed-advance sizes and shows whether the assertions would hold.
- **Impact**: a suite that moves onto the runner with defaults may need its node ids added to
  `tools/vectors/layered-label-metrics-texts.txt` and a JVM re-record first (#118 for 457). Check the ids of the graph
  against the table before converting.
- **Confidence**: High

## Observation: a configurator value can reach a runner check through a suite-local variable

- **Context**: T3, `Issue475Test`'s port-added check that each child's `NODE_SIZE_FIXED_GRAPH_SIZE` equals what the
  configurator set; the runner hands a check only the graph.
- **Finding**: the runner realises an experiment lazily inside its first check (`ExperimentRun.graph`,
  `layout-test-runner.ts:309`), configurator first (`:271`), one `it` per case in experiment order (`:431-437`). A
  variable the configurator sets is therefore the running experiment's value when that experiment's check reads it.
- **Impact**: this holds for one check per experiment, or for checks that only read. It would break if the runner
  realised all experiments up front.
- **Confidence**: High

## Observation: `typescript` 7 has no classic compiler API; `oxc-parser` is in `node_modules`

- **Context**: T1, a throwaway script to find every `const x: Factories = {…}` and resolve its identifiers.
- **Finding**: `typescript@7.0.2` exports only `version` from its main entry (the AST API is under `./unstable/*`).
  `oxc-parser` (`parseSync(file, text)`, ESTree with `start`/`end` offsets) is installed and parses the repo's test
  files. A script outside the repo needs `node_modules` linked beside it to resolve the import.
- **Impact**: use `oxc-parser` for one-off AST scans; `tools/complexity/inventory.ts` shows the pattern the repo keeps.
- **Confidence**: High

## Observation: `tsc` does not flag unused imports here

- **Context**: T5-T7, removing the imports a moved object orphaned.
- **Finding**: `tsconfig.json` sets neither `noUnusedLocals` nor a linter. `npx tsc --noEmit --noUnusedLocals`
  filtered to the changed files finds them. On the whole tree it reports 19 names, none in a file this mission
  touched. Four are test-side: `DCPolyomino.test.ts:31` `PolyEntry`, `ElkGraphJsonText.documents.test.ts:10` `ElkNode`,
  `LazyLinkingResource.test.ts:18` `ILinkingDiagnosticContext`, `test/helpers/layered-phase-replay-dump.ts:19`
  `Properties`. Fifteen are in ported `src/` files (`RectilinearConvexHull.ts` twice, `ElkGraphTransformer.ts`,
  `MinWidthLayeringComputation.ts`, `ElkGraphImporter.ts`, `MultiLevelEdgeNodeNodeGap.ts`, `BoxLayoutProvider.ts`,
  `LazyLinkingResource.ts`).
- **Impact**: run that command after any edit that removes code. The four test-side names are a cleanup for another
  PR; the fifteen in `src/` are probably Java-faithful (unused Java locals and private methods): read the Java first.
- **Confidence**: High

## Observation: load on this machine swings between 10 and 125 within minutes

- **Context**: three full-suite coverage runs (18:03, 18:25, 18:31).
- **Finding**: each took about five minutes and none timed out, at load averages from 10 to 124. Planning saw one
  5000 ms timeout in `NodeReferenceMatcher.test.ts` at load 101.
- **Impact**: the suite's duration is not a load signal; rerun a timed-out file alone before calling it a failure.
- **Confidence**: Medium
