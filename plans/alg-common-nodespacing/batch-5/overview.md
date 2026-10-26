<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Docs, inventory and roadmap

One task, run by the main session (the orchestrator), after T7. Then the mission-end gates and the landing regroup
(stop 12).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T8 | Architecture docs, conformance, collections inventory (if any), roadmap revision, agent notes | main session | docs/architecture/{alg-common,port-map,component-map,overview}.md, docs/conformance.md, docs/translation-rules-collections.md (only if an I-row was drafted), plans/roadmap.md (append only), .agent-notes/alg-common-nodespacing.md, plans/alg-common-nodespacing/README.md (summary) | T7 | [x] |

The batch is done when `npm run docs:build` is green, the mission-end gates in the README pass, and the README has a
mission summary.
