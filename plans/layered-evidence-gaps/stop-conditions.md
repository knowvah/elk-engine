<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-evidence-gaps: stop conditions and push-forward

A **halt** stops the mission with the question as the final line. A **partial** files a `needs-ruling` issue naming the
exact part, leaves that part as it is, and finishes the rest. Every stop caused by a discrepancy is journaled with the
diagnosis artifact (mechanism, origin `file:line`, causal chain, ruled out).

| # | Condition | Action |
| - | --------- | ------ |
| 1 | The D5 id-keyed diff shows a base row changed or removed in any ref, or a ref outside D5 changes | Halt that task: restore the ref from HEAD, keep the evidence in `$TMPDIR`, diagnose (recorder non-determinism or a recorder edit leaking into other rows). Mechanism found and the recorder fixed so base rows are byte-equal: proceed. Else halt |
| 2 | The TS replay does not match a new row at the AD-4 bar | Diagnosis mode (instrument the oracle and the port, find the first divergence). A D7 fix with a stated mechanism: proceed. No mechanism after 2 fix attempts: partial (`needs-ruling` naming the rows; drop those rows from the recorder so the ref holds no red row) |
| 3 | A test or vector can pass only by changing an expected value of an existing row (AD-13) | Partial: `needs-ruling` naming the test and rows; leave them unchanged; finish the rest; halt before the squash if gate 4 cannot go green |
| 4 | Item 3: an arm is reached by neither a layout row nor a direct-call row, and no proof holds after the search | Partial: `needs-ruling` naming the arm, with the search and the partial argument in `unreached.md`; finish the rest |
| 5 | A recorder would exceed 5,000 lines or a ref 16 MiB (`plans/roadmap.md` 2026-11-03 caps) | Partial for that item (`needs-ruling`: second launcher or ref) |
| 6 | Item 2: no input puts two N or two S dummies in one layer at the HPDS stop, contrary to D2's reading | Diagnosis (instrument the oracle's HPCP); then a proof in `unreached.md` if it holds, else partial |
| 7 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh`, journal; `build.sh` fails twice: halt |
| 8 | A needed write outside the README's blast radius, to an earlier mission's `plans/` files, `~/git/knowvah/elk`, `~/.claude` or the main checkout | Halt with the question |
| 9 | A queue gate fails after 2 fix attempts on that check | Halt |

## Push-forward (decide and journal)

- Exact row ids and option values inside the shapes D2-D4 give; adding a few more rows of the same shape.
- Which T1 rows count as non-vacuous (from the per-row counts); test wording.
- The floating-point search method for D3 and its sample budget.
- Recorder run order and reruns after a tool failure that is not a ref change.
- Inventory growth under D6.
- Whether T1 or T3's search run as subagents.
- Filing `follow-up` issues (never `queue:ready`), e.g. a ptolemy IPP row (D1) or the `plans/layered-edge-routing/unreached.md:31`
  "two arms" vs three wording.
