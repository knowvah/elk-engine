<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: honour `ELK_MODELS_DIR` in the census and corpus tests

## Context

`test/corpus/census.test.ts:25` and `test/corpus/corpus.test.ts:41` call `resolveModelsDir({})`; the resolver
(`test/corpus/corpus.ts:122-131`) reads `ELK_MODELS_DIR` from the env it is handed, defaulting to `process.env`.
Decisions [D1](../decisions.md#d1-both-files-resolve-from-the-real-environment),
[D2](../decisions.md#d2-proof-a-scratch-clone-and-a-negative-run-no-new-test),
[D3](../decisions.md#d3-the-runbook-loses-the-symlink-step).

## Read-set

`test/corpus/corpus.ts:20-131`, `test/corpus/census.test.ts:1-30,255-275`, `test/corpus/corpus.test.ts:1-120`,
`docs/architecture/elk-upgrade.md:565-635`, `test/docs/elk-upgrade-runbook.test.ts`,
`plans/elk-upgrade-runbook/decision-journal.md` (row 2026-11-14 17:10).

## Write-set

`test/corpus/census.test.ts`, `test/corpus/corpus.test.ts`, `docs/architecture/elk-upgrade.md`,
`plans/models-dir-env/decision-journal.md`; scratch under `$TMPDIR/pm98-*`, removed before the commit.

## Steps

1. **Red (D2 step 1).** Build the scratch clone of the base so that its default models path is absent, for example:

   ```sh
   MODELS="$(cd ../../eclipse-elk/elk-models && pwd)"      # run from the queue worktree
   S="$(mktemp -d "${TMPDIR%/}/pm98-XXXX")"; mkdir -p "$S/a/b"
   git clone -q --shared "$PWD" "$S/a/b/repo" && git -C "$S/a/b/repo" checkout -q <base>
   ln -s "$PWD/node_modules" "$S/a/b/repo/node_modules"
   test ! -e "$S/a/eclipse-elk/elk-models" && echo "default path absent"
   (cd "$S/a/b/repo" && ELK_MODELS_DIR="$MODELS" npx vitest run test/corpus/census.test.ts test/corpus/corpus.test.ts)
   ```

   (A sketch; adjust the layout under stop condition 3 if vitest cannot run there.) Journal the passed/skipped counts
   and the skip texts: six skipped, naming the clone's default path.
2. **Fix (D1).** Replace `resolveModelsDir({})` with `resolveModelsDir()` at `census.test.ts:25` and
   `corpus.test.ts:41`. Leave `corpus.test.ts:46-60` untouched.
3. **Runbook (D3).** Delete the § 14 step 5 paragraph and `sh` block about the symlink; make the following paragraph
   read on its own.
4. **Local checks.** `npx vitest run test/corpus/census.test.ts test/corpus/corpus.test.ts test/docs/elk-upgrade-runbook.test.ts`
   with `ELK_MODELS_DIR` unset: same counts as at the base (record both). `npx prettier --check` on the three edited
   files; `npm run typecheck`.
5. **Commit** T1 (see batch overview) with a temporary commit message file.
6. **Green (D2 step 2).** Move the clone to the T1 commit with
   `git -C "$S/a/b/repo" fetch -q "$PWD" HEAD && git -C "$S/a/b/repo" checkout -q FETCH_HEAD`, then run the same
   vitest command as step 1: 0 skipped, every test the base skipped now passes (51 passed of 51 at planning; the base gives 46 passed, 6 skipped of 52).
7. **Negative (D2 step 3).** In the queue worktree:
   `ELK_MODELS_DIR=/nonexistent npx vitest run test/corpus/census.test.ts test/corpus/corpus.test.ts`: the drift test
   and the golden block skip with text naming `/nonexistent`; nothing fails.
8. `rm -rf "$S"`; journal steps 1, 4, 6, 7 with counts in one `gate` row each (or one row with all four).

## Acceptance criteria

- Given a checkout whose default `../../eclipse-elk/elk-models` is absent and `ELK_MODELS_DIR` pointing at the pinned
  models checkout, when the two files run at the base, then six tests skip; when they run at the T1 commit, then none
  skip and all pass.
- Given the queue worktree with `ELK_MODELS_DIR=/nonexistent`, when the two files run after T1, then the census drift
  test and the golden-input tests skip and their skip text contains `/nonexistent`.
- Given the queue worktree with `ELK_MODELS_DIR` unset, when the two files run after T1, then their passed/skipped
  counts equal the base's.
- Given `docs/architecture/elk-upgrade.md`, then § 14 contains no `ln -s` and no reference to issue #98, and
  `test/docs/elk-upgrade-runbook.test.ts` passes.
- Given `git diff <base> -- test/`, then only the two call-site lines differ (plus a rename under D1 if journaled).

## Observability

N/A: test-tooling change; no runtime operation added.

## Rollback

Reversible: revert the commit (two lines and one runbook paragraph).
