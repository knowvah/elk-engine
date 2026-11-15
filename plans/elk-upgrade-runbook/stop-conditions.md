<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: elk-upgrade-runbook (auto-confirmed at planning, 2026-11-14)

These use the queue form. A stop that blocks part of the work: run `gh issue create --label needs-ruling` naming the exact
part, journal a `ruling` row and finish the rest. A stop that blocks the whole mission: journal it, commit the work, and
end with the driver's halted line.

1. **Writes outside the scratch area.** These are halts: a write to `../elk` other than UP9's worktree add/remove (no
   `git fetch`, checkout or commit there), a write to the shared `../elk-oracle`, to `~/.m2` (UP3 marker check), to
   `$ELK_MODELS_DIR`, `~/.claude`, the main checkout or another repository. If the marker check shows `~/.m2` was written,
   halt the rehearsal, journal what changed, and file `needs-ruling`.
2. **AD-13 in the queue worktree.** These halt: any byte diff under `test/golden/refs/`, any change to a landed test's
   expected value, to `tools/oracle/ELK_COMMIT`, or to `tools/oracle/patches/`. Ref changes in the clone are evidence,
   not a stop.
3. **Scratch build fails.** Enter diagnosis mode on the `build.sh` log: mechanism, origin and ruled-out causes. For a
   cause in the environment (network, disk, JDK), halt as blocked with the diagnosis. For a cause in ELK or Tycho 4.0.13
   (for example the 3.9 Maven series no longer fits), the cause is a rehearsal finding: journal it, add it to the runbook
   and to the UP8 issue, and continue with the steps that need no oracle (T1 is done, T5 runs). Never edit `build.sh` to
   force a build without a stated mechanism.
4. **Patch does not apply.** If `git am --3way` of 0001-0003 fails at `b715fb10`, record it as a finding, not a fix. A
   patch change is the maintainer's decision: file `needs-ruling` with the conflict, then halt the rehearsal steps that
   need the oracle (as in 3).
5. **Content diff.** A ref that differs after the sha is normalized (UP6), a sweep verdict that changes, or a ported Java
   suite that changes its result enters diagnosis mode against both oracles: which Java change, origin `file:line`,
   causal chain. A diff with a stated mechanism is a triaged finding (journal, `follow-up` issue, UP8 issue); a diff
   without one is a halt of that row's triage, journaled with what was ruled out. Never port it into `src/` (UP8).
6. **TS suite red in the clone after the re-record.** Classify each failing test the same way: a stamp check expected to
   flip, or a content difference (5). Do not edit tests or refs in the queue worktree to match.
7. **Load.** Before any JVM run, if `uptime` is above 12, wait. Never run more than two JVM jobs at once.
8. **Re-record past 10 hours (UP7).** This is a push-forward, not a halt: journal the unfinished scripts with their impact
   note, file one `follow-up` issue, and finish T4 and T5.
9. **Repeated failure.** If the same gate fails twice in a row (a load timeout does not count), or one location is edited
   three times in a row for the same check, halt that task with the diagnosis so far.
10. **Baseline red.** If a queue gate fails at mission start on the untouched tree, journal the failing test names and
    halt as blocked.

## Push-forward (decide and journal, do not stop)

- The runbook's wording, section order, tables and anchors, and which pages link to it, provided `docs:build` and
  `docs:linkcheck` pass.
- The order of rehearsal steps within T3 and T4, how they overlap under the load rule, and whether the clone uses `npm ci`
  or `npm ci --offline`.
- The exact extraction rule of the UP5 test (code spans, a marked table), provided it fails on a missing script and on a
  dangling path.
- Re-running a step that failed only on load, or a known intermittent (`ts-layout-shards.test.ts` `childPids()`, #87).
- Filing `follow-up` issues for defects found on the way, for example a tool that ignores an env override and reaches the
  shared oracle.
- Correcting a runbook command that the rehearsal proved wrong (journal the before and after).
