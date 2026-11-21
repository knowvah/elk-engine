<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: vector-recorder-debts (auto-confirmed at planning, 2026-11-21)

These use the queue form.

- **A stop that blocks only part of the work.** Run `gh issue create --label needs-ruling` naming the exact part,
  journal a `ruling` row, and finish the rest.
- **A stop that blocks the whole mission.** Journal it, commit the work as a temporary commit, and end with the
  driver's halted line, with the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** Any write in `../elk`, `$ELK_MODELS_DIR`, `~/.claude`, the main checkout or
   another repository. `$ELK_ORACLE_DIR` is written only through the `tools/oracle/` and `tools/vectors/` scripts.
2. **Baseline red.** A queue gate fails on the untouched tree. Journal the failing test names and halt as blocked.

## Partial stops (file and continue)

3. **A ref changes (AD-13).** Any byte of `test/golden/refs/` differs after a run.
   - Do not re-record, edit, or revert the ref to get green. Enter diagnosis mode (mechanism, origin, chain, ruled out).
   - If `layered-loops.json` moved after T4, compare the T1-only source (pre-T4 commit) against the split source on
     the same oracle. This isolates the split from the build.
   - Expected mechanisms: a moved class whose binary name is recorded, or a moved static initializer whose order
     changed. Fix the split, which is a tooling change, not a ref change, and re-prove.
   - If the T1 build alone moves a ref, revert the build for that program, keep the rest, and file `needs-ruling`
     with the artifact.
4. **The loops sweep's `results.jsonl` differs** from T1's before-side. Same handling as 3. If the before-side was not
   fresh at T1 step 1, the comparison is void: journal it as void, not as a pass.
5. **More would change.**
   - Stop if any of these would need a change: a recorder other than `LayeredLoopsVectors.java` (beyond T3's
     comment), a sweep script other than `loops-sweep.sh`, a ref, or an oracle expectation in a melk or replay test.
   - Stop if a decision of `decisions.md` proves wrong. Example: the D4 element type is not derivable from the `.melk`
     model.
   - Do not make the change. File `needs-ruling` with the file and the reason, and finish the rest.
6. **A test assertion would change beyond D4.** Any test other than the two melk tests D4 names would need an
   expected value changed (for example a replay comparison that fails once `KVectorChain` is encoded). This is AD-13.
   Diagnose first: the port may differ. File `needs-ruling` naming the rows, and leave that part undone.

## Mechanics

7. **Repeated failure.** The same gate fails twice in a row after fix attempts: halt with the diagnosis so far. A
   vitest "timed out in 5000ms" under load that passes when its file is rerun alone does not count.
8. **Load.**
   - Before a recorder, the sweep or the full suite, check `uptime`. Above 12, wait, gating with a loop, not a
     printed value (`.agent-notes/recorder-pin-source.md`). Run under `nice -n 10`.
   - The `elkj` lane is one JVM and may run beside short recorders, one at a time. Never run the full suite beside
     the loops sweep.
9. **The `elkj` lane fails or exceeds 7 h.** Journal the log tail and the last row. If the failure is in the new
   launch path, fix it and restart the lane. Any other failure is diagnosis, then halt if unexplained.

## Push-forward (decide and journal, do not stop)

- The helper's function names, its header wording, and the temp-dir cleanup mechanism (`trap`).
- How `LayeredLoopsVectors` is cut into files, and the file names under `tools/vectors/LayeredLoopsVectors/`, within D3.
- Where the new shell test lives (suggested: `test/vectors/java-program.test.ts`, using stub `java` and `javac` on
  `PATH`).
- Doc wording in runbook § 7, `docs/architecture/alg-layered-loops.md` and `docs/architecture/alg-layered.md`.
- `follow-up` issues for anything found on the way.
