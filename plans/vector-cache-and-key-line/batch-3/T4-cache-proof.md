<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: prove the cache end to end (orchestrator)

**Goal:** show, with the code as it will land, that a cold run reproduces all six `.elkj` refs from the oracle, a
warm run reproduces them from the cache in minutes, and an evicted row is recorded alone (C4; D3).

## Write-set

- `plans/vector-cache-and-key-line/decision-journal.md` (one row per run)

## Read-set

- [../batch-2/T3-vector-cache.md#interface-contracts](../batch-2/T3-vector-cache.md#interface-contracts)
- `.agent-notes/text-follow-ups.md` (wrap detached jobs so the log ends with the exit code)
- `decisions.md#d3`; README stops 7, 8, 10

## Steps

1. Confirm `$ELK_ORACLE_DIR/vector-cache/elkj` does not exist (or move it aside to `vector-cache.bak-<date>`; never
   delete one you did not create). Launch, detached and niced, with the exit code appended to the log:
   `nohup nice -n 10 bash -c 'tools/vectors/elkj-vectors.sh "$0"; echo "elkj-vectors exit $?"' "$OUT/cold" >"$LOG" 2>&1 &`
   with `OUT=$ELK_ORACLE_DIR/t4` and `LOG=$OUT/cold.log`. Journal the command, start time, pid.
2. Watch with a Monitor or `run_in_background` until-loop on the `elkj-vectors exit` line (silence ≠ success: also
   match `Exception|Error|failed`). Stop 10 on a second death or 60 min without a new `done` line.
3. Cold check: `cmp` all six `graph-json-text-*.json` against `test/golden/refs/java/`; record wall time and the
   summary lines (`rows 0/281`, `rows 0/126`, four `recorded`).
4. Warm run: same command into `$OUT/warm` (foreground is fine): six files `cmp`-identical; summary all `hit`,
   `rows 281/0`, `rows 126/0`; wall time < 5 min (5–15: journal the cause; ≥ 15: stop 8).
5. Eviction: delete one row file from each recorder's `rows/` directory (with `node -e 'fs.unlinkSync(…)'`, choosing
   a small scenario row; journal which), rerun into `$OUT/evict`: summary `rows 280/1` and `rows 125/1`; six files
   `cmp`-identical.

## Acceptance criteria

- Given an empty cache, when `elkj-vectors.sh` runs, then all six outputs are `cmp`-identical to the refs and the log
  ends `elkj-vectors exit 0`.
- Given the filled cache, when it runs again, then every program reports a hit, the outputs are `cmp`-identical, and
  the wall time is under 5 minutes.
- Given one evicted row per recorder, when it runs, then exactly those two rows are recorded and the outputs are
  `cmp`-identical.
- Given any mismatch, then stop 7 with a diagnosis artifact.

## Interface contracts

Produces the measured numbers T5 writes into the runbook (cold wall, warm wall, eviction wall).

## Observability

The three runs' summary lines and wall times are journalled verbatim.

## Rollback

Reversible: no repo change besides the journal.

## Commit

`docs(T4): record the vector cache cold, warm and eviction runs` (journal only).
