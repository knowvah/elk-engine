<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — Docs, runbook, roadmap

One task. Depends on batch 5 (the numbers it reports come from the final replay). After T15 the orchestrator runs the
final gates, appends the mission summary to `README.md` (orchestrator-owned, like the batch status column) and stops
at stop 14.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T15 | Architecture doc + runbook; overview, conformance, port-map, inventory, translation rules; roadmap revision; agent notes | documentation-engineer | docs/architecture/{grandom,overview,port-map,inventory}.md, docs/conformance.md, docs/translation-rules.md, plans/roadmap.md, .agent-notes/grandom.md | T14 | [x] |

Batch done when T15's acceptance criteria pass, `npm run docs:build` is green and the README gates are green.
