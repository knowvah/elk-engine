<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: dev-assert (auto-confirmed at planning, 2026-11-19)

These use the queue form. A stop that blocks only part of the work: run `gh issue create --label needs-ruling` naming
the exact part, journal a `ruling` row, and finish the rest. A stop that blocks the whole mission: journal it, commit the
work as a temporary commit, and end with the driver's halted line, with the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** A write in `../elk`, `../elk-oracle` (beyond a `build.sh` rebuild), `$ELK_MODELS_DIR`,
   `~/.claude`, the main checkout or another repository.
2. **Production behaviour changes.** With assertions disabled (`ELK_DEV_ASSERTIONS=off npx vitest run`), a test that
   passed at the base fails, or any ref differs. The helper or a site is then not inert: diagnose before going on. Halt
   if no mechanism is found. (A failure with assertions on is D7, not this stop.)
3. **Baseline red.** A queue gate fails at mission start on the untouched tree: journal the failing test names and halt
   as blocked.

## Partial stops (file and continue)

4. **Java-faithful assertion.** An assertion fires in the suite and the oracle with `JAVA_TOOL_OPTIONS=-ea` throws the
   same `AssertionError` on the same input (D7). Leave the site unrestored, file `needs-ruling` with the input and the
   Java stack trace, and journal.
5. **An expected value would change** (AD-13). A port-defect fix (D7) or a site restoration that passes only by changing
   an assertion, vector or golden: leave those rows as they are, leave the site unrestored, and file `needs-ruling`
   naming the rows. D6's import swap is the one pre-approved test edit.
6. **A fix outside the site's file.** A port defect an assertion exposes whose mechanism lies in another file: leave the
   site unrestored, file `follow-up` with the mechanism, and journal.

## Mechanics

7. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file is rerun alone does not count; see the planning note), or one location is edited three times in
   a row for the same check: halt that task with the diagnosis so far.
8. **Load.** Before a D7 oracle run, check `uptime`; above 12, wait. Run under `nice -n 10`.

## Push-forward (decide and journal, do not stop)

- The exact TS form of an assert expression; helper splits for complexity (D5.6).
- Marking a site `not-portable` under D5.4 when TS has no arm, with the reason.
- Wording of comments, docs, journal rows, issues and the roadmap revision.
- Whether T3-T6 run as subagents or in the orchestrator, and in what order.
- A `follow-up` issue for a defect or cleanup outside #45's scope.
- The inventory's exact row format, as long as every site has a Java cite, a TS cite and a status.
