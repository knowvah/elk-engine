<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: docs; close-out and squash

Sequential: T3 runs the gates on T2's tree.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T2](T2-docs.md) | elk-json.md §5-§7; the conformance J6 bullet | orchestrator | `docs/architecture/elk-json.md`, `docs/conformance.md` | T1 | [x] |
| [T3](T3-close-out.md) | Gate 7 rerun, gates 1-6, corpus hand-off report and follow-up, roadmap, notes, squash | orchestrator | `plans/roadmap.md`, `.agent-notes/parse-refs-layered-keys.md`, README, journal | T2 | [x] |
