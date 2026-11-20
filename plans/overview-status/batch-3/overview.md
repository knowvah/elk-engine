<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: close-out

One task, run by the orchestrator. Depends on batch 2.

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T3](T3-close-out.md) | `plans/roadmap.md` (append), `plans/overview-status/{README,decision-journal}.md`, `.agent-notes/overview-status.md`, `tools/codeql/accepted.json` (only if needed) | [x] |

Done when T3's acceptance criteria hold and the mission is squashed to one commit (README "Landing").
