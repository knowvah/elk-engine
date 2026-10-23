<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — Core `generate`, hierarchy and connect; `graphs` replay

**Agent:** typescript-pro · **Commit:** `feat(T12): generate custom graphs byte-exact with the jvm`

## Context
`generate(GeneratorOptions)` `:90`, `generate(Configuration)` `:110`, `randomGeneratorFromConfig` `:129`,
`addHierarchicalNodes` `:141`, `connectAtomicNodesOnDifferentLevels` `:171`, `sample` `:196` (D7 shuffle),
`makeGraph` `:205`, `generateCustomGraph` `:301`; the rest of the connect section (T11 ported `connect`,
`addEdgeLabel`, `retrievePort`): `connectConditional` `:1323`, `connectRandomlyAndConditional` ×2 `:1529/:1563`,
`determineOutgoingEdges` ×2 `:1574/:1595`, `removeIsolatedNodes` `:1612`, `findNodeWithDFS` `:1635`, `connected`
`:1666`; `generateAnyGraph` ×2 `:366/:416`. `makeGraph` dispatches on `GraphType`; the forms ported in T13/T14 get
placeholders here. Watch `(int) density * cn * cn` (cast first) and `Math.max(1, samples)`.

## Task
1. Add the methods above to `RandomGraphGenerator.ts` / `RandomGraphGeneratorConnect.ts`; create
   `RandomGraphGeneratorTypes.ts` with both `generateAnyGraph` overloads plus placeholder functions for
   `generateBipartite`, `generateTree`, `generateBiconnectedGraph`, `generateTriconnectedGraph`, and
   `RandomGraphGeneratorAnte.ts` with a placeholder `generateANTEGraph`. Each placeholder throws an `Error` whose
   message contains `GRANDOM_PLACEHOLDER` and the Java method name.
2. `generators/RandomGraphGenerator.replay.test.ts`: for each `seeded` row of `grandom-generate.json` whose
   configurations are all form `graphs` (the filter, a named constant): parse with `GRandomText`, run
   `new RandomGraphGenerator(null).generate(config)` per configuration, name an unnamed root `"root"`, export with
   `ElkGraphJson.forGraph(root)` and `CaseRunner.export`'s flags, and compare each string with the recorded one
   exactly. On a mismatch, print the first differing offset with context.
3. `GRandomCorpus.test.ts` (in `src/core/debug/grandom/`): for the six `graphs`-form corpus files
   (`disco-components-small`, `force-graph-small`, `random-graph-small`, `sporeCompaction-graph-small`,
   `sporeOverlap-graph-small`, `topdownpacking-hierarchy-small`) do the same from the `.elkr` and compare export +
   `"\n"` with the `.json` byte for byte.

## Write-set
`src/core/debug/grandom/generators/{RandomGraphGenerator,RandomGraphGeneratorConnect,RandomGraphGeneratorTypes,
RandomGraphGeneratorAnte}.ts` (+ tests), `src/core/debug/grandom/generators/RandomGraphGenerator.replay.test.ts`,
`src/core/debug/grandom/GRandomCorpus.test.ts`.

## Read-set
`RandomGraphGenerator.java` at the lines above, `tools/oracle/harness/{GrandomGenerator,CaseRunner}.java`,
`src/graph/json/ElkGraphJson.ts`, T9's facade, T10's parser, T11's helpers.

## Interface contracts (outputs)
`generate(config: Configuration): ElkNode[]`, `generate(opts: GeneratorOptions): ElkNode` (overload names per
§6.5); the replay filter constant and corpus list that T13/T14 widen.

## Acceptance criteria
- Given every filtered seeded row, when replayed, then every graph export equals the recorded string exactly.
- Given the six corpus files, when regenerated, then each equals its `.json` byte for byte.
- Given a `GraphType` not yet ported, when `makeGraph` reaches it, then it throws the `GRANDOM_PLACEHOLDER` error.
- Given the 200-node stress row (if its form is `graphs`), when replayed, then it takes < 1 s (stop 12).

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
