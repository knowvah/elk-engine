<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: oracle-stale-caches (issue #85, 2026-11-20)

Planning-time notes are in `oracle-stale-caches-planning.md`. Journal:
`plans/oracle-stale-caches/decision-journal.md`.

## Observation: the excludes workaround of text-sizing-seam is no longer needed for the cache roots

- **Context**: T1, extending `OUTPUT_FILTER` in `tools/oracle/build.sh`.
- **Finding**: `verify_worktree` now exempts the untracked roots `census/`, `sweep/` and `vector-cache/` (and, as
  before, build output and `oracle-build.json`). `.agent-notes/text-sizing-seam.md` says an in-place rebuild needs an
  environment-scoped `core.excludesFile`; for those three roots it does not. Any other untracked directory at the
  oracle root, a `vector-cache/` below another directory, or a tracked change still gives exit 2.
- **Impact**: keep putting local run output under `sweep/`. A new root directory still makes the next rebuild exit 2,
  and the documented answer is to move it, not to widen the filter.
- **Confidence**: High (`test/architecture/oracle-build.test.ts`, 8 cases on a throwaway worktree)

## Observation: how to check the live oracle worktree without making the vector cache cold

- **Context**: T2, proving the live oracle passes the check.
- **Finding**: `build.sh` ends in a source guard, so it can be sourced. From the repo root:

  ```sh
  GIT_OPTIONAL_LOCKS=0 bash -c '. tools/oracle/build.sh
    ELK_SOURCE_DIR="$(abs_path "$ELK_SOURCE_DIR")"; ELK_ORACLE_DIR="$(abs_path "$ELK_ORACLE_DIR")"
    COMMIT="$(tr -d "[:space:]" <"$ORACLE_TOOLS/ELK_COMMIT")"; check_source; verify_worktree'
  ```

  prints `existing oracle worktree verified` (exit 0) or the stale message (exit 2). It runs only `git rev-parse`,
  `cat-file`, `merge-base`, `log` and `status`; with `GIT_OPTIONAL_LOCKS=0` the worktree's index file kept its mtime,
  size and sha256, and `oracle-build.json` kept its sha256. `build.sh` and `build.sh --record-only` both rewrite
  `oracle-build.json` (`builtAt`), which every vector-cache salt hashes.

- **Impact**: never run `build.sh` only to learn whether the worktree is stale; use the block above.
- **Confidence**: High (run on the live oracle, hashes compared)

## Observation: keeping `vector-cache/` on disk does not keep it warm across a rebuild

- **Context**: T2, wording the docs.
- **Finding**: the exemption stops the exit 2 and so the removal of the worktree, which would also delete `census/` and
  `sweep/`. The vector cache's entries are keyed by a salt that includes `oracle-build.json`, so after any rebuild every
  entry misses and old salts are never pruned (`tools/vectors/vector-cache.sh:17,85-87`).
- **Impact**: plan the cold recorder runs after every oracle rebuild, in place or not; `rm -rf` of the old salts is the
  only way to get the disk space back.
- **Confidence**: High (read from the script; no rebuild was made)

## Observation: a sourced script sees the caller's positional arguments

- **Context**: T1, the red run of the suite against the unguarded `build.sh`.
- **Finding**: `bash -c '. "$1"; …' _ <script> <a> <b>` sources the script with `"$@"` still set to the driver's
  arguments, so an unguarded `main "$@"` ran with them and stopped at the usage check (exit 1) before any git or Maven
  call. With no arguments it would have started a real build against the default oracle directory.
- **Impact**: a test that sources a script whose last line runs `main` must pass arguments the script rejects, or the
  guard must exist first.
- **Confidence**: High (observed: 8 of 8 cases failed with the usage error)

## Observation: a table row can change without prettier re-padding the table

- **Context**: T2, editing two rows of the § 5 runbook table of `docs/conformance.md`.
- **Finding**: prettier pads every cell to the widest cell of its column. The first row holds the widest Mitigation
  cell; a replacement sentence of the same length (61 characters) left the other seven rows byte-identical, and the
  longer text went into a row with slack.
- **Impact**: a small doc fix in a wide table need not produce an eight-row whitespace diff.
- **Confidence**: High (`prettier --write` reported the file unchanged)
