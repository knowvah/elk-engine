<!-- SPDX-License-Identifier: EPL-2.0 -->

# ELK upgrade runbook and rehearsal: mission brief (roadmap row 13, issue #44)

## Objective

Write the runbook for moving the ELK pin past `8aaa3c14` (AD-2) and rehearse it once, end to end, against a newer ELK
commit without moving the committed pin. The runbook covers bumping `tools/oracle/ELK_COMMIT`, triaging the net Java
diff, rebasing the oracle patch series, rebuilding the oracle, re-recording every JVM vector and golden, diffing the
`.melk` metadata, rerunning the corpus sweeps and ported Java suites, and porting Java diffs. It also covers every
"To row 13" item the earlier revisions of `plans/roadmap.md` left. The rehearsal runs in scratch space (a local clone,
a scratch oracle and a scratch Maven repository, UP2-UP3) against `b715fb10`, the upstream `master` tip at planning (UP1).

Exit (#44 "done when", roadmap § 13 and its revisions):

- `docs/architecture/elk-upgrade.md` is committed. A fitness test keeps its script inventory equal to the recorder, regen
  and sweep scripts in `tools/` (UP4, UP5).
- One rehearsal against `b715fb10` gives a clean sweep or a triaged diff list. Every ref diff is classified as stamp-only,
  content or tool-side, using normalized ref diffs (UP6), and the result is journaled.
- The real pin move goes to the maintainer as a `needs-ruling` issue with the rehearsal evidence (UP8). The scratch state
  is removed (UP9). The queue gates pass, the branch gets one squashed commit on the base, and `plans/roadmap.md` gains
  `## Revision <date> (elk-upgrade-runbook)`.

**Not in this mission:** editing `tools/oracle/ELK_COMMIT`, `tools/oracle/patches/`, anything under `src/`, any landed
test, ref or vector in the queue worktree, CLAUDE.md, or an AD row. Also out: porting a Java change into `src/` (the pin
does not move, so `src/` must keep matching `8aaa3c14`), `git fetch` or any other write in `../elk` beyond the worktree
metadata of UP9, writes to the shared `../elk-oracle` or to `~/.m2`, and filing anything upstream.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt win over it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md) and [decision-journal.md](decision-journal.md).
3. Read `.agent-notes/elk-upgrade-runbook-planning.md` (planning facts and measured costs),
   `.agent-notes/vector-cache-and-key-line.md` (cache salt: a new oracle makes every recorder cold),
   `.agent-notes/text-sizing-seam.md` (regen scripts, the AWT remeasure and the `build.sh` staleness filter, #85) and
   `.agent-notes/ts-parity-dashboard.md` (sweep runbook). Journal anything that changes the approach.
4. Branch: `git branch --show-current` must print `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/elk-upgrade-runbook .agent-notes/elk-upgrade-runbook-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add elk-upgrade-runbook mission brief"`. Record the squash base in
   the journal: use the driver's base if the prompt names one, else that commit's parent (`13dcc881` at planning, the
   row-12 squash).
5. Shared oracle: `../elk-oracle/oracle-build.json` must name `tools/oracle/ELK_COMMIT` and patches 0001-0003 (true at
   planning). This mission never rebuilds it. Journal the output of `git -C ../elk log --oneline 8aaa3c14..HEAD` and of
   `git -C ../elk rev-parse HEAD origin/master`. At planning both print `b715fb10`, and the net `plugins/` diff is
   `GraphFeature.java` only.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After each task, run its own tests, `npm run typecheck` and `npm run format:check`. After T1, also run
`npm run docs:build` and `npm run docs:linkcheck`. At mission end, T5 runs queue gates 1-6 on the queue worktree and
journals each one. Check `uptime` first, and wait while the load is above 12.

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build && npm run docs:linkcheck
git diff --exit-code <base> -- test/golden/refs/                  # empty: this mission adds no ref
```

No recorder input changes in the queue worktree, so gate 6 is the ref diff alone. The rehearsal's re-records happen in
the clone and are evidence; they are never copied back. Run long commands detached
(`nohup nice -n 10 bash -c '<cmd>; echo "exit $?"' >"$TMPDIR/<name>.log" 2>&1 &`) and poll in the foreground for at most
9 minutes at a time. Commit each task with `git -c commit.gpgsign=false commit -F <file>`.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The ones most likely to fire are 3 (the scratch build fails on Tycho 4.0.13
or a missing artifact), 5 (a content diff in a re-recorded ref) and 8 (the re-record runs past its wall-clock cap).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Runbook draft and inventory fitness test | T1 | — | [x] |
| [2](batch-2/overview.md) | Scratch clone, scratch Maven repo, oracle at `b715fb10`, net-diff triage | T2 | 1 | [x] |
| [3](batch-3/overview.md) | Rehearsal: vectors and goldens; sweeps, suites and site checks | T3, T4 | 2 | [x] |
| [4](batch-4/overview.md) | Triage, runbook corrections, ruling, cleanup, gates, squash | T5 | 3 | [x] |

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

Recommended executor model: `fable`. The orchestrator owns every JVM run, the clone, the scratch oracle, `plans/` and every
commit. T1's runbook text may go to a `documentation-engineer` subagent (sonnet) while the orchestrator writes the
fitness test. T3 and T4 share the clone and the scratch oracle, so run them from the orchestrator. They may overlap only
while the 1-minute load stays at or below 12. Subagents never commit, never write `plans/`, and never start a JVM.

## Landing

Land one squashed commit on the base, with subject `docs(oracle): elk upgrade runbook and rehearsal (13)` (or another
Conventional Commit subject of at most 72 characters). The body gives the why, the footer is `Refs: #44`, and there are no
attribution lines. Keep the per-task history under the tag `elk-upgrade-runbook/pre-squash`. Run
`git reset --soft <base>`, then make one commit. Never push.

## Mission summary

**Tasks.** 5 of 5 planned tasks completed (T1-T5) in 4 batches, all by the orchestrator; no subagent was used (journal
start `plan`). Roadmap revision: `## Revision 2026-11-14 (elk-upgrade-runbook)` in `plans/roadmap.md`; execution notes:
`.agent-notes/elk-upgrade-runbook.md`. **The pin did not move**: `tools/oracle/ELK_COMMIT`, `tools/oracle/patches/`, `src/`
and every committed ref are as on the base; the rehearsal ran in scratch space and all of it is removed.

**Exit items and the journal rows that prove them.** Kinds are the journal's.

| Exit item (Objective) | Result | Journal row (task, kind) |
| --------------------- | ------ | ------------------------ |
| `docs/architecture/elk-upgrade.md` is committed; a fitness test keeps its script inventory equal to `tools/` (UP4, UP5) | 14 sections, 630 lines; `test/docs/elk-upgrade-runbook.test.ts`, 11 tests: 34 vector, 5 regen and 12 sweep scripts named and executable, two script-less recorders named, no dangling path; seen red first | T1 `gate` (two rows), `plan`; T3 `fix` |
| One rehearsal against `b715fb10` gives a clean sweep or a triaged diff list, every ref diff classified (UP6) | no content difference: 57 re-recorded files, all stamp-only; a triaged list of nine items, none blocking | T3 `finding` (17:02); T5 `finding` |
| Every recorder and regen script re-run cold (UP7) | 34 recorder scripts, 2 bare recorders, 11 regen commands, census: all exit 0 (one after a mode fix); phase ended after 4 h 23 min of the 10-hour cap | T3 `gate` (12:57, 17:01) |
| Sweeps, ported Java suites and repo-wide checks against the new oracle | all twelve sweeps byte-equal to the pinned oracle's results (the corpus sweep apart from five `sporeOverlap` verdicts, diagnosed); 92 JUnit classes identical; checks pass | T4 `gate` (seven rows), `finding` |
| The real pin move goes to the maintainer with the evidence (UP8) | #99 (`needs-ruling`) | T5 `ruling` |
| Scratch state removed (UP9) | `../elk` worktree list and status equal the pre-state; `~/.m2` and the shared oracle untouched | T2 `gate`; T5 `note` (cleanup) |
| Queue gates pass; one squashed commit; roadmap revision | gates 1-6 green (coverage on the second run, #87 intermittent); revision appended; one commit on `2605fe3c`, the signed rewrite of the base `13dcc881` (T5 `note`, landing), history under the tag `elk-upgrade-runbook/pre-squash` | T5 `gate`, `note` |

**Decisions made.** UP1-UP8 as planned. UP9 without `git worktree prune` (start `plan`). Deviations, all journaled:
the runbook text written by the orchestrator, not a subagent (start `plan`); the bump step also edits 41 recorder
constants, and three more stamped files have their own writers (start `finding`); the AWT remeasure compared with
`layered-label-metrics.json`, not `awt.json` (T1 `plan`); a row in `docs/architecture/overview.md` and two script modes
outside the planned write-sets (T1 `plan`, T3 `fix`); the `elkj` sweep overlapped the `elkj` recorder, was paused when the
load rule no longer held, ran under a watchdog and was resumed for good after T3 (T4 `plan`, `fix`); 48 short oracle
runs started without a load check (T4 `finding`); four journal rows dated up to 13 minutes ahead of the clock (T5
`note`). Nothing under `src/` changed, and no landed expected value, ref, vector or tolerance.

**Issues filed.** #99 (`needs-ruling`): move the pin to `b715fb10`. #96, #97, #98 (`follow-up`): one source for the
pinned sha and scripts for two recorders; the bundle list of `java-tests.sh`; two tests that ignore `ELK_MODELS_DIR`.
Comments: #79 (four more flickering `sporeOverlap` ids, 24-run counts on both oracles), #87 (the `childPids()` check at
`:314` and `:185`), #89 (`sync-sources.sh` has the same condition), #44 (results).

**Quality gates (final, queue worktree).** `format:check`, `typecheck`, `complexity`: exit 0. `coverage`: 49,552 passed,
95 skipped, 98.92 / 96.99 / 98.84 / 98.92 (second run; the first failed on the #87 intermittent alone). `docs:build`
(200 typedoc warnings) and `docs:linkcheck` (555 links): exit 0. `git diff 13dcc881 -- test/golden/refs/`: empty.

**Known issues and follow-ups.** The 32 ported JUnit classes outside `java-tests.sh`'s two bundles were not run against
`b715fb10` (#97). The measured wall times of the two `elkj` jobs are upper bounds: another repository's session loaded
the machine in bursts all afternoon. A move to `b715fb10` has no Java change to port, so the "port Java diffs" step of
the runbook (section 11) is written but was not exercised.

**Landing state, for the maintainer and for a rerun.** The branch was rebased and signed at 13:34 while the mission ran,
so the base the driver named (`13dcc881`) is no longer on it; the squashed commit sits on `2605fe3c`, the same commit
re-signed (identical tree). `refs/mission-base/44` still names `13dcc881`, so the driver's check counts 26 commits instead
of one and the session ends with `MISSION: halted`. Nothing is left to do in the mission itself: if the driver reruns it
after the ref points at `2605fe3c`, the session should confirm that every batch box is ticked, that
`git rev-list --count 2605fe3c..HEAD` is 1 and the tree is clean, and report done without redoing any work.
