<!-- SPDX-License-Identifier: EPL-2.0 -->

# Stop conditions and push-forward: rectpacking-open-arm (issue #81)

The queue rules in the system prompt win over this file where they disagree.

## Stop (journal the stop, then act as stated)

1. **AD-13.** A landed test, vector, golden or ref would need a changed expected value. STOP for those rows: file `needs-ruling`
   naming them, leave them as they are, and finish the rest. Appending a row to `rectpacking.json` counts as such a change (D4).
2. **Oracle state.** `oracle-build.json` does not name `8bca22f4…` and patches 0001-0004. Rebuild with `tools/oracle/build.sh`
   and journal it. If the rebuild fails, halt.
3. **Upstream drift.** `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.rectpacking`
   lists a commit. Journal it. The mission still measures at the pin (D0); do not move the pin.
4. **Write-set.** A file outside the README's table needs a change. Stop that part, file a `follow-up`, and finish the rest.
5. **Gates.** The same gate check fails twice after two fix attempts. Halt with the diagnosis artifact in the journal.
6. **Decision contradicted.** Evidence contradicts a decision in [decisions.md](decisions.md) beyond the branches it already plans
   for (D4 and D5 are planned branches, not contradictions). Halt with the evidence.
7. **Port and oracle differ.** In the D2 cross-check, an input whose port output differs from the oracle beyond 1e-6 is a port
   defect. Enter diagnosis mode (mechanism, origin, causal chain, ruled out). If its fix is outside this write-set, file it as a
   `follow-up` with the artifact and drop that input from the support set, with the drop journaled. The proof does not depend on
   the cross-check.
8. **Time.** T1 stops proof work at 90 minutes and the search at 60 minutes of wall time. Then go to D5 with what holds.

## Push-forward (decide, journal, continue)

- The search's input generator, seeds, distributions and child-process timeout, keeping D2's minimums.
- The cross-check tool (`run.sh` or `json-sweep.sh`) and its input format.
- The wording of the `U` row, the doc sentences and the journal rows.
- Whether the old-pin explanation (8c's 299 multi-rect `nextBlock`s came from stale parent rows) is shown by evidence or left as a
  stated hypothesis. A check on `8aaa3c14` is optional, needs a scratch build, and must never write to `~/git/knowvah/elk`.
- Splitting L1-L5 into finer lemmas, or merging them, so long as each claim keeps its file:line.
