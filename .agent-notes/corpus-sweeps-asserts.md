<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: corpus-sweeps-asserts (issue #116, 2026-11-25)

Planning-time notes are in `corpus-sweeps-asserts-planning.md`. Journal: `plans/corpus-sweeps-asserts/decision-journal.md`.
Census of what the sweeps evaluate: `plans/corpus-sweeps-asserts/census.md`.

## Observation: a green sweep with assertions on can evaluate almost no assert

- **Context**: T1. All thirteen sweeps were green, so a probe counted the `devAssert` calls each one evaluates.
- **Finding**: `json`, `elkj`, `elkt`, `dot-export` and `label-sizing` evaluate one site, `InstancePool.ts:37`, three to
  six times per run. They parse, convert and write, and lay nothing out. The eight layered family sweeps evaluate 78
  of the 125 `devAssert(` lines under `src/alg/layered`; 61 of the 140 lines in `src/` are never evaluated with
  assertions on by any sweep (14 of them in other bundles, issue #137).
- **Impact**: "the sweep is green with assertions on" is evidence only for the sites that sweep reaches. Check a
  site's row in the census before citing a sweep for it.
- **Confidence**: High

## Observation: counting `devAssert` calls by site from inside vitest

- **Context**: T1, the probe (`census.md` § 4).
- **Finding**: a temporary test file that does `vi.mock('../../src/java/lang/DevAssert.js', …)` and then
  `await import('./<name>-sweep.test.ts')` runs the sweep's own `it` blocks with every `devAssert` call routed
  through the mock. The raw line of the caller frame is the transformed module's line, not the source line
  (`InstancePool.ts`: 36 raw, 37 in the source). Calling the runner's own `Error.prepareStackTrace` on the structured
  frames gives the mapped line. Doing that once per new raw position and setting `Error.stackTraceLimit = 3` keeps
  45 million calls cheap: `pipeline` took 214 s against 157 s without the probe.
- **Impact**: a site census needs no change to `src/` or to a sweep, and no committed tool.
- **Confidence**: High

## Observation: the corpus never checks the #32 assert with assertions on

- **Context**: T1, reading the census for the `withEndLabelRule` rows.
- **Finding**: `EndLabelPreprocessorPlacement.ts:117` (`EndLabelPreprocessor.java:377`) has no evaluation with
  assertions on in any sweep. Every sweep layout that reaches the line is in one of the 145 layouts the rule runs
  with assertions off (135 in `labels`, 10 in `compound`; none in `routing` or part b of `loops`).
- **Impact**: for #138, narrowing the rule cannot be validated by a corpus case where the assert holds; the unit
  tests are the only place it is checked and passes.
- **Confidence**: High

## Observation: the sweep stamps go stale on every oracle rebuild, and the tests do not read them

- **Context**: T1, checking D5 before trusting the recorded data.
- **Finding**: `compute_stamp` of `tools/oracle/*-sweep.sh` hashes `oracle-build.json`, which holds `builtAt` and the
  patch list. The oracle was rebuilt on 2026-11-25 with patch 0004, so all nine `test/corpus/.*-sweep/.stamp` files
  of 2026-11-24 are stale. The vitest side checks only that `results.jsonl` exists, so nothing skipped. The data
  was still valid here because 0004 changes one `alg.common/spore` class that only `alg.spore` uses.
- **Impact**: a sweep that runs is not proof that its data matches the current oracle build. Compare the patch set
  by hand, as D5 did, until #139 settles the cache key.
- **Confidence**: High

## Observation: an old sweep cache explains two open sweep failures

- **Context**: T1. Issues #151 and #152 report red `labels` and `phase` sweeps on `main` with a copied-in cache.
- **Finding**: with the queue worktree's caches of 2026-11-24 (pin `8bca22f4`) both sweeps are green at stride 1.
  The main checkout's caches are older than the pin move: `.labels-sweep` of 2026-11-06 and `.phase-sweep` of
  2026-10-29 (read only, `ls -la`). Its `273_insideSelfLoopsWithLabels/RIGHT` row holds the hash `69fe14f4…`; the
  2026-11-24 recording holds `d99a2025…` for all five variants, which #151 gives as the port's hash. Its `phase`
  results hold 0 `throws` rows; the 2026-11-24 recording holds 2,648, all `UnsupportedGraphException` from the
  model-order layerers, which is the exception #152 reports from the port.
- **Impact**: a sweep that fails in a checkout with an old cache is first a cache question. Compare the cache's date
  with the pin move (2026-11-19) and re-record by script before diagnosing the port.
- **Confidence**: High
