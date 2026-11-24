<!-- SPDX-License-Identifier: EPL-2.0 -->

# last-ulp-bar: stop conditions and push-forward

A **halt** stops the mission, with the question as the final line. A **partial** files a `needs-ruling` issue for the
exact part, leaves that part as it is, and finishes the rest. Journal every stop caused by a discrepancy with the diagnosis
artifact: mechanism, origin `file:line`, causal chain, and what was ruled out.

| # | Condition | Action |
| - | --------- | ------ |
| 1 | T1 cannot reproduce a documented observation (E1's option string or E2's 32 fields) from the current tree and oracle | Diagnose (instrument both sides, D3). If the divergence is gone, class the entry `no-divergence` with the evidence and journal it; if it changed shape, treat it as stop 4 |
| 2 | T1 cannot collect an entry's inputs from the TS side, or the TS and oracle inputs are not bit-identical | Diagnose the first value that differs. A non-math cause makes the entry `fails` (D7, partial) |
| 3 | T3: no recorded oracle run of E1 reproduces the sweep's `childAreaHeight` (`"2561.1171089266686"`) | Journal the cold and warm results. Keep the `math` rows as the mechanism pin; record the bound against the run(s) recorded and against the sweep cache in the journal (file hash), and file `needs-ruling` on how E1 should be pinned. Finish the rest |
| 4 | An entry measures above 0.01 px, flips an id, count or other discrete value, or has no demonstrated mechanism | D7: partial, `needs-ruling` per entry. Do not fix, do not re-class |
| 5 | A landed test or ref changes, or a test can pass only by changing its expected value | AD-13 STOP: restore the file; `needs-ruling` naming the rows. Halt before the squash if gate 4 cannot go green |
| 6 | A decision in [decisions.md](decisions.md) proves wrong | Journal it. Push forward if the fix stays inside the task's write-set and changes no expected value; otherwise halt with the question |
| 7 | The AD-4 amendment cannot be appended without editing earlier text of `plans/elk-engine-skeleton/decisions.md` | Halt with the question |
| 8 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh` and journal it. Halt if the rebuild fails twice |
| 9 | A queue gate fails after 2 fix attempts on that check | Halt |
| 10 | A needed write lies outside the write-sets: any `src/` file, `compare-json.ts`, an existing ref, `~/.claude`, `~/git/knowvah/elk`, the main checkout | Halt with the question |
| 11 | A budget runs out: T1 80 min, T3 80 min, T4 70 min | Push forward with the finished entries; the close-out `follow-up` lists the rest |

## Push-forward (decide and journal)

- Warm-up counts of D4 (calls and layout repetitions), recorder row layout and header comment, script flags.
- Names of constants and helpers in the pinning test, and whether the D3 walker lives in the test or `test/helpers/`.
- Wording of the amendment's provenance line, the `CLAUDE.md` clause and the docs table.
- Collecting E1's inputs for every `sin`/`cos` call of the layout or only `EadesRadial.java:101-102` (record what was done).
- Filing `follow-up` issues (never `queue:ready`) for defects met on the way.
