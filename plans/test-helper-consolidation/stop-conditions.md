<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: test-helper-consolidation (auto-confirmed at planning, 2026-11-19)

Queue form. A stop that blocks only part of the work: `gh issue create --label needs-ruling` (or `follow-up` where
named) naming the exact part, a journal row, then finish the rest. A stop that blocks the whole mission: journal it,
commit the work as a temporary commit, and end with the driver's halted line, the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** Anything under `src/` that is not a `*.test.ts` file; any file under
   `test/golden/refs/`; `../elk`, `../elk-oracle`, `$ELK_MODELS_DIR`, `~/.claude`, the main checkout, another repository.
2. **Baseline red.** The D7 baseline run or a queue gate fails on the untouched tree: journal the failing test names
   and halt as blocked.

## Partial stops (file and continue)

3. **An assertion would change** (AD-13). A move that passes only by editing an `expect`, an expected value, a
   tolerance or a case list (outside D4's retitling and D5's proven removal): revert that move, keep the original, file
   `needs-ruling` naming the file and case, journal.
4. **Case counts differ beyond D7's list.** Find the file, restore the lost cases (or undo the move), and journal the
   mechanism. If the cause is not found, revert that lane's moves and file `needs-ruling`.
5. **A D4 suite fails with `@DefaultConfiguration`.** Diagnosis mode (mechanism, origin, causal chain, ruled out) as far
   as the test side reaches. That suite stays on the harness (so the harness and its test stay), file `follow-up` with
   the diagnosis, journal. No change under `src/` outside test files.
6. **An equivalence proof fails.** D1's identifier check, D1's `CALLERS` key check or D5's four facts do not hold for a
   site: keep that site as it is, record why in `inventory.md` or the journal.

## Mechanics

7. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file reruns alone does not count), or one location is edited three times in a row for the
   same check: halt that task with the diagnosis so far.
8. **Load.** No JVM run is planned. If one becomes necessary, check `uptime` first (above 12, wait) and use `nice -n 10`.

## Push-forward (decide and journal, do not stop)

- Export names, helper file names and splits (keep each helper file ≤ 500 lines).
- Whether a borderline object is "identical" when only a comment or a local constant's name differs (same value).
- Which lane a file belongs to when the batch-2 overview is unclear; order of work inside a lane.
- Wording of comments, docs, journal rows, issues and the roadmap revision.
- A `follow-up` issue for a defect or cleanup outside #46's scope (for example a test-side fidelity gap found on the way).
