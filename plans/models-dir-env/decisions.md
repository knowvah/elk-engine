<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: models-dir-env (issue #98)

AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) and the queue rules apply. D1-D4 were auto-confirmed at
planning (unattended run, 2026-11-20); evidence and rejected options are under
[Auto-confirmed](#auto-confirmed-unattended).

## D1. Both files resolve from the real environment

`test/corpus/census.test.ts:25` becomes `const resolution = resolveModelsDir();` and
`test/corpus/corpus.test.ts:41` becomes `const defaultResolution = resolveModelsDir();`. Nothing else in either file
changes: the two `resolveModelsDir` tests at `corpus.test.ts:46-60` pass their own env objects on purpose (one is
about the default path, one about the override) and stay as they are. The variable name `defaultResolution` may be
renamed (for example `resolution`) only if it now misleads; the journal records the choice.

This changes which directory two landed tests read, not any expected value (AD-13 is not engaged). In the queue
worktree, where `ELK_MODELS_DIR` is unset, both files read the same directory as before.

## D2. Proof: a scratch clone and a negative run, no new test

The module-scope resolution has no unit seam, and the issue's "Done when" is behavioural, so the evidence is three
runs of the two files, journaled with counts:

1. **Red at the base.** A scratch clone of the base commit under `$TMPDIR`, nested so that its
   `../../eclipse-elk/elk-models` does not exist, `node_modules` linked from the queue worktree, `ELK_MODELS_DIR`
   set to the pinned models checkout: `npx vitest run test/corpus/census.test.ts test/corpus/corpus.test.ts` skips six
   tests (the census drift test, four golden-input tests, the placeholder).
2. **Green after the fix.** The same with a clone of the fix commit: 51 passed, 0 skipped (the count the #44
   rehearsal saw with the symlink). If the count differs from 51, journal the actual total; the bar is "0 skipped and
   every test the base skipped now passes".
3. **The variable wins over an existing default.** In the queue worktree after the fix,
   `ELK_MODELS_DIR=/nonexistent npx vitest run <the two files>`: the census drift test and the golden block skip,
   and the skip text names `/nonexistent`.

No fitness test is added (for example one forbidding `resolveModelsDir({})` outside the default-path tests): the
issue does not ask for one and AD-14/YAGNI applies to test tooling as much as to `src/`. If the executor finds a
cheap guard worth having, it files a `follow-up` issue instead.

## D3. The runbook loses the symlink step

In `docs/architecture/elk-upgrade.md` § 14 step 5, the paragraph beginning "Two test files resolve the models
directory from the default relative path only" and its `sh` block (the `mkdir`/`ln -s`/`vitest`/`rm` lines) are
deleted. The next paragraph ("Other differences between the clone's suite and the original checkout's are expected")
loses "Other" or is reworded so it reads on its own; wording is push-forward. Step numbering and section anchors do
not change. `test/docs/elk-upgrade-runbook.test.ts` stays green.

## D4. History stays as written

Earlier lines of `plans/roadmap.md` (the § "tool-side" table row 6 and the follow-ups line naming #98),
`.agent-notes/elk-upgrade-runbook.md` and `plans/elk-upgrade-runbook/` record what was true on 2026-11-14 and are not
edited. The new roadmap revision and `.agent-notes/models-dir-env.md` say that #98 is fixed on the branch.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
| -------- | ------ | -------- | -------- |
| D1 | `resolveModelsDir()` at the two call sites, the issue's suggested fix | (a) change `resolveModelsDir`'s default or add a `resolveModelsDirFromEnv` helper: touches a function 22 other callers use correctly, for no gain; (b) read `process.env` inline in the test files: duplicates the resolver's override rule | `grep -rn resolveModelsDir` at `6307bf36`: every other call site passes nothing; `corpus.ts:122-131` defaults `env` to `process.env` |
| D2 | Behavioural proof (scratch clone red/green, negative run), no new test | a fitness test banning `resolveModelsDir({})`: unrequested tooling; a unit test: no seam at module scope | #98 "Done when"; the rehearsal journal row (51 of 51 with the symlink, six skipped without) |
| D3 | Delete the paragraph and block | keep a note that the issue was fixed: the runbook describes the current procedure, history lives in plans | #98 "Done when … the runbook's symlink step is removed" |
| D4 | Leave history untouched | correct the earlier rows | Queue rules: "never edit an earlier line" of the roadmap; CLAUDE.md keeps `plans/` as archaeology |

The issue calls the fix "maintainer's choice"; the maintainer labelled it `queue:ready` with that fix as the only
option offered, so the planner took it rather than parking.
