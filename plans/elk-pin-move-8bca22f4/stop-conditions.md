<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: elk-pin-move-8bca22f4 (auto-confirmed at planning, 2026-11-18)

These use the queue form. A stop that blocks only part of the work: run `gh issue create --label needs-ruling` naming
the exact part, journal a `ruling` row, and finish the rest. A stop that blocks the whole mission: journal it, commit the
work as a temporary commit, and end with the driver's halted line, the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** Halt on any of these: a write in `../elk` (other than `build.sh`'s worktree
   metadata), in `$B` (`~/git/knowvah/elk-upgrade-before/e7eaea57/`), `$ELK_MODELS_DIR`, `~/.claude`, the main checkout
   or another repository. Also halt on `git worktree remove|prune` in `../elk`.
2. **The oracle does not build.** Diagnose from `.oracle-build.log` (conformance.md § 5): mechanism, origin, what was
   ruled out. An environment cause (network, disk, JDK) halts as blocked. A patch of 0001-0003 that fails to apply is
   the maintainer's (AD-3): file `needs-ruling` and halt. Never edit `build.sh` or a patch to force a build.
3. **TX1 re-proof fails** (runbook § 7.2). A font-metrics hit under `plugins/` of an in-scope bundle: file
   `needs-ruling` and halt.
4. **A ref change without a #104 row.** A content diff, a sweep verdict change or a JUnit count change enters diagnosis
   mode against the new oracle and `$B`. A mechanism that traces to one of the six net-diff PRs is explained (journal).
   A change that traces to none of the 16 commits `e7eaea57..8bca22f4` is a STOP. Do not commit that ref; halt if the
   stamp tests then cannot go green.
5. **An assertion change outside D5.** A test, vector or golden that can pass only by changing an expected value not
   covered by D5: file `needs-ruling` naming the rows and leave them as they are. If the suite is then red, halt (the
   gates must be green before the squash).
6. **The port cannot reach a re-recorded ref.** After the Java diff is ported, a content row that stays red is a port
   defect: diagnose it against the new oracle. With no stated mechanism after two fix attempts, halt that task with the
   diagnosis artifact so far.

## Partial stops (file and continue)

7. **New spore TS findings in the sweep** (expected by #104). Diagnose each one. A port defect with a mechanism is fixed
   inside T5's write-set. A proven last-ulp `Math.*` difference within the 0.01 px bar, or any other irreducible cause,
   is a known-divergence proposal for the maintainer: file `needs-ruling` with the case ids. The sweep tool's exit 1 is
   not a gate.
8. **A `.melk` regeneration that changes more than the two expected options** (`randomSeed` on both spore algorithms;
   `layerId`/`positionId` without `output` and with the new descriptions). Journal it. If it touches a behaviour the
   Java diff does not explain, file `needs-ruling` for that part.
9. **A JUnit class outside the diff changes its runs or failures** (runbook § 10). Content finding: diagnose it (stop 4).

## Mechanics

10. **Load.** Before any JVM job, check `uptime`: above 12, wait. At most two JVM jobs at once. The `elkj` jobs never
    overlap each other (D8).
11. **Repeated failure.** If the same gate fails twice in a row (a load timeout or the #87 intermittent, recognised by
    its message, does not count), or one location is edited three times in a row for the same check, halt that task
    with the diagnosis so far.
12. **Baseline red.** If a queue gate fails at mission start on the untouched tree, journal the failing test names and
    halt as blocked.

## Push-forward (decide and journal, do not stop)

- The TS comparator's exact shape (D2), helper splits for the complexity limits, and file splits that keep method
  boundaries.
- The recorder order beside the `elkj` lane, and rerunning a recorder that failed on load or timeout.
- Wording of docs, journal rows, issue comments and the roadmap revision.
- Whether T4-T6 run as subagents or in the orchestrator.
- Renumbering a Java line reference, given both commits' text at that line.
- A `follow-up` issue for a defect or cleanup found on the way, outside the issue's scope.
