<!-- SPDX-License-Identifier: EPL-2.0 -->

# compound-mutant-rows: stop conditions and push-forward

A **halt** stops the mission with the question as the final line. A **partial** files a `needs-ruling` issue (or the
`follow-up` named below) for the exact part, leaves that part as it is, and finishes the rest. Every stop caused by a
discrepancy is journaled with the diagnosis artifact: mechanism, origin `file:line`, causal chain, ruled out.

| # | Condition | Action |
| - | --------- | ------ |
| 1 | An item needs a production `src/` change, a change to the stop contract (`StopRecorder`, `stopProcessor`, the tree dump, `runToStop` matching), or a recorder change beyond D2-D4 | Partial: the item keeps the best outcome reachable without it. File `needs-ruling` naming what the change would buy |
| 2 | A new row replays differently in TS than on the oracle | Diagnosis mode: instrument both sides to the first divergence. File a `follow-up` with the artifact, keep the row out of the ref, outcome 3 (D6). A partial, not a halt |
| 3 | Any existing row of `layered-compound.json` changes (D5 id-keyed diff), or any other ref changes | Halt that task. Restore the ref with `git checkout -- <file>`, keep the scratch output, journal the diff. Fix the recorder edit until the existing rows are identical, or halt |
| 4 | An existing test, vector or golden can pass only by changing its expected value (AD-13), **other than** the D1 extension of `DIFFERING_ROWS` | Partial: `needs-ruling` naming the rows and the test, withhold those rows (a patch under `plans/compound-mutant-rows/withheld/`, as #59 did), finish the rest |
| 5 | A row would need to join `DIFFERING_ROWS` but fails one of the four per-row checks of the twin loop (`LayeredCompoundTwins.test.ts:286-293`) | Diagnosis mode, then treat as stop 2 or stop 4, whichever the mechanism shows. Never weaken the loop |
| 6 | An item needs an oracle patch, a pin change, or a write to `~/git/knowvah/elk` or the oracle worktree | Partial: `needs-ruling`, with the patch drafted in the journal. The item is outcome 4 |
| 7 | An item's budget runs out (40 min per item, 30 min for I8) | Push-forward: outcome 4 with what was tried and the closest approach. Not a stop |
| 8 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh` and journal it. If the rebuild fails twice, halt |
| 9 | A queue gate fails after 2 fix attempts on that check | Halt |
| 10 | After a mutant run, `git diff --quiet -- src/` fails in the queue worktree | Halt the batch. Restore from HEAD, journal it, and check every other `src/` file before going on |
| 11 | A needed write lies in an earlier mission's `plans/` file, other than the appended section of `plans/layered-compound/unreached.md` and one closing row in `plans/layered-compound/decision-journal.md`, or in `~/.claude` or the main checkout | Halt with the question |

## Push-forward (decide and journal)

- Exact row ids within the families of [items.md](items.md). Port and node ids inside the graphs. Which candidate to
  keep when several work (the smallest graph). Small changes to a graph that keep its intent, when the issue's graph
  does not reach the arm on the oracle (journal both).
- The `EVIDENCE_ROWS` / `evidenceModelSpecs` / `WorkRecorder` names and their header comments in the recorder.
- Whether I6 lands as a `sites` row or a `models` row (D3 order).
- Entries in `test/helpers/layered-compound-site-arms.json` for the new `sites` rows (the arms each one targets),
  checked by `node tools/vectors/compound-site-arms.mjs <ids>`.
- Whether a mutant is equivalent (outcome 2): journal the argument.
- Wording of the doc rows, the `unreached.md` section and the journal rows. Filing `follow-up` issues (never
  `queue:ready`) for other defects met on the way.
