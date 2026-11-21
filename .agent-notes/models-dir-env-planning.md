<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: models-dir-env (issue #98, 2026-11-20)

## Observation: only two call sites pass a literal env to `resolveModelsDir`

- **Context**: `grep -rn resolveModelsDir test tools src` at `6307bf36` while sizing the fix.
- **Finding**: 26 calls. `census.test.ts:25` and `corpus.test.ts:41` pass `{}` at module scope;
  `corpus.test.ts:49` (`{}`) and `:58` (`{ ELK_MODELS_DIR: '/nonexistent/elk-models' }`) pass their own env on
  purpose, as tests of the resolver. All 22 others pass nothing and read `process.env`.
- **Impact**: the fix is two lines; no other caller needs review.
- **Confidence**: High

## Observation: the census drift test's title embeds the skip reason

- **Context**: Reading `census.test.ts:262-263`.
- **Finding**: the title is `` `matches the discovered corpus (${skipReason || 'pinned clone'})` ``, so the test name
  changes with the resolved directory's state. That is existing behaviour; after the fix the skip text can name the
  `ELK_MODELS_DIR` path instead of the default one.
- **Impact**: comparing test names across runs with different environments shows a renamed test, not a new one.
- **Confidence**: High

## Observation: the queue environment does not set `ELK_MODELS_DIR`

- **Context**: `echo "${ELK_MODELS_DIR-unset}"` in the queue session; `tools/coverage-gate/run.sh` and the CI
  workflows do not mention the variable.
- **Finding**: unset; the default path exists and is at the manifest commit `ac5af2ba…`.
- **Impact**: in the queue worktree the fix changes nothing observable unless the variable is set, so the coverage
  counts should equal the base's.
- **Confidence**: High

## Observation: the D2 proof runs as sketched (trial at planning, scratch only)

- **Context**: T1 step 1 sketch tried at planning in a throwaway `git clone --shared` of `6307bf36` under `$TMPDIR`,
  nested two levels so `../../eclipse-elk/elk-models` was absent, `node_modules` symlinked from the queue worktree.
  The fix was applied only in that clone, which was then deleted; the queue worktree was not edited.
- **Finding**: base with `ELK_MODELS_DIR` set: 2 files, 46 passed, 6 skipped (52). With the two-line fix: 51 passed
  (51), none skipped (the `goldens not verified` placeholder is no longer registered, hence 51, not 52). With
  `ELK_MODELS_DIR=/nonexistent`: 46 passed, 6 skipped, both skip texts naming `/nonexistent`. Each run took seconds.
- **Impact**: stop condition 3 (proof cannot run) is unlikely; the expected counts for T1 are 46+6 → 51+0.
- **Confidence**: High
