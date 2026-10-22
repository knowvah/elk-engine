<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — `RandomGraphGenerator` (sequential)

The generator's helpers call each other across D4's six files, so T11 → T12 → T13 → T14 run **strictly in order**,
one at a time; that is why their write-sets may overlap (each file still has one writer at a time). T12 brings
`generate` up end to end for the `graphs` form with throwing placeholders (text contains `GRANDOM_PLACEHOLDER`) for
the forms not yet ported; T13 and T14 replace them and widen the replay filter. Filter widening and new corpus cases
are additions (stop 4). Depends on batch 4.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T11 | Skeleton, elements, `connect`/`retrievePort`, rewire, `BlindTextGenerator` | typescript-pro | generators/{RandomGraphGenerator,RandomGraphGeneratorElements,RandomGraphGeneratorRewire,RandomGraphGeneratorConnect,BlindTextGenerator}.ts (+ tests) | T4, T7 | [ ] |
| T12 | Core `generate`, `makeGraph`, hierarchy, connect; `graphs` replay + 6 corpus files | typescript-pro | generators/{RandomGraphGenerator,RandomGraphGeneratorConnect,RandomGraphGeneratorTypes,RandomGraphGeneratorAnte}.ts (+ tests), generators/RandomGraphGenerator.replay.test.ts, GRandomCorpus.test.ts | T9, T10, T11 | [ ] |
| T13 | Trees, bipartite, biconnected, triconnected; +3 tree corpus files | typescript-pro | generators/RandomGraphGeneratorTypes.ts (+ test), generators/RandomGraphGenerator.replay.test.ts, GRandomCorpus.test.ts | T12 | [ ] |
| T14 | ANTE (acyclic) + `HierarchyEdge`; full replay; unseeded invariants; 9/9 | typescript-pro | generators/RandomGraphGeneratorAnte.ts (+ test), generators/HierarchyEdge.ts (+ test), generators/RandomGraphGenerator.replay.test.ts, GRandomCorpus.test.ts | T13 | [ ] |

All paths are under `src/core/debug/grandom/`. Batch done when every task's acceptance criteria pass, the README
gates are green, and `grep -rn GRANDOM_PLACEHOLDER src/` is empty.
