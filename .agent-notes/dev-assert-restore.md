<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: dev-assert-restore (issue #127, 2026-11-20)

Planning-time notes are in `dev-assert-restore-planning.md`. Journal: `plans/dev-assert-restore/decision-journal.md`.
Census of what fires: `plans/dev-assert-restore/census.md`.

## Observation: V8's ten-frame stack limit hides the test-helper frames of a deep layout

- **Context**: T2, locating the runner that holds the laid-out root for each `EndLabelPreprocessor.java:377` failure.
- **Finding**: vitest's JSON `failureMessages` carry the default ten stack frames. An assert thrown from inside
  `RecursiveGraphLayoutEngine.layout` is more than ten frames below the replay helper, so 55 of 170 stacks had no
  `test/helpers/` frame at all. `NODE_OPTIONS=--stack-trace-limit=300 npx vitest run <files> --reporter=json` gives
  the full chain; grouping by the first named `test/helpers/` function then found three runners
  (`runRoutingPrefix`, `runRow`, `runPlainFullRow`), not the six files the planning read listed.
- **Impact**: for a stack census, raise the limit before reading helper frames. The first `src/` frame (the site) is
  always within ten frames, so the site grouping of `dev-assert.md` works at the default.
- **Confidence**: High

## Observation: `EndLabelPreprocessor.java:377` fires by port side and direction, not by model

- **Context**: T3, the count #127 expected (170) against what "the model has an end label without a size" selects (572).
- **Finding**: the assert is in `removeLabelOverlaps`, which runs only for the NORTH and SOUTH sides of a horizontal
  layout and the EAST and WEST sides of a vertical one (`EndLabelPreprocessor.java:253-259`). An unsized end label on
  another side has an empty cell that is never checked. The oracle under `-ea` exits 0 on
  `labelStacking_left_down.elkt` and throws on `labelStacking_down_up.elkt`; in the labels sweep
  `labelStacking_left_down` fires for the variants `DOWN` and `UP` only.
- **Impact**: a rule for these rows has to be per model (`withEndLabelRule`, `test/helpers/unsized-end-labels.ts`),
  because a direction variant of a quiet model fires. It turns assertions off for 396 replays that would not fire
  (issue #138 has the narrowing options).
- **Confidence**: High

## Observation: a wrapped runner hides the assert from a test that wants to see it

- **Context**: T3, the new test that pins the `AssertionError` of the #32 site on a JVM row.
- **Finding**: `runRoutingPrefix` now runs the prefix of an unsized end-label model with assertions off, so
  `withAssertions(true, () => replay(row))` around it sees no error. The test injects a factory whose
  `END_LABEL_PREPROCESSOR` runs the real class inside `assertionErrorOf` (`test/helpers/assertion-error-of.ts`),
  i.e. it switches assertions on inside the runner's switch.
- **Impact**: the innermost `withAssertions` wins. A test that must observe an assert on a row a runner rule covers
  has to switch at the processor, through the injected factories.
- **Confidence**: High

## Observation: editing test files while a census run is in flight changes the census

- **Context**: T2. The four `InstancePool` test files were being wrapped (T4) while the full-suite census ran.
- **Finding**: vitest loads each test file when its worker reaches it, so the run saw the wrapped versions and
  reported them green. The census was repaired by rerunning the four files at their committed state.
- **Impact**: do not edit files a detached suite run will still load; work on other files or wait.
- **Confidence**: High

## Observation: the corpus parity run never enables assertions; `test/corpus/sweep.test.ts` lays nothing out

- **Context**: T6, #127's "generic sweep".
- **Finding**: `tools/corpus/ts-layout-compare.ts` forks workers that never call `setAssertionsEnabled`, and
  `test/corpus/sweep.test.ts` is the unit test of the oracle sweep planner. The assert evidence over the corpus is the
  nine layered family sweeps (vitest, assertions on); the other algorithms have no corpus run with assertions on
  (issue #137).
- **Impact**: a restored assert of a non-layered algorithm is checked by the unit suite only.
- **Confidence**: High

## Observation: `plans/dev-assert/inventory.md` and three docs were stale on the `ThresholdStrategy` asserts

- **Context**: T7, recounting the § 6.8 totals.
- **Finding**: `ec315bf5` made `ThresholdStrategy.java:395` and `:403` comments again after #45 landed, without
  touching the inventory or the docs: the inventory still read `restored` for rows 134 and 135, translation rules
  § 6.8 read 124 / 6 / 13, and `alg-layered-placement.md` listed both lines as `devAssert` calls. The totals after
  #127 are 132 restored, 6 restored before a kept throw, 5 comments (#4, #5, #114, #134, #135).
- **Impact**: the inventory's "Superseded by #127" section is the current status table; the rows above it are
  history.
- **Confidence**: High
