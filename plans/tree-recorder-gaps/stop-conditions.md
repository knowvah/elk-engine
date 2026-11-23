<!-- SPDX-License-Identifier: EPL-2.0 -->

# tree-recorder-gaps: stop conditions and push-forward

A **halt** stops the mission with the question as the final line. A **partial** files a `needs-ruling` issue (or the
`follow-up` issue named below) for the exact part, leaves that part as it is, and finishes the rest. Every stop caused by a
discrepancy is journaled with the diagnosis artifact: mechanism, origin `file:line`, causal chain, ruled out.

| # | Condition | Action |
| - | --------- | ------ |
| 1 | An item needs a production `src/` change, a change to a stop-dump contract, or a new step or row kind in a recorder | Partial: the item keeps the best outcome reachable without it (3 or 4). File a `needs-ruling` issue naming what the change would buy |
| 2 | A new row replays differently in TypeScript than on the oracle | Diagnosis mode: instrument both sides to the first divergence. File a `follow-up` with the artifact, keep the row out of the ref, record outcome 2 (D7). A partial, not a halt |
| 3 | Any byte of `radial.json`, `vertiflex.json`, `mrtree.json`, `mrtree-extra.json` or `mrtree-units.json` changes after a recorder run | Halt that task. Restore the file with `git checkout -- <file>`, keep the scratch output, journal the diff. The recorder edit must be fixed so that the file is identical, or it is a halt |
| 4 | An existing test, vector or golden can pass only by changing its expected value (AD-13) | Partial: `needs-ruling` naming the rows, then finish the rest. Halt before the squash if gate 4 cannot go green |
| 5 | An item needs an oracle patch, a pin change, or a write to `~/git/knowvah/elk` or the oracle worktree | Partial: `needs-ruling`, with the patch drafted in the journal. The item is outcome 4 |
| 6 | A decision in [decisions.md](decisions.md) proves wrong (e.g. a helper cannot take a file path without changing an existing test) | Journal it. If the fix stays inside the task's write-set and changes no expected value, push forward. Otherwise halt with the question |
| 7 | An item's 45 min budget (D4) runs out | Push-forward: outcome 4, with what was tried and the closest approach. Not a stop |
| 8 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh` and journal it. If the rebuild fails twice, halt |
| 9 | A queue gate fails after 2 fix attempts on that check | Halt |
| 10 | A mutant run leaves `git diff` non-empty on the mutated file | Halt the batch. Restore the file from HEAD, journal it, and check every other `src/` file is clean before going on |
| 11 | A needed write lies in an earlier mission's `plans/` file other than D6's appended section and closing row, or in `~/.claude` or the main checkout | Halt with the question |

## Push-forward (decide and journal)

- Row ids (`<group>/<family>/<name>`, family names such as `gaps66`), seeds, scenario shapes, and which candidate to keep
  when several work (the smallest graph).
- The selector variable name and its values. Whether a bundle needs a path helper.
- How a bundle divides its budget among its items, and when to stop a line of search inside it.
- Whether a mutant that the search shows to be equivalent is outcome 3 (journal the argument).
- Wording of the `unreached.md` section, the doc rows and the journal rows.
- Filing `follow-up` issues (never `queue:ready`) for other arms or defects met on the way.
