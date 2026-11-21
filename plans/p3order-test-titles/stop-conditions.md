<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: p3order-test-titles (auto-confirmed at planning, 2026-11-20)

These use the queue form. A stop that blocks only part of the work: run `gh issue create --label needs-ruling` naming
the exact part, journal a `ruling` row, and finish the rest. A stop that blocks the whole mission: journal it, commit
the work as a temporary commit, and end with the driver's halted line, with the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** Any write in `../elk`, `../elk-oracle`, `$ELK_MODELS_DIR`, `~/.claude`, the
   main checkout or another repository.
2. **Baseline red.** A queue gate fails on the untouched tree: journal the failing test names and halt as blocked.

## Partial stops (file and continue)

3. **A title's claim has no backing.** For one of the three paths, the 7h closure (`plans/layered-compound/unreached.md`)
   records neither a row nor a ported suite that reaches it, or records it as still U: leave that title as it is,
   file `needs-ruling` naming the file, line and what the closure says, and retitle the others.
4. **Anything but a title would change.** If the rename needs a change to an `it` body, an assertion, a header
   comment, or any file outside the three tests (for example a tool that matches the title): do not make it; file
   `needs-ruling` naming the file and line (AD-13 / D2).

## Mechanics

5. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file is rerun alone does not count): halt with the diagnosis so far. A title rename
   cannot change a result, so any changed result is a discrepancy: enter diagnosis mode before anything else.
6. **Load.** Before the full suite, check `uptime`; above 12, wait. Run it under `nice -n 10`.

## Push-forward (decide and journal, do not stop)

- The exact words of each title within D1's rule.
- Whether `ElkLayeredTestExecutionState.ts:6` is stale (read `ElkLayered.ts` for `prepareLayoutTest`), and the
  text of the `follow-up` issue.
- A `follow-up` issue for any other stale text or defect found on the way.
