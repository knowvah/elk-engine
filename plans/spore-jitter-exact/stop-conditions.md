<!-- SPDX-License-Identifier: EPL-2.0 -->

# spore-jitter-exact: stop conditions and push-forward

A **halt** stops the mission, with the question as the final line. A **partial** files a `needs-ruling` issue for the exact
part, leaves it as it is, and finishes the rest. Journal every stop caused by a discrepancy with the diagnosis artifact:
mechanism, origin `file:line`, causal chain, and what was ruled out.

| # | Condition | Action |
| - | --------- | ------ |
| 1 | A recorder self-check fails on a `shift` row (round trip, stepwise end vs engine, build-twice bytes, `jitterNodes` differs between imports) | Diagnosis mode on the recorder first: the jitter path never ran these checks before. A recorder defect is fixed in T1 (2-fix cap). An oracle behaviour (for example the stepwise importer seeded differently from the engine's) is journaled with the artifact; if no exact row can be recorded for that scenario, drop that scenario from `shift`, file `needs-ruling` naming it, and record the rest |
| 2 | The port differs from a `shift` row beyond 1e-6, or in a non-numeric value | Diagnosis mode, default stance "the port differs": instrument the oracle and the port at the `import` stop (`shiftUntilUnique`, `Random.nextDouble`, the `nodeMap` key order). Fix at the origin inside `src/alg/spore/` or `src/java/util/Random.ts` within the 2-fix cap, with every landed spore replay green. Otherwise halt with the artifact: a red test cannot be committed and its expected value cannot change |
| 3 | The D5 check finds a landed row changed, or a header field other than `rowCounts.shift` | Halt before committing the ref: the recorder change leaked into existing rows. Diagnose with the `-U0` hunks; a moved stack frame (`.agent-notes/elk-pin-move-8bca22f4.md`) is still a change here, since no Java line moved |
| 4 | Any landed test fails, or a test can pass only by changing its expected value or a count (AD-13) | Halt. File `needs-ruling` naming the rows |
| 5 | A decision in [decisions.md](decisions.md) proves wrong | Journal it. Push forward if the fix stays inside the task's write-set and changes no landed expected value; otherwise halt with the question |
| 6 | A queue gate fails after 2 fix attempts on that check | Halt. A wall-clock timeout under other sessions' load is not a fix attempt: rerun on a quieter machine, never raise a timeout |
| 7 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh` and journal it. Halt if the rebuild fails twice |
| 8 | A needed write lies outside the README's table: another recorder or ref, an earlier mission's `plans/` file (other than the one appended row), `~/.claude`, `~/git/knowvah/elk` or the main checkout | Halt with the question |

## Push-forward (decide and journal)

- The constant name, helper names and message texts in the recorder; where in `buildRows` the `shift` rows are built, as long
  as rows sort by `ROW_GROUPS`.
- Test titles, the helper split inside the two test files (keep each under the 500-line write hook), and whether
  `checkRow`'s new branch gets a malformed-row case in `test/helpers/spore-replay-dump.test.ts`.
- Wording of docs, journal rows, the 8c closing row and the issue comment.
- Filing `follow-up` issues (never `queue:ready`) for defects met on the way.
