<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: suite in both modes; sweeps at stride 1 with assertions on

## Context

#127 "Sweeps" and "Boundaries": the corpus sweeps compare against oracle runs without `-ea`, so a restored assert can
fire on a corpus model the unit suite never meets (that is how #112's `ThresholdStrategy` comment of 2026-11-20 was
found). [D9](../decisions.md#d9-sweeps-at-stride-1-with-assertions-on-t6), stop 4.

## Write-set

- `test/helpers/<family>-sweep.ts` for a family where a #32 case fires (a `withEndLabelRule` wrap around the case's
  layout step only)
- A site file of the ten, only to put a site back as a comment under stop 4 (with its wraps and new test removed)

## Steps

1. Full suite, README gate env, assertions on (the default): 0 failures. Then the same with `ELK_DEV_ASSERTIONS=off`:
   0 failures. Journal both totals against the mission-start baseline (+10 new tests, + T3's helper tests).
2. `uptime` (above 12: wait). Sweep dirs present: `test/corpus/.{labels,loops,phase,pipeline,compound,order,placement,routing}-sweep/`
   and `$ELK_ORACLE_DIR/sweep/label-sizing/` (all present at planning). Run each, detached under `nice -n 10`, one at a
   time, with stride 1 and a report file where the test supports one:

   ```bash
   LABELS_SWEEP_STRIDE=1 npx vitest run test/corpus/labels-sweep.test.ts
   npx vitest run test/corpus/label-sizing-sweep.test.ts
   LOOPS_SWEEP_STRIDE=1 npx vitest run test/corpus/loops-sweep.test.ts
   PHASE_SWEEP_STRIDE=1 npx vitest run test/corpus/phase-sweep.test.ts           # ~8 min
   PIPELINE_SWEEP_STRIDE=1 npx vitest run test/corpus/pipeline-sweep.test.ts     # ~3 min
   COMPOUND_SWEEP_STRIDE=1 npx vitest run test/corpus/compound-sweep.test.ts
   ORDER_SWEEP_STRIDE=1 npx vitest run test/corpus/order-sweep.test.ts
   PLACEMENT_SWEEP_STRIDE=1 npx vitest run test/corpus/placement-sweep.test.ts
   ROUTING_SWEEP_STRIDE=1 npx vitest run test/corpus/routing-sweep.test.ts       # ~3 min
   npx vitest run test/corpus/sweep.test.ts
   ```

   `label-sizing-sweep` has no stride variable (it runs every case); the eight others read `<NAME>_SWEEP_STRIDE`
   (checked at planning). A sweep that skips (stale stamp or missing dir) is not evidence: journal
   why, and refresh it only through its `tools/oracle/*-sweep.sh` script if the script's stamp says stale.
3. Per failure: the case id, the site (stack), and whether its model meets D2. A #32 firing that meets D2: wrap it in
   the sweep helper, rerun that sweep, journal the case id. Anything else: stop 4 (JVM stack under
   `JAVA_TOOL_OPTIONS=-ea:org.eclipse.elk...` with the matching `--dump`, `needs-ruling` issue, site back to a comment).
4. Journal per sweep: cases checked, hash-equal, throws, failures, wraps added, wall time.
5. Commit `test(corpus): run the layered sweeps with the restored asserts` (or fold into T7's commit if nothing changed).

## Acceptance criteria

- Given the finished tree, when the suite runs with assertions on and with them off, then both have 0 failures.
- Given the ten sweeps at stride 1 with assertions on, when run, then each passes, and every wrapped case is a D2 case
  named in the journal.
- Given any other firing, when found, then a `needs-ruling` issue with a JVM `-ea` stack exists and its site is a comment.

## Observability / rollback

N/A — test code only. Reversible.
