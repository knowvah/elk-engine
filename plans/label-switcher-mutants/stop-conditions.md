<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: label-switcher-mutants (auto-confirmed at planning, 2026-11-19)

These use the queue form. A stop that blocks only part of the work: run `gh issue create --label needs-ruling` naming
the exact part, journal a `ruling` row, and finish the rest. A stop that blocks the whole mission: journal it, commit
the work as a temporary commit, and end with the driver's halted line, with the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** A write in `../elk`, `../elk-oracle` (beyond `build.sh` and the vector cache
   through `tools/vectors/`), `$ELK_MODELS_DIR`, `~/.claude`, the main checkout or another repository.
2. **Baseline red.** A queue gate fails at mission start on the untouched tree, or the kill suite fails before any
   mutant is applied.
3. **Oracle mismatch.** `oracle-build.json` does not name `8bca22f4…` and patches 0001-0003, and a `build.sh` rebuild
   does not fix it.

## Partial stops (file and continue)

4. **An existing ref row changes** (AD-13). After the recorder edit, any pre-existing row, or any header field other
   than `rowCounts.sites`, differs from the base. Revert the recorder edit, diagnose (most likely a shared helper or
   cache-key side effect), and journal. If no mechanism is found, halt: the new rows cannot land without it.
5. **A new row does not replay** (a port defect). Diagnosis mode: produce the artifact. A fix that stays inside
   `LabelDummySwitcher*.ts` and changes no existing expected value is in scope (D7). A fix outside those files, or one
   that changes an existing expected value, means: leave the row out of the anchored cases, file `needs-ruling` naming
   the row and the artifact, and continue with the other mutants.
6. **A mutant that can be neither killed nor proven equivalent.** No graph reaches it (the oracle refuses the graph,
   or its result is ambiguous), and D6's proof fails. Mark it `open` in `mutants.md`, file `needs-ruling` with the
   graphs tried, and continue.
7. **Cap.** The ref would pass 16 MiB. Halt T2 and journal the bytes per new row.

## Mechanics

8. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file is rerun alone does not count), or one location is edited three times in a row for
   the same check: halt that task with the diagnosis so far.
9. **Load.** Before a JVM run, check `uptime`; above 12, wait. Run under `nice -n 10`, detached, and poll in the
   foreground for at most 9 minutes at a time.

## Push-forward (decide and journal, do not stop)

- Graph shapes, node and label widths, and how many rows (fewest that kill the killable set).
- Row id suffixes within D4's pattern.
- Extra mutants `M19+` for a decision point the table misses.
- The scratch driver's form (D3).
- Whether T3 runs in the orchestrator or a subagent.
- A `follow-up` issue for any defect or cleanup outside #48.
