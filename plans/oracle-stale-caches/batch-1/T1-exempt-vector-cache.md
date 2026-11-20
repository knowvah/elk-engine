<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: exempt `vector-cache/`, tests first

## Context

`verify_worktree` counts every porcelain line outside `OUTPUT_FILTER` as dirt, and the filter does not know the
script-managed `vector-cache/` root. See [README](../README.md#objective), [D1](../decisions.md#d1-exempt-vector-cache-at-the-root-only)
(the filter) and [D2](../decisions.md#d2-test-seam-a-source-guard-and-a-throwaway-worktree) (the guard and the test).

## Read-set

- `tools/oracle/build.sh` (all 179 lines; `:25-26` filter, `:85-102` `stale`/`verify_worktree`, `:179` `main "$@"`)
- `test/architecture/coverage-gate.test.ts:1-30` (the precedent for a script test)
- `tools/vectors/vector-cache.sh:13-18,80` (where the cache lives; read only, never edit)

## Write-set

`tools/oracle/build.sh` (lines 25, 26 and 179 only), `test/architecture/oracle-build.test.ts` (new),
`plans/oracle-stale-caches/decision-journal.md`.

## Steps

1. Write `test/architecture/oracle-build.test.ts` per D2: SPDX header, a one-line header comment naming #85 and D2,
   named constants for the exit codes (`2`), the two messages and the four exempt names, helpers under 30 NLOC,
   `afterAll` removing the temp dir.
2. Red: `npx vitest run test/architecture/oracle-build.test.ts`. Journal which cases fail and why (expected: all,
   because sourcing the unguarded script runs `main`).
3. Add the D2 guard at `build.sh:179`. Rerun; journal that exactly the cases with an untracked `vector-cache/` still
   fail, each with exit `2` and the stale message. Any other failure is a discrepancy (stop 6: diagnose first).
4. Apply D1 at `build.sh:25-26`. Rerun: all green. Also run `bash -n tools/oracle/build.sh` and, if installed,
   `shellcheck tools/oracle/build.sh` (journal the result or its absence).
5. Prove executing still runs `main`: `bash tools/oracle/build.sh --bogus` exits `1` with
   `error: usage: build.sh [--record-only]` (no git, Maven or oracle access happens before the usage check).
6. `npx prettier --check test/architecture/oracle-build.test.ts`. `git diff --stat` shows the two files only, with
   `build.sh` at 3 changed lines or fewer (a wrapped comment may add one). Journal a `fix` row; commit (batch overview).

## Interface contracts

T2 relies on: `build.sh` can be sourced without side effects beyond `set -euo pipefail` and variable definitions;
`abs_path`, `check_source`, `verify_worktree` and `ORACLE_TOOLS` keep their names and meanings.

## Acceptance criteria

- Given a throwaway worktree holding untracked `census/`, `sweep/`, `vector-cache/` and `oracle-build.json`, when the
  suite sources `build.sh` and calls `verify_worktree`, then it exits 0 and prints `existing oracle worktree verified`.
- Given the same worktree plus an untracked `t4/`, `vector-cache-old/` or `sub/vector-cache/`, or a modified tracked
  file, then it exits 2 and stderr starts with `oracle worktree out of date`.
- Given the base `build.sh` with only the guard applied, then the `vector-cache/` cases fail (red recorded in the
  journal before D1 is applied).
- Given `bash tools/oracle/build.sh --bogus`, then exit 1 and the usage error, as before the change.
- Given `git diff <base> -- tools/vectors/ test/golden/refs/`, then it is empty.

## Observability

N/A: a developer tool; its existing stdout/stderr lines are unchanged.

## Rollback

Reversible: revert the commit. No data, cache or oracle state is touched.
