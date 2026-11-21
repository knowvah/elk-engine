<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions: dev-assert-restore (auto-confirmed at planning, 2026-11-20)

Queue form. A stop that blocks only part of the work: `gh issue create --label needs-ruling` (or `follow-up` where
named) naming the exact part, a journal row, then finish the rest. A stop that blocks the whole mission: journal it,
commit the work as a temporary commit, and end with the driver's halted line, the question in the final line.

## Halts (the whole mission)

1. **Writes outside the allowed set.** Under `src/`: anything but the ten site files of the README table and
   `*.test.ts` files. Anything under `test/golden/refs/`, `tools/vectors/`, `tools/oracle/` (patches included), a
   recorder, `../elk`, `../elk-oracle` (beyond `build.sh`), `$ELK_MODELS_DIR`, `~/.claude`, the main checkout, another
   repository.
2. **Baseline red.** A queue gate fails on the untouched tree: journal the failing test names and halt as blocked.
3. **An expected value would change** (AD-13). Any test, vector or golden that passes only by changing an expected
   value, a tolerance, a case list or a title outside D1-D7 is a STOP for that row: revert the edit, file
   `needs-ruling` naming file and case, journal. It halts the mission only if every remaining task depends on it.

## Partial stops (file and continue)

4. **A restored site fires outside its ruled set.** In the suite (T2 census or later) or a sweep (T6): a test or case
   that fires one of the ten sites and is neither in #112's / #113's lists nor, for #32, meets D2. Diagnosis mode as far
   as the test side reaches, then: put that site back as a comment naming the new issue, drop its wraps and its new
   test, file `needs-ruling` with the test or case id and a JVM stack under `-ea:org.eclipse.elk...`
   (`tools/oracle/run.sh`, `loops-sweep.sh --dump` or the matching tool's `--dump`), journal, finish the rest. Same
   check that found the `ThresholdStrategy` asserts (#112, comment of 2026-11-20). An assert other than the ten
   firing (a site #45 restored) is the same stop for that site.
5. **The #32 count is not 170.** Diagnose per D3. A firing test the predicate misses is stop 4. Extra selected tests
   with an explained mechanism are journaled, not a stop. An unexplained difference: file `needs-ruling` with the
   predicate, the count and the test list; keep the wraps.
6. **A site cannot be restored as Java has it** without changing TS narrowing, a non-null assertion, or behaviour
   with assertions off: leave that site a comment, file `needs-ruling`, journal.
7. **A new test cannot reach the `AssertionError`** on the input D6 names: diagnosis mode (instrument the site, dump
   the operand values). If the input does not violate the assert, the census row was wrong: journal the mechanism and
   pick a violating input from the Java source; if none exists, file `needs-ruling`.

## Mechanics

8. **Repeated failure.** The same gate fails twice in a row after fix attempts (a vitest "timed out in 5000ms" under
   load that passes when its file reruns alone does not count), or one location is edited three times in a row for the
   same check: halt that task with the diagnosis so far.
9. **Load.** Before a sweep batch or any JVM run, `uptime`; above 12, wait; run under `nice -n 10`, detached per the
   queue's long-run rule.

## Push-forward (decide and journal, do not stop)

- Helper and constant names; where in a family's runner the wrap sits, within D3.
- The shape of D2's recursion and of the temporary counter.
- New test titles and which census row each uses.
- Whether a stale doc line about the sites is in scope (it is when it names #112's #32 or #113 as pending).
- Wording of comments, docs, journal rows, issues, the inventory section and the roadmap revision.
- A `follow-up` issue for a defect or cleanup outside #127 (never `queue:ready`).
