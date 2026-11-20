<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: `sync-sources.sh` checks that the pin is present, not that it is `HEAD`

## Context

`tools/melk/sync-sources.sh:43-47` dies unless `git rev-parse HEAD` equals `tools/oracle/ELK_COMMIT`, yet every read
is `git show "$PINNED:$upstream"` (`:53-56`). The runbook's hazard row (`docs/architecture/elk-upgrade.md:228`) names
#89 for it. See [D4](../decisions.md#d4-sync-sourcessh-checks-presence-not-head).

## Read-set

- `tools/melk/sync-sources.sh` (all 89 lines)
- `test/architecture/oracle-build.test.ts` (script-test precedent)
- `test/melk/sources.test.ts:1-40` (what the vendored files are checked against)

## Write-set

`tools/melk/sync-sources.sh` (lines 44-47 only), `test/melk/sync-sources.test.ts` (new),
`plans/bundle-deps-pinned-read/decision-journal.md`.

## Steps

1. Write `test/melk/sync-sources.test.ts` per D4. Every git call in it runs with `GIT_CONFIG_GLOBAL=/dev/null`,
   `GIT_CONFIG_NOSYSTEM=1`. Run: the throwaway-repo case is red (`ELK checkout is at …`); journal it.
2. Apply D4. Rerun: green. `bash -n tools/melk/sync-sources.sh`; `shellcheck` if installed (journal the result or
   its absence).
3. Live, read-only, journaled: `ELK_SOURCE_DIR=../elk-oracle bash tools/melk/sync-sources.sh --check` exits 0 with
   no output (on the base it died with `ELK checkout is at cb2b6d54… but ELK_COMMIT pins 8bca22f4…`; record that by
   running the base script from `git show <base>:tools/melk/sync-sources.sh > "$TMPDIR/sync-base.sh"`). A
   difference is stop 4.
4. `git status --short tools/melk/sources` is empty. Prettier on the test; journal a `fix` row; commit.

## Interface contracts

None consumed. T3 documents the new message `ELK checkout <dir> does not contain <pin>`.

## Acceptance criteria

- Given a temp dir that is not a git repo, when `sync-sources.sh --check` runs with it as `ELK_SOURCE_DIR`, then exit
  1 and stderr `error: ELK_SOURCE_DIR is not a git checkout: <dir>`.
- Given a throwaway repo without the pin, then exit 1 and stderr `error: ELK checkout <dir> does not contain <pin>`.
- Given `ELK_SOURCE_DIR=../elk-oracle` (pin present, `HEAD` elsewhere), then `--check` exits 0 and writes nothing.
- Given `git diff <base> -- tools/melk/sync-sources.sh`, then only D4's lines differ.

## Observability

N/A: the script's error lines are its observability; the new one names the directory and the commit.

## Rollback

Reversible: revert the commit.
