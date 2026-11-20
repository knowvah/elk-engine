<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: oracle-stale-caches (issue #85, 2026-11-20)

## Observation: the live oracle holds only the three cache roots today

- **Context**: Reading `git -C ../elk-oracle status --porcelain` while planning #85.
- **Finding**: It lists `?? census/`, `?? oracle-build.json`, `?? sweep/`, `?? vector-cache/` and nothing else.
  `t4/`, `rerecord/` and `final-gate/` (named in #85) are gone: the 2026-11-18 pin move built a fresh worktree, and
  `vector-cache/` (192 MB) was refilled after it. `harness-classes/` (written by `tools/oracle/run.sh`) does not appear
  because ELK's `.gitignore` ignores `*.class` and the directory holds only class files.
- **Impact**: Exempting `vector-cache/` alone makes the live worktree verify; no directory needs deleting.
- **Confidence**: High

## Observation: any `build.sh` run on the live oracle colds the vector cache

- **Context**: Choosing how to prove the fix on the live oracle.
- **Finding**: `build.sh` and `build.sh --record-only` both end in `write_manifest`, which rewrites
  `oracle-build.json` with a new `builtAt`; `tools/vectors/vector-cache.sh:85-87` hashes that file into every
  program's salt. A read-only proof sources `build.sh` (after the D2 guard) and calls `verify_worktree` with
  `GIT_OPTIONAL_LOCKS=0`.
- **Impact**: Never run `build.sh` just to check the worktree; editing anything under `tools/vectors/` also colds the
  cache (`VC_INPUT_DIRS`).
- **Confidence**: High (source read); the D3 command itself is untested until T2.
