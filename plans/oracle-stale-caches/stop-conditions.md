<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: oracle-stale-caches (auto-confirmed at planning, 2026-11-20)

These use the queue form. A stop that blocks only part of the work: run `gh issue create --label needs-ruling` naming
the exact part, journal a `ruling` row, and finish the rest. A stop that blocks the whole mission: journal it, commit
the work as a temporary commit, and end with the driver's halted line, with the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** Any write in `../elk`, `$ELK_ORACLE_DIR`, `$ELK_MODELS_DIR`, `~/.claude`, the
   main checkout or another repository. In this mission that includes running `tools/oracle/build.sh` (full or
   `--record-only`) on the live oracle, and any edit under `tools/vectors/` (cache inputs, D3).
2. **Baseline red.** A queue gate fails on the untouched tree: journal the failing test names and halt as blocked.

## Partial stops (file and continue)

3. **Live oracle not as planned.** `oracle-build.json` does not name `8bca22f4…` with patches 0001-0003, or the live
   porcelain lists an untracked entry beyond `census/`, `oracle-build.json`, `sweep/`, `vector-cache/`. Do not
   rebuild, delete, or widen the filter for it. File `needs-ruling` naming the entry (or the stamp), record the
   live proof's actual output in the journal, and finish the rest; the throwaway-repo suite is the proof of D1.
4. **The read-only proof would write.** If `verify_worktree` needs anything but `git status`, `log`, `merge-base`,
   `rev-parse` (for example a changed `build.sh` upstream of this brief), skip the live proof and file `needs-ruling`.
5. **More of `build.sh` would change.** If the tests need any change to `build.sh` beyond the D2 guard, the D1
   filter and its comment (for example a new flag or a refactor of `verify_worktree`): do not make it; file
   `needs-ruling` with the reason.

## Mechanics

6. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file is rerun alone does not count): halt with the diagnosis so far. A failing
   `oracle-build.test.ts` case after D1 is a discrepancy: enter diagnosis mode (mechanism, origin, chain, ruled out)
   before any edit.
7. **Load.** Before the full suite, check `uptime`; above 12, wait. Run it under `nice -n 10`.

## Push-forward (decide and journal, do not stop)

- The exact doc wording within D5, and whether `tools/oracle/README.md` needs a line.
- Test names and helper shape, within the complexity limits (30 NLOC, CCN 10, 5 parameters).
- The body of the translations `follow-up` issue, and `follow-up` issues for anything else found on the way.
- Whether the `.agent-notes/text-sizing-seam.md` observation needs a "fixed by #85" line in this mission's own notes
  file (never edit the earlier file).
