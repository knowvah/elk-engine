<!-- SPDX-License-Identifier: EPL-2.0 -->

# T0: sweep before-side

## Context

D5 compares the `results.jsonl` of the eight layered sweeps before and after T1. At planning the queue worktree holds
`test/corpus/.{compound,labels,loops,order,phase,pipeline,placement,routing}-sweep/` (and `.json-sweep`, not
affected), but whether each is fresh for the current oracle is unknown. Each sweep script skips when its `.stamp`
(oracle build, recorder source, models commit, input hash) matches, so running it on the untouched tree either
confirms freshness in seconds or produces a valid before-side.

## Write-set

`$TMPDIR/pm96-before/<name>.jsonl` (outside the repo); the gitignored sweep dirs the scripts rewrite;
`decision-journal.md`.

## Read-set

`tools/oracle/{compound,labels,loops,order,phase,pipeline,placement,routing}-sweep.sh` (headers: arguments,
`--force`, output dir); runbook `docs/architecture/elk-upgrade.md` § 9 (timings: phase about 8 min, the others
under a minute on the last move).

## Steps

1. `git status --porcelain` is empty apart from the uncommitted brief (if any): T0 runs on the base sources.
2. For each of the eight, one at a time (`uptime` below 12, `nice -n 10`): run the script with no arguments beyond
   what its header requires. Journal whether it printed `… sweep fresh …` or ran, and its summary line.
3. Copy each `results.jsonl` to `$TMPDIR/pm96-before/<name>.jsonl`; journal `shasum -a 256` of all eight (the
   hashes are the durable record; `$TMPDIR` may not survive the session).

## Acceptance criteria

- Given the untouched tree, when T0 ends, then eight before files exist and the journal holds, per sweep, fresh/ran,
  its summary line and its sha256.
- Given a sweep that fails or refuses at base, then it is journaled and excluded from D5's comparison (stop 4 says
  the comparison is void for it, never a pass).

## Observability

N/A: tooling run, no product surface. Evidence is the journal rows.

## Rollback

Reversible: only gitignored sweep outputs and `$TMPDIR` change.
