<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: models-dir-env (issue #98, 2026-11-20)

Planning-time notes are in `models-dir-env-planning.md`. Journal: `plans/models-dir-env/decision-journal.md`.

## Observation: `census.test.ts` and `corpus.test.ts` honour `ELK_MODELS_DIR`

- **Context**: both files called `resolveModelsDir({})` at module scope; they now call `resolveModelsDir()`.
- **Finding**: with the variable set, the census drift test and the four golden-input tests read the directory it
  names. The observation "two corpus tests ignore `ELK_MODELS_DIR`" in `elk-upgrade-runbook.md` and roadmap tool-side
  row 6 describe the tree before this change; they are history and were not edited. The rehearsal clone of
  `docs/architecture/elk-upgrade.md` § 14 needs no symlink at its default path.
- **Impact**: do not add the symlink back. Every caller of `resolveModelsDir` outside the resolver's own two tests
  (`corpus.test.ts:49`, `:58`) reads `process.env`.
- **Confidence**: High

## Observation: the two files' test count depends on whether the models directory resolves

- **Context**: the three proof runs of D2 (scratch clone at the base and at the fix, `ELK_MODELS_DIR=/nonexistent`).
- **Finding**: resolved: 51 passed, 0 skipped (51). Not resolved: 46 passed, 6 skipped (52), because the
  `goldens not verified: <reason>` placeholder is registered only then, and the drift test's title carries the reason.
  Since the fix, a set `ELK_MODELS_DIR` that does not resolve to the pinned commit produces the second shape even when
  the default path holds the pinned clone.
- **Impact**: a full-suite count is comparable with a base's only when `ELK_MODELS_DIR` is unset or names the pinned
  checkout: a wrong value moves 5 tests from passed to skipped and adds one skipped test (by that arithmetic the
  coverage run's 93 skipped would read 99; not run). The queue session leaves the variable unset.
- **Confidence**: High

## Observation: a `--shared` clone with a linked `node_modules` runs vitest

- **Context**: D2's scratch clone under `$TMPDIR`, two directories deep so that `../../eclipse-elk/elk-models` is
  absent.
- **Finding**: `git clone --shared <worktree>`, `git checkout <sha>`, `ln -s <worktree>/node_modules` is enough for
  `npx vitest run <files>`; vitest reports the clone's real path (`/private/var/…`) as its root. Moving the clone to a
  later commit is `git fetch <worktree> HEAD && git checkout FETCH_HEAD`. Each run of the two files took under a
  second.
- **Impact**: a red-at-base, green-at-fix proof for a test-only change that depends on the checkout's location costs
  seconds and needs no `npm ci`. Remove the `node_modules` link before `rm -rf` of the clone.
- **Confidence**: High
