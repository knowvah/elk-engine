<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: the thirteen sweeps with assertions on; every `AssertionError` with its case and site

## Context

#116: "Run the TS side of each sweep with assertions on … and collect every `AssertionError` by site (first `src/`
frame under `devAssert`)." The scope is [D1](../decisions.md#d1-scope-the-thirteen-vitest-corpus-sweeps-at-the-current-tip)
and the switches are [D2](../decisions.md#d2-assertions-on-by-the-suites-default-stride-1-everywhere).
[D3](../decisions.md#d3-collect-assertionerrors-from-verdicts-and-from-the-throw-pairs) covers where an assert hides.
#127 T6 is the model for this task (`plans/dev-assert-restore/batch-3/T6-suite-and-sweeps.md`, journal rows 22-24).

## Read-set

- `test/corpus/<family>-sweep.test.ts`, the header comment and the verdict functions of each.
- `test/helpers/layered-*-sweep.ts`, only the replay entry point each sweep calls (for the probe).
- `test/helpers/unsized-end-labels.ts` (`withEndLabelRule`). The 145 cases it wraps run with all asserts off. That is
  known (#138), so journal the count and do not change it.
- `.agent-notes/dev-assert-restore.md` (the stack-limit note).

## Write-set

- `plans/corpus-sweeps-asserts/decision-journal.md` (append).
- A temporary probe `test/corpus/assert-site-probe.test.ts`, only if an `AssertionError` is seen. It is never
  committed. Delete it before T3.

## Steps

1. Run `uptime`. Above 12, wait. Then run each sweep detached with `nice -n 10`, one at a time, with its exit code as
   the last log line (queue rules):

   ```bash
   nohup nice -n 10 bash -c 'LABELS_SWEEP_STRIDE=1 LABELS_SWEEP_REPORT=$TMPDIR/labels.txt npx vitest run test/corpus/labels-sweep.test.ts --reporter=verbose; echo "exit $?"' >"$TMPDIR/sweep-labels.log" 2>&1 &
   ```

   The thirteen runs (prefix each with its env; time from #127 where known):

   | Sweep | Env | Approx. |
   | ----- | --- | ------- |
   | labels | `LABELS_SWEEP_STRIDE=1 LABELS_SWEEP_REPORT=…` | 1 min |
   | label-sizing | (none) | 1 min |
   | loops | `LOOPS_SWEEP_STRIDE=1 LOOPS_SWEEP_REPORT=…` | 2 min |
   | phase | `PHASE_SWEEP_STRIDE=1` | 7 min |
   | pipeline | `PIPELINE_SWEEP_STRIDE=1 PIPELINE_SWEEP_REPORT=…` | 3 min |
   | compound | `COMPOUND_SWEEP_STRIDE=1 COMPOUND_SWEEP_REPORT=…` | 1 min |
   | order | `ORDER_SWEEP_STRIDE=1` | 2 min |
   | placement | `PLACEMENT_SWEEP_STRIDE=1` | 1 min |
   | routing | `ROUTING_SWEEP_STRIDE=1` | 2 min |
   | json | (none) | measure |
   | elkj | (none) | measure |
   | elkt | (none) | measure |
   | dot-export | (none) | measure |

   Also run `npx vitest run test/corpus/sweep.test.ts` and journal it as "not evidence" (D1).
2. For each sweep, check that it did not skip. A test named `skipped: …` or a summary of 0 checked means D5 / stop 4
   applies. Journal its summary line(s) verbatim: cases, checked, ok-matched, throws, refused or timeout counts,
   mismatches, and wall time.
3. Collect the `AssertionError`s (D3):
   - every verdict line that contains `AssertionError`;
   - every `->AssertionError` entry in the `throw-pairs:` summaries of `loops` and `compound`. Write both pair lines
     into the journal verbatim, even when they hold no `AssertionError`.
4. If step 3 found any: write the probe. For each case, load it as its sweep does, replay it through the sweep's own
   helper with the error caught, and record the case id, the first `src/` frame under `DevAssert.ts` (file:line), the
   Java line from that site's `@see`/comment, and the oracle's recorded status. Run it with
   `NODE_OPTIONS=--stack-trace-limit=300`. Group the cases by site and journal the table (kind `census`).
5. A sweep that is red for any reason other than an `AssertionError`: rerun it with `ELK_DEV_ASSERTIONS=off`. If it is red
   there too, the baseline is red: halt (stop 4). Otherwise journal it and treat it as a firing site.

## Interface contract (output, consumed by T2)

A journal row of kind `census` for each firing site: `{ site: "src/…ts:line", java: "<bundle>/…java:line",
cases: [id…], oracleStatus: { ok: n, throws: n }, sweeps: [name…] }`. Write `none` when nothing fires.

## Acceptance criteria

- Given the thirteen sweeps at stride 1 (where supported) with assertions on, when each has run, then none is
  skipped, and each one's summary and exit code are in the journal.
- Given the `loops` and `compound` runs, when they finish, then their `throw-pairs:` lines are journaled verbatim, and
  any `->AssertionError` pair is in the census.
- Given any `AssertionError`, when the probe runs, then each case has a site `file:line`, and the census groups every
  case under exactly one site.
- Given the end of T1, when `git status` runs, then the probe is the only untracked file under `test/` (T3 deletes it).

## Observability / rollback

N/A: this task adds no new observable operations. It is reversible, and nothing it writes is committed apart from
the journal.
