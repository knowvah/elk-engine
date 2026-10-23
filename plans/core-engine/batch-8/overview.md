<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 8 — Corpus comparison; docs and roadmap

T19 measures parity over the local corpus (M5) and writes its section of `docs/conformance.md`; T20 writes every
other doc. Disjoint write-sets; both run in parallel (T20 links to T19's section by heading, set in this file:
`## Core layouts (fixed, box, random)`). T19 runs the JVM: the orchestrator runs coverage only after it finishes.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T19 | Local TS-vs-oracle comparison for 898 × {fixed, box, random} | typescript-pro | tools/corpus/ts-layout-compare.ts (+ test), docs/conformance.md | T17 | [x] |
| T20 | Architecture doc, overview, component map, roadmap revision (5a done, 5b row) | typescript-pro | docs/architecture/{core-engine,overview,component-map,port-map}.md, plans/roadmap.md | T17, T18 | [x] |
Batch done when both tasks' acceptance criteria pass, the README gates are green and `npm run docs:build` passes.
Then the mission ends (stop 13): write the mission summary into README and hand over the landing commands.
