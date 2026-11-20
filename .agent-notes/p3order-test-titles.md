<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: p3order-test-titles (issue #62, 2026-11-20)

Planning-time notes are in `p3order-test-titles-planning.md`. Journal:
`plans/p3order-test-titles/decision-journal.md`.

## Observation: what a ref's rows reach, per function, from one vitest run

- **Context**: T1, checking that "the `layered-compound.json` rows reach it" is true for three files before writing
  it in a title. Mission 7h measured this with a `rowcov.sh` that is not in the tree.
- **Finding**: `npx vitest run src/alg/layered/LayeredCompoundVectors.test.ts --coverage --coverage.reporter=json
--coverage.reportsDirectory="$TMPDIR/<dir>" --coverage.include='<src file>'` (one `--coverage.include` per file,
  and the four `--coverage.thresholds.<name>=0` flags so the run exits 0) writes `coverage-final.json` with `fnMap`/`f`
  and `branchMap`/`b` for only those files. About 10 s. That test file runs the 540 rows and two structure checks
  and nothing else, so the hits are the rows' hits, summed: a count says some row reaches the function, not which.
- **Impact**: a claim of the form "the rows of ref X reach Y" costs one run to check. No JVM, no ref is touched.
- **Confidence**: High

## Observation: the compound rows do not reach three nested-graph items of p3order

- **Context**: the same measurement, against `plans/layered-compound/unreached.md` (H8 closure 4.1, 4.1a).
- **Finding**: the rows have 0 hits on `GraphInfoHolder.parentGraphData` (`:266`), `GraphInfoHolder.portPositions`
  (`:290`) and the `crossMinDeterministic()` arm of `LayerSweepTypeDecider.useBottomUp` (`:66 if[0]`; the closure
  calls it `:65`). `LayerSweepHierarchicalTwoSidedGreedySwitchTest`, `LayerSweepCrossingMinimizerTest` and
  `SwitchDeciderTest` reach all three (5, 5 and 39 hits). The closure already says so (J); the header comments of
  `GraphInfoHolder.test.ts:3-4` and `LayerSweepTypeDecider.test.ts:3-4` say the rows prove them (#130).
- **Impact**: "proven by the `layered-compound.json` rows" is not true of every nested-graph path of the sweep
  driver. No row sweeps into a child with a deterministic heuristic.
- **Confidence**: High

## Observation: planning's grep for stale staging text was narrower than the text

- **Context**: T2, checking the one other hit planning named (`ElkLayeredTestExecutionState.ts:6`).
- **Finding**: `tools/vectors/LayeredOrderVectors.java:27` matches planning's own pattern and was not listed.
  The wider `staged until|until 7[a-h]|until mission 7|U until|U for the rows` over `src test tools docs` gives
  23 lines at the base, the three titles included. Of the other 20: 5 were read and are stale, 12 name a task of
  their own mission (`T8`, `T11`) and 1 names 7e, not checked, 1 is test data, 1 is tracked by #63. All are in #130.
- **Impact**: a staged-state claim is written as "until 7x", "until mission 7x" and "until T<n>"; a grep for one
  form misses the others.
- **Confidence**: High (the grep); Medium for the unchecked candidates
