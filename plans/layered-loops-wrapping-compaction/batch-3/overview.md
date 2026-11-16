<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Loops ordering and routing core, wrapping processors, `ComponentsCompactor`

Four ports with disjoint write-sets, **in parallel**, after batch 2. Markers and registry rows stay until T15 (W13).

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T9  | `loops/ordering`: `PortSideAssigner`, `PortRestorer` ([brief](T9-loops-ordering.md)) | typescript-pro | src/alg/layered/intermediate/loops/ordering/** | T5 | [x] |
| T10 | `loops/routing` core: `RoutingDirector`, `RoutingSlotAssigner`, `LabelPlacer` + `RoutingDirectorTest` ([brief](T10-loops-routing-core.md)) | typescript-pro | src/alg/layered/intermediate/loops/routing/{RoutingDirector,RoutingSlotAssigner,LabelPlacer}*.ts + tests, RoutingDirectorTest.test.ts | T5 | [x] |
| T11 | Wrapping processors ([brief](T11-wrapping-processors.md)) | typescript-pro | src/alg/layered/intermediate/wrapping/{BreakingPointInserter,BreakingPointInserterBPInfo,BreakingPointProcessor,BreakingPointRemover,SingleEdgeGraphWrapper}*.ts + tests | T6 | [x] |
| T12 | `ComponentsCompactor` ([brief](T12-components-compactor.md)) | typescript-pro | src/alg/layered/components/ComponentsCompactor*.ts + tests | T8 | [x] |

Agents never run `npm run coverage` and never commit.
