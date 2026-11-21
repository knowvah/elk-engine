<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: read manifests at the pin; skip only without it

## Context

`regenerationSkipReason` (`test/architecture/module-boundaries.fitness.test.ts:328-337`) skips the regeneration
check unless the ELK checkout's `HEAD` is the committed `elkCommit`, because `readManifests` (`tools/bundle-deps.ts:142-149`)
reads the working tree. See [README](../README.md#objective), [D1](../decisions.md#d1-read-manifests-from-the-object-store-at-an-explicit-commit),
[D2](../decisions.md#d2-skip-the-regeneration-check-only-when-the-checkout-lacks-the-commit),
[D3](../decisions.md#d3-prove-the-reader-on-a-throwaway-git-repo).

## Read-set

- `tools/bundle-deps.ts` (all 170 lines)
- `test/architecture/module-boundaries.fitness.test.ts:1-20,328-353`
- `test/architecture/oracle-build.test.ts` (throwaway-repo precedent: env, `-c` identity, cleanup)

## Write-set

`tools/bundle-deps.ts`, `test/architecture/bundle-deps.test.ts` (new),
`test/architecture/module-boundaries.fitness.test.ts` (imports, `regenerationSkipReason`, the generate call, one new
case), `plans/bundle-deps-pinned-read/decision-journal.md`.

## Steps

1. Write `test/architecture/bundle-deps.test.ts` per D3 (SPDX header, a header comment naming #89 and D3, named
   constants, helpers under 30 NLOC). Run it: red. Journal the failing cases and why.
2. Implement D1 in `tools/bundle-deps.ts`: `readManifests(elkDir, commit)`, `generateBundleDeps(elkDir, commit)`,
   `readPinnedCommit`, `elkCommitPresent`; `main` passes `readPinnedCommit()`; remove `readElkCommit` after a grep
   (`grep -rn readElkCommit tools test src`) shows no other importer; drop imports that become unused. Rerun: green.
3. Implement D2 in the fitness file, and add the case `committed elkCommit equals tools/oracle/ELK_COMMIT` outside
   the `regeneration` block (it never skips). Do not touch the other cases.
4. Proofs, each journaled with the counts vitest prints:
   - `npx vitest run test/architecture/module-boundaries.fitness.test.ts`: 58 passed, none skipped (`../elk` at pin).
   - same with `ELK_SOURCE_DIR=../elk-oracle`: 58 passed, none skipped (was 56 passed, 1 skipped at planning).
   - same with `ELK_SOURCE_DIR=/nonexistent`: 57 passed, 1 skipped, reason `ELK source dir not found`.
   - same with `ELK_SOURCE_DIR=<a throwaway repo without the pin>`: 1 skipped with the D2 reason.
   - Negative proof that the check now bites off-`HEAD`: in the queue worktree, delete one `requires` entry from
     `test/architecture/bundle-deps.json`, run with `ELK_SOURCE_DIR=../elk-oracle`, see the regeneration case fail,
     then `git checkout -- test/architecture/bundle-deps.json` and confirm `git diff --exit-code` on it. Never
     commit the edit.
   - `npx tsx tools/bundle-deps.ts | cmp - test/architecture/bundle-deps.json` with the default checkout and with
     `ELK_SOURCE_DIR=../elk-oracle`: both equal (the CLI now stamps the pin, not `HEAD`).
5. `npx prettier --check` and `npx tsc --noEmit` clean; `npx tsx tools/complexity/check.ts tools/bundle-deps.ts`
   clean. Journal a `fix` row; commit (batch overview).

## Interface contracts

T2 and T3 rely on: `readPinnedCommit(repoRoot?: string): string`, `elkCommitPresent(elkDir: string, commit: string):
boolean`, `generateBundleDeps(elkDir: string, commit: string): BundleDeps`, exported from `tools/bundle-deps.ts`.
T2 does not import them (it is bash); T3's docs describe them.

## Acceptance criteria

- Given a throwaway repo with commits A and B and an uncommitted edit, when `generateBundleDeps(dir, A)` runs, then
  it stamps A and returns A's `requires`, and with B it returns B's, ignoring the working tree.
- Given `ELK_SOURCE_DIR=../elk-oracle` (HEAD is not the pin, the pin is present), when the fitness file runs, then
  the regeneration case runs and passes (no skip).
- Given a temporarily hand-edited `bundle-deps.json` and that checkout, then the regeneration case fails; after
  `git checkout` the file is identical to the base.
- Given a checkout without the pin, then the case is skipped with `does not contain committed elkCommit`.
- Given `npx tsx tools/bundle-deps.ts` with either checkout, then its output equals the committed file byte for byte.

## Observability

N/A: a developer tool and a test; the skip reason names the checkout and the commit.

## Rollback

Reversible: revert the commit.
