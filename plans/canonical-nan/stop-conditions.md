<!-- SPDX-License-Identifier: EPL-2.0 -->

# canonical-nan: stop conditions and push-forward

A **halt** stops the mission, with the question as the final line. A **partial** files a `needs-ruling` issue for the
exact part, leaves that part as it is, and finishes the rest. Journal every stop caused by a discrepancy with the diagnosis
artifact: mechanism, origin `file:line`, causal chain, and what was ruled out.

| # | Condition | Action |
| - | --------- | ------ |
| 1 | T1: an **unchanged** recorder's output differs from its ref | Pre-existing drift, not this mission's. Diagnose enough to name it, file `needs-ruling` naming the recorder and rows, leave that ref as it is, exclude it from D7 step 2's copy, and finish the rest |
| 2 | T1 cannot classify a site, or a site's consumer is both a layout and a bit-level test | Treat it as `raw` (D1) and journal why; split the encoder only if T2 or T3 can do it inside its write-set |
| 3 | T4: a regenerated ref differs on any non-NaN value, or in shape | AD-13 STOP. Diagnose the edit that caused it (the encoder change alone cannot change non-NaN bits). Fix within the 2-fix cap without touching the ref; otherwise halt |
| 4 | T4: a sweep case changes status, class or processor, or an `ok` hash changes on a case whose dump has no NaN | Treat as stop 3 for that sweep's recorder or TS helper |
| 5 | Any landed test fails after T2 or T3, or a test can pass only by changing its expected value | Diagnose; restore the site if the fix is not found within the 2-fix cap. An expected-value change is `needs-ruling` naming the rows. Halt before the squash if gate 4 cannot go green |
| 6 | A decision in [decisions.md](decisions.md) proves wrong | Journal it. Push forward if the fix stays inside the task's write-set and changes no expected value; otherwise halt with the question |
| 7 | A recorder needs its NaN guard removed to pass, or a site cannot move without changing what the recorder computes | Partial: leave that site as it is and file `needs-ruling` |
| 8 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh` and journal it. Halt if the rebuild fails twice |
| 9 | A queue gate fails after 2 fix attempts on that check | Halt |
| 10 | A needed write lies outside the write-sets: `src/` (other than the two `src/alg/common/**/*.test.ts` of T3), an earlier mission's `plans/`, `~/.claude`, `~/git/knowvah/elk`, the main checkout | Halt with the question |
| 11 | A budget runs out: T1 60 min, T2 or T3 60 min, T4 100 min | Push forward with the finished sites; the close-out `follow-up` lists the rest by file and line |

## Push-forward (decide and journal)

- Helper and constant names beyond D2, test layout, which helpers get an exported encoder for testing.
- The allowlist entries of D5 for input builders and bit-level tests, each with its reason.
- Sweep stride (stride 1 if the phase sweep fits the budget, else the default 2, journaled).
- Wording of the conformance entry, header comments and journal rows.
- Filing `follow-up` issues (never `queue:ready`) for defects met on the way, such as a recorder comment that misstates its
  encoding or a ref that drifts (stop 1 files `needs-ruling` instead).
