<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 9 — Local sweep; docs and plans

T17 measures the exit criteria (D2 = A′); T18 documents them, so T18 runs after T17.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T17 | `.elkj` oracle sweep and the TS sweep test | tooling-engineer | tools/oracle/elkj-sweep.sh, tools/oracle/ElkjSweep.java, test/corpus/elkj-sweep.test.ts | T1, T13, T14, T16 | [x] |
| T18 | Docs, roadmap revision, mission summary | technical-writer | docs/architecture/elk-json-text.md, docs/architecture/overview.md, docs/conformance.md, docs/translation-rules.md, plans/roadmap.md (append), plans/graph-json-text/README.md (append), .agent-notes/graph-json-text.md | T17 | [x] |

Batch done when both tasks' acceptance criteria pass, `npm run docs:build` is green, and the README gates are green.
Then stop 16.
