<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: java-tests-bundles (auto-confirmed at planning, 2026-11-20)

These use the queue form. A stop that blocks only part of the work: run `gh issue create --label needs-ruling` naming
the exact part, journal a `ruling` row, and finish the rest. A stop that blocks the whole mission: journal it, commit
the work as a temporary commit, and end with the driver's halted line, with the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** Any write in `../elk`, `$ELK_ORACLE_DIR` (beyond what a JVM run itself does,
   which is nothing: logs go to `$TMPDIR`), `$ELK_MODELS_DIR`, `~/.claude`, the main checkout or another repository.
   That includes running `tools/oracle/build.sh` and any edit under `tools/vectors/` (D2).
2. **Baseline red.** A queue gate fails on the untouched tree: journal the failing test names and halt as blocked.
   (At planning: `format:check`, `typecheck`, and `test/architecture` + the runbook test, 242 tests, were green; the
   previous mission journaled gates 1-7 green on the base.)

## Partial stops (file and continue)

3. **Oracle not as planned.** `oracle-build.json` does not name `8bca22f4…` with patches 0001-0003, a D1 bundle has no
   `target/classes`, or `../elk` has commits after the pin under `plugins/` or `test/`. Do not rebuild. File
   `needs-ruling` naming it; land the script, the fitness test and the docs, and journal the JVM evidence as not run.
4. **A count differs.** A class fails, or its `runs` differs between the "before" run, the "after" run and the planning
   probe (D5). These are oracle facts, not port expectations: never edit a test, the brief's numbers or the class list
   to match. Enter diagnosis mode (mechanism, origin, causal chain, ruled out; first suspects: a classpath shadowing,
   `MODELS_REPO` unset, the machine under load timing out a test) and journal it. A cause in the script change is
   fixed; a cause in the oracle or the models is filed `needs-ruling` naming the classes, and the rest lands.
5. **A class cannot load with the current `THIRD_PARTY`.** (The probe says it will not happen.) Do not edit
   `tools/vectors/`. Adding the missing bundle to `java-tests.sh`'s `THIRD_PARTY` makes
   `label-sizing-vectors.sh:25`'s "Same list" comment false: make the addition only if one jar fixes it, journal it,
   and file a `follow-up` for the comment; otherwise file `needs-ruling` naming the classes.
6. **More of the script would change.** If anything beyond `TEST_BUNDLES` and the header comment of `java-tests.sh`
   needs editing (a new flag, a change to `build_classpath` or `run_class`): do not make it; file `needs-ruling`.

## Mechanics

7. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file is rerun alone does not count): halt with the diagnosis so far.
8. **Load.** Before each JVM run and the full suite, check `uptime`; above 12, wait. Run them under `nice -n 10`.

## Push-forward (decide and journal, do not stop)

- How the array wraps, and the exact header-comment wording within D1.
- Test names, helper shape and the walk's file filter, within the complexity limits (30 NLOC, CCN 10, 5 parameters).
- The exact doc wording within D6, including whether a page keeps its expected counts inline or points at § 10.
- A class count other than 143 at mission start (a port landed since planning): use the actual list and journal it.
- `follow-up` issues for anything found on the way.
