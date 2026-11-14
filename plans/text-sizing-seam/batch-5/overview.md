<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5: docs and close-out

T6 writes the docs from the journal's numbers. T7 runs the end gates, appends the roadmap revision and squashes. T7 waits for
T6.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T6](T6-docs.md) | Conformance § 1 table and § 4, the reference-platform pin, the row-10 section, the architecture page | documentation-engineer (sonnet) | `docs/conformance.md`, `docs/architecture/text-sizing-seam.md`, `docs/architecture/overview.md` (one link line) | T4, T5 | [x] |
| [T7](T7-close-out.md) | End gates 1-6, roadmap revision, agent notes, issue comment, squash | orchestrator | `plans/roadmap.md` (append), `.agent-notes/text-sizing-seam.md`, `plans/text-sizing-seam/README.md` (summary) | T6 | [x] |
