<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: close-out

One orchestrator task after batch 1.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T3](T3-close-out.md) | Follow-ups, queue gates 1-7, roadmap revision, notes, summary, squash | orchestrator | `plans/roadmap.md` (append), `plans/linkedlist-int32-cleanup/{README,decision-journal,audit,int32-sites}.md`, `.agent-notes/linkedlist-int32-cleanup.md`, `tools/codeql/accepted.json` (only if journaled) | T1, T2 | [x] |
