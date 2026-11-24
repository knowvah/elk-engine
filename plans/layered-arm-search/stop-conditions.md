<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-arm-search: stop conditions and push-forward

A **halt** stops the mission with the question as the final line. A **partial** files a `needs-ruling` issue (or the
`follow-up` issue named below) for the exact part, leaves that part as it is, and finishes the rest. Every stop caused
by a discrepancy is journaled with the diagnosis artifact: mechanism, origin `file:line`, causal chain, ruled out.

| # | Condition | Action |
| - | --------- | ------ |
| 1 | A needed change lies in a production `src/` file, in a recorder outside `SCENARIOS`/`SITE_ROWS`, or needs a new step kind or row kind | Partial. The arm keeps the best outcome reachable without the change (2, 3 or 4). File a `needs-ruling` issue naming what the change would buy. Never edit the 25 arms or their classes |
| 2 | A new row replays differently in TypeScript than on the oracle | Diagnosis mode (D7): instrument both sides to the first divergence. Then file a `follow-up` issue with the artifact, keep the row out of the ref, and record the arm as "reached on the oracle; port diverges, #N". This is a partial, not a halt |
| 3 | The D5 diff shows any change to an existing row, to the order of rows, or to the header beyond `rowCounts` | Halt. Restore both refs from HEAD and keep the scratch output |
| 4 | An existing test, vector or golden can pass only by changing its expected value (AD-13) | Partial: `needs-ruling` naming the rows, then finish the rest. Halt before the squash if gate 4 cannot go green |
| 5 | Reaching an arm would need an oracle patch, a change to the pin, or a write to `~/git/knowvah/elk` or the oracle worktree, beyond D2's scratch copy | Partial: `needs-ruling`. The arm is outcome 4, with the patch drafted in the journal |
| 6 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh` and journal it. If the rebuild fails twice, halt |
| 7 | A group's 4 h budget (D4) runs out | Push-forward: its open arms become outcome 4, recorded with what was tried and the closest approach. Not a stop |
| 8 | A proof of deadness rests on JVM sort order, hash order or float rounding, and the port could differ there | Journal it. Classify the arm as outcome 3 only if the argument holds for the JVM and for the port (AD-10 order, the `Float32` shims). Otherwise it is outcome 4, with the argument recorded |
| 9 | A queue gate fails after 2 fix attempts on that check | Halt |
| 10 | A needed write lies in an earlier mission's `plans/` file other than the D8 journal rows and the appended `unreached.md` section, or in `~/.claude` or the main checkout | Halt with the question. A write elsewhere in the worktree, outside the blast radius, is allowed when the work needs it (driver rule); journal why |

## Push-forward (decide and journal)

- Row ids (`scenarios/<Class>/<name>`, `sites/<Class>/<name>`), which candidate to keep when several reach one arm (the
  smallest graph), and dropping duplicate candidates.
- How a group divides its 4 h among its arms. When to stop a line of search inside the budget.
- Which corpus sweeps to instrument. The logging format of the scratch instrumentation.
- Whether an arm the probes reach on the oracle but only with constructed state is outcome 2, and whether a real layout
  could produce that state (the issue asks for that note).
- Wording of the `unreached.md` section, the conformance text and the journal rows.
- Filing `follow-up` issues (never `queue:ready`) for other unreached arms met on the way (D9), or for defects outside
  scope.
