<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — The processors and the placers

Four parallel tasks after batch 1, test-first against the `scenarios/*` rows of `layered-placement.json` with the class
injected through T3's helpers (7b/7c pattern: `runSteps`/`runPlacementPrefix` with a `Factories` whose
`createPhase('P4_NODE_PLACEMENT', s)` or `createProcessor(name)` returns the class under test; every other name goes
through the real enums, whose 7b and 7c arms instantiate). Write-sets are disjoint by file. The placers do not import
each other; the five processors depend on the LGraph model, the 6b node-spacing calculators and the 7a adapters only.
`NodePlacementRepeater` re-creates the placer through `NodePlacementStrategy` (whose arms throw until T8), so its
row test is deferred to T8.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T4  | The five processors ([brief](T4-processors.md)) | typescript-pro | src/alg/layered/intermediate/{InnermostNodeMarginCalculator,LabelAndNodeSizeProcessor,InLayerConstraintProcessor,HierarchicalPortDummySizeProcessor,NodePlacementRepeater}.ts + tests | T1, T3 | [x] |
| T5  | `SimpleNodePlacer`, `InteractiveNodePlacer`, `LinearSegmentsNodePlacer`, staged `DebugUtil` ([brief](T5-simple-interactive-linear.md)) | typescript-pro | src/alg/layered/p4nodes/{SimpleNodePlacer,InteractiveNodePlacer,LinearSegmentsNodePlacer*}.ts + tests, src/alg/layered/DebugUtil.ts, test/architecture/staged-classes.json | T1, T3 | [x] |
| T6  | Brandes-Köpf (`p4nodes/bk`, seven classes) ([brief](T6-brandes-koepf.md)) | typescript-pro | src/alg/layered/p4nodes/bk/*.ts + tests | T1, T3 | [x] |
| T7  | `NetworkSimplexPlacer` ([brief](T7-network-simplex.md)) | typescript-pro | src/alg/layered/p4nodes/NetworkSimplexPlacer*.ts + tests | T1, T3 | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green. Each agent uses its own
scratchpad subdirectory (`<scratchpad>/T4/` …); agents never run `npm run coverage` and never commit.
