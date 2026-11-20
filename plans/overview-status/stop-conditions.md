<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: overview-status (auto-confirmed at planning, 2026-11-20)

These use the queue form. A stop that blocks only part of the work: run `gh issue create --label needs-ruling` naming
the exact part, journal a `ruling` row, and finish the rest. A stop that blocks the whole mission: journal it, commit
the work as a temporary commit, and end with the driver's halted line, with the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** Any write in `../elk`, `../elk-oracle`, `$ELK_MODELS_DIR`, `~/.claude`, the
   main checkout or another repository.
2. **Baseline red.** A queue gate fails on the untouched tree: journal the failing test names and halt as blocked.
3. **A claim cannot be backed.** If a D3 claim (all in-scope algorithms ported, surface accepted, 0.x until 1.0) has
   no source in the repo or on #90/#91, do not publish it: halt with the claim and what was checked.

## Partial stops (file and continue)

4. **A test pins a changed sentence.** If any test, vector or golden fails because of the new text (D6 found none),
   do not edit the test: put that block back, file `needs-ruling` naming the test and line, and finish the rest.
5. **A file outside the write-set would change.** For example, a lint rule that needs a config edit, or a nav
   change: do not make it; file `needs-ruling` or `follow-up` (D2).
6. **A locale cannot be finished.** If a locale page fails the lint twice after fix attempts, put that locale's
   pages back to the base (their `sourceHash` stays as it was), file a `follow-up` naming the locale and the check
   that failed, and finish the others.

## Mechanics

7. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file is rerun alone does not count): halt with the diagnosis so far. A prose change
   cannot change a layout result, so any changed layout or ref result is a discrepancy: enter diagnosis mode first.
8. **Load.** Before the full suite, check `uptime`; above 12, wait. Run it under `nice -n 10`.

## Push-forward (decide and journal, do not stop)

- Exact wording within D3's rules, in English and in each locale.
- How locales are grouped across translation subagents, and the model each one runs on.
- A `follow-up` issue for any stale translation or defect found on the way (D4's `conformance.md` and
  `guide/architecture.md` check).
