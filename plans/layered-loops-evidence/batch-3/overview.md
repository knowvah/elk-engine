<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: docs, gates, close-out and squash

Serial: T8 → T9, by the orchestrator.

| Task | Writes | Depends on |
| ---- | ------ | ---------- |
| [T8](T8-docs.md) | `docs/architecture/alg-layered-loops.md`, `docs/architecture/overview.md`, `docs/conformance.md` | batch 2 |
| [T9](T9-close-out.md) | `plans/roadmap.md`, `.agent-notes/layered-loops-evidence.md`, the README summary, the journal | T8 |

**Done when** queue gates 1-7 are green and journaled, and there is one squashed commit on the base with
`layered-loops-evidence/pre-squash` tagged.
