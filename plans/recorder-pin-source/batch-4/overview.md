<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4: close-out

One task, after batch 3. Gates 1-6 may run beside T3's `elkj` lane once every edit is committed (the full suite only
when load allows, stop 8); gate 7 and the squash wait for the lane.

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T4](T4-close-out.md) | `plans/roadmap.md` (append only); `plans/recorder-pin-source/README.md`; `decision-journal.md`; `.agent-notes/recorder-pin-source.md`; `tools/codeql/accepted.json` (only for an accepted finding, journaled) | [x] |

Done when T4's acceptance criteria hold and the branch carries exactly one mission commit on the base (README
"Landing").
