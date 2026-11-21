<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: cold proof

One task, after batch 2 (no `tools/vectors/` edit may follow it). It holds the mission's long lane.

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T3](T3-cold-proof.md) | `test/golden/refs/java/` (rewritten in place, must end byte-identical); gitignored sweep dirs; `$ELK_ORACLE_DIR/vector-cache/` (through the scripts); `decision-journal.md` | [x] |

Done when T3's acceptance criteria hold. Commit only `decision-journal.md` and the batch status:
`docs(plans): record the recorder-pin-source cold proof` (unsigned, `-F <file>`). A non-empty
`git diff test/golden/refs/` at this point is stop 3, never part of a commit.
