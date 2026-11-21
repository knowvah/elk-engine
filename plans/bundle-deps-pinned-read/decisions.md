<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: bundle-deps-pinned-read (issue #89)

AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) and the queue rules apply. D1-D5 were auto-confirmed at
planning (unattended run, 2026-11-20); evidence and rejected options are under
[Auto-confirmed](#auto-confirmed-unattended).

## D1. Read manifests from the object store at an explicit commit

`tools/bundle-deps.ts` stops reading the working tree. `readManifests(elkDir, commit)` reads each in-scope manifest
with `execFileSync('git', ['-C', elkDir, 'show', `${commit}:plugins/${bundle}/META-INF/MANIFEST.MF`])` (argument
array, no shell). `generateBundleDeps(elkDir, commit)` takes the commit as a required argument and stamps it:
`buildBundleDeps(readManifests(elkDir, commit), commit)`. So the stamp always names the commit the manifests came
from, which a dirty or moved working tree could break before.

The CLI (`main`) passes the pin, read by a new `readPinnedCommit(repoRoot = REPO_ROOT)` from
`tools/oracle/ELK_COMMIT` (trimmed; path in a named constant), not `HEAD`. Every pin-stamped tool then reads the pin
by object id (`tools/melk/sync-sources.sh` already does, `:53-56`), and none needs the checkout at `HEAD`.
`readElkCommit` (HEAD) loses its last callers and is removed (grep first: at planning only
`module-boundaries.fitness.test.ts:13,333` imports it; `tools/corpus/ts-layout-compare.ts:157` has its own private
function of that name). `buildBundleDeps`, `serializeBundleDeps`, the parsers and `IN_SCOPE_SUFFIXES` do not change.

One new always-running fitness case ties the stamp to the pin: `committed.elkCommit` equals `readPinnedCommit()`. It
adds an assertion; it changes no existing one.

## D2. Skip the regeneration check only when the checkout lacks the commit

New export `elkCommitPresent(elkDir, commit): boolean`, true when
`git -C <elkDir> cat-file -e <commit>^{commit}` exits 0, false when it fails (the catch returns `false` with a
comment; no empty catch). `regenerationSkipReason` (`module-boundaries.fitness.test.ts:328-337`) returns
`ELK source dir not found: …` as now, else
`ELK checkout <elkDir> does not contain committed elkCommit <sha>` when `elkCommitPresent` is false, else
`undefined`. The test body calls `generateBundleDeps(elkDir, committed.elkCommit)`. The test name and both `expect`
lines stay as they are.

Presence, not ancestry of `HEAD`: the read is by object id, so any checkout holding the object gives the same bytes
(the oracle worktree's three patch commits touch no `MANIFEST.MF`, checked at planning).

## D3. Prove the reader on a throwaway git repo

New `test/architecture/bundle-deps.test.ts`, modelled on `test/architecture/oracle-build.test.ts` (throwaway repo,
`realpathSync(mkdtempSync(tmpdir()))`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`, identity and
`commit.gpgsign=false` passed with `-c`, `afterAll` cleanup). It writes a minimal manifest for each of the 16
`IN_SCOPE_BUNDLES`, commits A (`alg.layered` requires `core`), commits B (`alg.layered` also requires `alg.common`),
then leaves an uncommitted third edit. Cases, each on exact values:

- `generateBundleDeps(dir, A)` stamps A and maps `src/alg/layered` to `['src/core']`;
- `generateBundleDeps(dir, B)` stamps B and maps it to `['src/alg/common', 'src/core']` (the working-tree edit is
  ignored);
- `elkCommitPresent(dir, A)` is true; for `'0'.repeat(40)` and for a non-repo temp dir it is false;
- `readPinnedCommit(root)` on a temp root whose `tools/oracle/ELK_COMMIT` holds `<sha>\n` returns `<sha>`.

Red first (the current `readManifests` reads the working tree and the new exports are missing), then D1/D2.

## D4. `sync-sources.sh` checks presence, not `HEAD`

`tools/melk/sync-sources.sh:44-47` dies unless `HEAD` is the pin, though it reads every blob as `$PINNED:<path>`.
The runbook's hazard row (`docs/architecture/elk-upgrade.md:228`) assigns this to #89. Replace the two checks with:

```bash
git -C "$ELK_SOURCE_DIR" rev-parse --git-dir >/dev/null 2>&1 ||
  die "ELK_SOURCE_DIR is not a git checkout: $ELK_SOURCE_DIR"
git -C "$ELK_SOURCE_DIR" cat-file -e "$PINNED^{commit}" 2>/dev/null ||
  die "ELK checkout $ELK_SOURCE_DIR does not contain $PINNED"
```

and delete the now-unused `ACTUAL`. Nothing else in the script changes. New `test/melk/sync-sources.test.ts` runs
the script with `execFileSync('bash', [script, '--check'], { env })` (paths in `env`, never in a `-c` string):
non-repo temp dir → exit 1 and `error: ELK_SOURCE_DIR is not a git checkout: <dir>`; throwaway repo with one commit
→ exit 1 and `error: ELK checkout <dir> does not contain <pin>` (red before: `ELK checkout is at …`). A live case runs
`--check` against `resolve(repoRoot, process.env.ELK_SOURCE_DIR ?? '../elk')` and expects exit 0, skipped (with the
reason in the name, as the fitness test does) when that checkout lacks the pin.

## D5. Docs scope

Only the sites that describe #89's behaviour: `docs/architecture/elk-upgrade.md` lines 214 (comment), 228 (hazard
row), 231-233 (`bundle-deps.ts --write` paragraph: it reads the `Require-Bundle` headers at the pin from
`$ELK_SOURCE_DIR`'s object store) and 625 (the regeneration test runs wherever the checkout contains the pin), and
`docs/architecture/deferred-bundles-adr.md:80` ("runs only when the ELK checkout is at the pin" → runs whenever the
checkout contains the pin, since #89). No `docs-site/` page mentions the skip (grep at planning), so no translation
changes. `test/docs/elk-upgrade-runbook.test.ts` must stay green.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected, and why | Evidence |
| -------- | ------ | ----------------- | -------- |
| D1 reader | `git show <commit>:<path>`, one reader for test and CLI | Keep the working-tree reader for the CLI and add a second git reader for the test: two readers, and a dirty tree could still be stamped with a commit it does not match. `git archive` to a temp dir (the issue's manual recipe): needs `tar` and a temp tree for 16 small files | `git -C ../elk show 8bca22f4:<manifest> \| cmp - ../elk/<manifest>`: equal for `core`, `alg.layered`, `graph.text`, `core.debug.grandom`; the issue's byte-for-byte check of all 16 through `archive` |
| D1 CLI commit | `tools/oracle/ELK_COMMIT` | `HEAD` (status quo): once D4 lets `sync-sources.sh` run off-`HEAD`, `--write` on a checkout not at `$NEW` would stamp the old `HEAD`, and the regeneration check (which reads at the stamp) would pass it. Nothing tied the stamp to the pin (`grep ELK_COMMIT test` hits only corpus tests) | `docs/architecture/elk-upgrade.md:214,231`; `sync-sources.sh:43,53` |
| D2 skip | object present | `merge-base --is-ancestor <pin> HEAD`: stricter than the read needs; a checkout that fetched the pin but sits on another branch would skip for no reason | `../elk-oracle` (HEAD `cb2b6d54`): `cat-file -e` and `--is-ancestor` both succeed; `git log 8bca22f4..HEAD -- 'plugins/*/META-INF/MANIFEST.MF'` empty |
| D3 test seam | throwaway repo, runs in CI | Live-checkout-only cases: skip in CI (no ELK checkout there), so the reader would be untested where it matters | `.github/` never sets `ELK_SOURCE_DIR`; precedent `oracle-build.test.ts` |
| D4 scope | include | File as `follow-up`: the runbook already names #89 as the fix for this exact row, and the mechanism is the same | `elk-upgrade.md:228` |
| D5 scope | four sites in two files | Also the translated `guide/architecture.md` pages: they never mention the skip | `grep -rln '#89\|at the pin and is skipped' docs docs-site` lists only the two files |

Rollback for every decision: revert the commit; no data, ref, cache or oracle state changes.

## Planning baseline (Phase 8, 2026-11-20, base `6a16e697`)

`npm run format:check` clean, `npm run typecheck` clean, `npm run coverage` (sweep dirs `/nonexistent`, under
`nice -n 10`) exit 0: 1174 test files passed, 10 skipped; 49313 tests passed, 93 skipped; statements 98.81%, branches
96.99%, functions 98.56%, lines 98.86%. Every write-set file exists; `chore/issue-queue` is checked out; the tree held
only this brief.
