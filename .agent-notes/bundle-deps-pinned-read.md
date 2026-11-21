<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: bundle-deps-pinned-read (issue #89, 2026-11-20)

Planning-time notes are in `bundle-deps-pinned-read-planning.md`. Journal:
`plans/bundle-deps-pinned-read/decision-journal.md`.

## Observation: no pin-stamped tool needs the ELK checkout at `HEAD` any more

- **Context**: T1 and T2, replacing the two `HEAD` guards.
- **Finding**: `tools/bundle-deps.ts` (manifests), `tools/melk/sync-sources.sh` (`.melk` blobs) and
  `tools/oracle/build.sh` (the worktree) all read the pin by object id and ask only that the checkout contains it
  (`git cat-file -e <pin>^{commit}`). `../elk-oracle` holds the pin while its `HEAD` is the pin plus the patch commits,
  so it serves as `ELK_SOURCE_DIR` for all three when `../elk` has moved on.
- **Impact**: the `git archive <pin> plugins | tar -x` recipe of `.agent-notes/deferred-bundles-adr.md` for checking
  `bundle-deps.json` by hand is no longer needed: run `npx vitest run test/architecture` or
  `npx tsx tools/bundle-deps.ts | cmp - test/architecture/bundle-deps.json`. A skip of the regeneration case now means
  the checkout is missing or has not fetched the pin, and the skip reason says which.
- **Confidence**: High (58 passed, 0 skipped with `../elk` and with `../elk-oracle`)

## Observation: `tools/bundle-deps.ts` stamps `tools/oracle/ELK_COMMIT`, not the checkout's `HEAD`

- **Context**: T1, decision D1.
- **Finding**: `generateBundleDeps(elkDir, commit)` takes the commit, and the CLI passes `readPinnedCommit()`. The
  always-running case `pinned commit › committed elkCommit equals tools/oracle/ELK_COMMIT` fails from the moment
  `ELK_COMMIT` is bumped until `npx tsx tools/bundle-deps.ts --write` has run.
- **Impact**: in a pin move, bump `tools/oracle/ELK_COMMIT` first, then `--write`. The same goes for the live case of
  `test/melk/sync-sources.test.ts`, which fails until `tools/melk/sync-sources.sh` has run. Both are in the runbook's
  section 11 list of stamp tests.
- **Confidence**: High

## Observation: which hand edit of `bundle-deps.json` only the regeneration case catches

- **Context**: T1, the negative proof.
- **Finding**: deleting `src/alg/common` from `src/alg/layered` fails three cases (the layered mapping case and the
  import-direction case catch it without any ELK checkout). Adding `src/alg/force` in sorted position to
  `src/alg/radial` fails only `regeneration › regenerated deps equal the committed file`, and with
  `ELK_SOURCE_DIR=/nonexistent` it fails nothing. An unsorted insert is caught by the sorted-keys case instead.
- **Impact**: to prove the regeneration case is live, use a sorted extra `requires` entry that no `src/` import needs.
- **Confidence**: High

## Observation: `sync-sources.sh` finds the repository from its own path

- **Context**: T2, running the base version of the script for contrast.
- **Finding**: the script sets `ROOT` to two directories above itself and reads `ROOT/tools/oracle/ELK_COMMIT`, so a
  copy under `$TMPDIR` cannot run. A copy placed beside the real script (`tools/melk/.sync-base.sh`, deleted after)
  runs against the real repository. `--check` writes nothing either way.
- **Impact**: the test `test/melk/sync-sources.test.ts` therefore runs the real script and varies only
  `ELK_SOURCE_DIR`; it cannot point the script at a fake pin.
- **Confidence**: High

## Observation: `deferred-bundles-adr.md` cites the fitness file and `bundle-deps.ts` by line

- **Context**: T3, after T1 added lines above the cited ones.
- **Finding**: `docs/architecture/deferred-bundles-adr.md` cites `tools/bundle-deps.ts:30-47`
  (`IN_SCOPE_SUFFIXES`) and `module-boundaries.fitness.test.ts` `:307`, `:323`, `:350` (and `:323` again in its
  comparison table, row 13). No test checks these numbers.
- **Impact**: an edit above those lines in either file has to update the ADR's citations in the same commit.
- **Confidence**: High
