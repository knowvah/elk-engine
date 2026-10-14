<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 9 — Local sweep and documentation

Two independent tasks with disjoint write-sets: T23 measures the Phase 4 indicators over all 898 `.elkt` and
550 realworld `.json` models against the oracle (local only) and writes the `.elkt` section of
`docs/conformance.md`; T24 writes the architecture and runbook docs. Depends on batch 8.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T23 | `.elkt` oracle sweep, local sweep test, conformance section | tooling-engineer | tools/oracle/elkt-sweep.sh (+ tools/oracle/ElktSweep.java), test/corpus/elkt-sweep.test.ts, docs/conformance.md | T22 | [x] |
| T24 | elk-text architecture doc, port-map, translation rules, roadmap follow-up | typescript-pro | docs/architecture/{elk-text,port-map,overview}.md, docs/translation-rules.md, plans/roadmap.md | T22 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
