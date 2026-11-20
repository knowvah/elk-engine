<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: linkedlist-int32-cleanup (auto-confirmed at planning, 2026-11-19)

These use the queue form. A stop that blocks only part of the work: run `gh issue create --label needs-ruling` naming
the exact part, journal a `ruling` row, and finish the rest. A stop that blocks the whole mission: journal it, commit
the work as a temporary commit, and end with the driver's halted line, with the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** A write in `../elk`, `../elk-oracle` (beyond a `build.sh` rebuild),
   `$ELK_MODELS_DIR`, `~/.claude`, the main checkout or another repository.
2. **Baseline red.** A queue gate fails at mission start on the untouched tree: journal the failing test names and
   halt as blocked.

## Partial stops (file and continue)

3. **A `differs` caller with no mechanism.** T1 marks a caller `differs` but cannot produce the diagnosis artifact
   (mechanism, origin, causal chain, ruled out) or an oracle input that reaches it: leave the site as it is, file
   `needs-ruling` with what is known, and journal.
4. **An expected value would change** (AD-13). A `differs` fix that passes only by changing an assertion, vector or
   golden: leave those rows and the site as they are, and file `needs-ruling` naming the rows.
5. **A converted `int` site changes any result.** Wrapping is unreachable on every recorded graph, so any test or ref
   change after a D4 conversion means the conversion is wrong (a `double` accumulator taken for `int`, or association
   changed). Revert that site, diagnose, and journal; if no mechanism is found, file `follow-up` and keep it bare.
6. **A fix that D3 does not allow.** A `differs` caller whose fix needs a change to `LinkedList.ts`'s behaviour (not
   its doc), or touches more than the caller's file and its test: file `needs-ruling` naming the caller and journal.

## Mechanics

7. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file is rerun alone does not count), or one location is edited three times in a row for
   the same check: halt that task with the diagnosis so far.
8. **Load.** Before an oracle run, check `uptime`; above 12, wait. Run under `nice -n 10`.

## Push-forward (decide and journal, do not stop)

- The exact wording of `LinkedList.ts`'s header and of `audit.md` / `int32-sites.md` rows.
- Verdicts `same` / `handled` / `unreachable-differs` with their one-clause reason.
- Whether a counter is "bounded by one collection" under D4(c), with the reason in the row.
- Helper splits for complexity, Java order kept.
- Whether T1 and T2 run as subagents or in the orchestrator, and in what order.
- A `follow-up` issue for a defect or cleanup outside #47's scope.
