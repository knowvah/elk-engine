<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: oracle-stale-caches (issue #85)

AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) and the queue rules apply. D1-D5 were auto-confirmed at
planning (unattended run, 2026-11-20); evidence and rejected options are under
[Auto-confirmed](#auto-confirmed-unattended).

## D1. Exempt `vector-cache/` at the root only

Extend `OUTPUT_FILTER` (`tools/oracle/build.sh:26`) so its last alternative reads
`^\?\? (census|sweep|vector-cache)/$`. Nothing else joins the filter: not `t4/`, `rerecord/` or `final-gate/` (gone at
planning), not a generic `cache/` root. The anchors stay, so only the collapsed untracked root directory matches;
`?? plugins/x/vector-cache/`, `?? vector-cache-old/` and a tracked change under any name stay dirt. Update the comment
above the filter (`build.sh:25`) to say it also lists the local caches the repo's scripts write at the worktree root,
naming `vector-cache.sh`.

## D2. Test seam: a source guard and a throwaway worktree

Replace the last line `main "$@"` with `if [ "${BASH_SOURCE[0]}" = "$0" ]; then main "$@"; fi` (bash 3.2 safe), so
a test can source the file without running `main`. Executing the script behaves as before. New test
`test/architecture/oracle-build.test.ts`, beside the precedent `test/architecture/coverage-gate.test.ts` (which drives
`tools/coverage-gate/run.sh` with `execFileSync('bash', …)`):

- In `realpathSync(mkdtempSync(tmpdir()))` (macOS `/var` is a symlink to `/private/var`; keep every path canonical): `git init` a source repo, one commit (identity passed with `-c`), `git worktree add
  --detach` an oracle dir at that commit, and an empty `patches/` dir.
- Run `bash -c '<constant driver>' _ <build.sh> <source> <oracle> <commit> <tools dir>`. The driver sources
  `build.sh`, assigns `ELK_SOURCE_DIR`, `ELK_ORACLE_DIR`, `COMMIT` and `ORACLE_TOOLS` from `$2…$5`, and calls
  `verify_worktree`. Paths go in as positional arguments, never interpolated into the `-c` string (CodeQL).
- Every git call, the test's and the script's, runs with `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`, so
  the maintainer's `status.showUntrackedFiles`, `commit.gpgsign` or excludes cannot change the result.
- Untracked directories get one file each: git does not list an empty directory.
- Cases, each asserting exit code and the exact stdout or stderr line: clean → 0 and `existing oracle worktree
  verified`; `census/`, `sweep/`, `vector-cache/`, `oracle-build.json` together → 0; plus `t4/` → 2 and `oracle
  worktree out of date…`; `vector-cache-old/` → 2; nested `sub/vector-cache/` → 2; a modified tracked file → 2;
  `vector-cache/` alone → 0 (the case that is red before D1).

Red first: write the suite, run it, journal the failing cases (sourcing the unguarded script runs `main`, so all
fail; after the guard alone, only the `vector-cache/` cases fail), then the guard, then the filter.

## D3. Live proof is read-only; never run `build.sh` on the live oracle

Both `build.sh` and `build.sh --record-only` rewrite `$ELK_ORACLE_DIR/oracle-build.json` (`write_manifest`,
`build.sh:144-152`; `builtAt` always changes). `vector-cache.sh:85-87` hashes that file into every program's salt, so
either run turns the whole vector cache cold (`docs/architecture/elk-upgrade.md:204-205`). The mission proves the
live worktree verified without it:

```bash
before="$(shasum -a 256 "$ELK_ORACLE_DIR/oracle-build.json")"
GIT_OPTIONAL_LOCKS=0 bash -c '. tools/oracle/build.sh
  ELK_SOURCE_DIR="$(abs_path "$ELK_SOURCE_DIR")"; ELK_ORACLE_DIR="$(abs_path "$ELK_ORACLE_DIR")"
  COMMIT="$(tr -d "[:space:]" <"$ORACLE_TOOLS/ELK_COMMIT")"; check_source; verify_worktree'
[ "$before" = "$(shasum -a 256 "$ELK_ORACLE_DIR/oracle-build.json")" ]
```

`GIT_OPTIONAL_LOCKS=0` keeps `git status` from refreshing the worktree index under `../elk/.git/worktrees/`. The
"before" side is the same pipeline on the base filter, read-only:
`GIT_OPTIONAL_LOCKS=0 git -C "$ELK_ORACLE_DIR" status --porcelain | grep -Ev '<base OUTPUT_FILTER>'`, which prints
`?? vector-cache/` at planning.

## D4. The three ad hoc directories need no action

`t4/`, `rerecord/` and `final-gate/` are not in the live porcelain at planning. The mission deletes nothing in
`$ELK_ORACLE_DIR` (queue rules: writes there only through `tools/oracle/` and `tools/vectors/` scripts). Docs say
where ad hoc run output belongs: under `sweep/`, as text-sizing-seam put `sweep/label-sizing/`.

## D5. Docs scope

Edit, in English only:

- `docs/conformance.md` § 1 (`:58-61`, "clean apart from build output"), § 4 step 1 (`:353-355`, the caches it
  keeps), § 5 rows `:382` (exit `2` "remove the worktree": say this deletes the caches and check the next row first)
  and `:383` (the exempt list, and that other untracked root directories are dirt; put run output under `sweep/`).
- `docs/architecture/elk-upgrade.md:191-194`: the "Stale worktree (issue #85)" hazard becomes what is true now (an
  in-place rebuild keeps the three caches; the vector cache still runs cold after it, per `:204-205`), without the
  pointer to the excludes workaround.
- `docs/architecture/elk-json-text.md:321-322`: name `vector-cache/` beside `sweep/` and `census/`.
- `tools/oracle/README.md:45` if its exit-`2` wording lists what counts as dirty (check; edit only if it does).

The 21 translated `docs-site/<locale>/conformance.md` pages stay untouched; they go stale and show the banner, as
the pin move left them (#109 precedent). T3 files one `follow-up` naming the paragraphs.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected, with evidence |
| -------- | ------ | ----------------------- |
| D1 | #85 option 1, `vector-cache` only | Option 2 (one cache root, move `vector-cache.sh` there): changes ~20 files under `tools/vectors/`, which `vector-cache.sh:27` (`VC_INPUT_DIRS`) hashes into every inputs digest, and `vector-cache.sh` itself is salted (`:86`): every cache goes cold, 4 h+ refill, plus moving 192 MB inside `$ELK_ORACLE_DIR`. Option 3 (document the env-scoped excludes file): leaves the exit-`2` trap for the next rebuild and keeps § 4 step 1's promise false. |
| D2 | source guard + throwaway worktree | A `--verify-only` flag: new CLI surface #85 does not ask for. Extracting the regex from the file text and running `grep -E` on sample lines: tests neither `verify_worktree` nor git's collapse of untracked directories, and breaks if the quoting changes. Running the whole script on a temp repo: `check_source` needs `ELK_COMMIT` (8bca22f4) in the repo and `patch_subjects` the real three patches, so it would need `../elk`, absent in CI. |
| D3 | read-only sourced `verify_worktree` | `build.sh` or `--record-only` on the live oracle: rewrites `oracle-build.json`, which salts the vector cache (`vector-cache.sh:86`) → all caches cold. A second oracle via `build.sh` at a temp `ELK_ORACLE_DIR`: a full Maven build, `mvn install` into `~/.m2`, and worktree metadata left in `../elk`. |
| D4 | no action | Deleting or moving the directories: they are already absent; writing in `$ELK_ORACLE_DIR` outside the scripts is forbidden by the queue rules. |
| D5 | English docs only | Re-translating 21 locales: out of scope for a tooling fix; the pin move (a23e0219) set the precedent of leaving them stale with a follow-up. |

Nothing here is reserved for the maintainer: `build.sh` is repository tooling, not an oracle patch, `ELK_COMMIT` or a
divergence, and the change is reversible by reverting one commit.
