<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: scope docs and decisions; bundle table

T1 and T2 have disjoint write-sets and no data dependency; the orchestrator runs them in order (T1, then T2) and commits each.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-scope-docs.md) | ADR ruling, AD-17, CLAUDE.md, inventory, port-map | orchestrator | ADR, skeleton decisions, CLAUDE.md, inventory, port-map, ADR-mission journal | — | [x] |
| [T2](T2-bundle-table.md) | Fitness block first, then suffixes and regeneration | orchestrator | fitness test, `tools/bundle-deps.ts`, `bundle-deps.json` | — | [x] |

Batch gate: `npx prettier --check` on every changed file, `npm run docs:build`, `npx vitest run test/architecture`,
`npm run typecheck`.
