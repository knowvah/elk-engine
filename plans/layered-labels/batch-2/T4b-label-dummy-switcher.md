<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4b — `LabelDummySwitcher` and `LabelDummySwitcherLabelDummyInfo`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4b): port the label dummy switcher`
`J`, `JT` as README. Scratch: a private subdirectory `<scratchpad>/T4b/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal; a
hand-derived expectation is stop 3. A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line (the
CodeQL collapse rule); everything else stays verbatim. L4 applies.

## Context

Mission 7f2, G1, F1, F10, F11, M15 (nested types in prefixed files). `LabelDummySwitcher` (756 Java lines) moves each label
dummy into the layer chosen by `CenterEdgeLabelPlacementStrategy`; it is staged in TS with `INCLUDE_LABEL` ported (read by
`ElkGraphLayoutTransferrer`) and `process` throwing. The nested `LabelDummyInfo` (`J/intermediate/LabelDummySwitcher.java:643-756`)
becomes `LabelDummySwitcherLabelDummyInfo.ts`. The arm `LABEL_DUMMY_SWITCHER` throws until T11.

## Task

1. Replace `src/alg/layered/intermediate/LabelDummySwitcher.ts` with the full port of `J/intermediate/LabelDummySwitcher.java:55-641`,
   keeping `INCLUDE_LABEL` verbatim: `process` (`:99-147`), `assignIdsToLayers` (`:149`), `gatherLabelDummyInfos` (`:161`),
   `calculateLayerWidths` (`:185`), `processStrategy` (`:198`), the four `find*LayerTargetId` finders (`:248`, `:270`, `:329`,
   `:349`), `computeLayerWidthSums` (`:292`), `setEndLayerNodeAlignment` (`:363`), `isPartOfReversedEdge` (`:380`), the
   space-efficient assignment (`:407-533`), `swapNodes` (`:556`), `updateLongEdgeSourceLabelDummyInfo` (`:603`).
2. `LabelDummySwitcherLabelDummyInfo.ts` from `:643-756`, one class per file, `@see` to the nested type.
3. **Keep the header marker `// @staged 7f2` on the first line of `LabelDummySwitcher.ts`**; T11 removes it together with the
   `staged-classes.json` row (the fitness test requires both to agree, G11). The `process` body is real.
4. **Containers (F11, AD-10):** the `EnumMap<CenterEdgeLabelPlacementStrategy, List<LabelDummyInfo>>` (`:165-169`) is
   ordinal-ordered, deterministic: use a `Map` filled in ordinal order, and iterate in that order. Nothing hashed.
5. Split behind a facade at Java method boundaries to meet the limits (the file exceeds 500 lines otherwise); sections keep Java
   order; `npm run complexity` after the first full write.
6. **Numeric (F11):** `double[]` layer-width sums stay doubles; integer layer ids wrap per `Int32` ops where Java adds or subtracts.
7. Replay every `scenarios/LabelDummySwitcher/*` row and the `models` rows stopping at `LABEL_DUMMY_SWITCHER`, with the class
   injected, covering each `CenterEdgeLabelPlacementStrategy` value.

## Write-set

`src/alg/layered/intermediate/LabelDummySwitcher*.ts` and their colocated tests.

## Read-set

`J/intermediate/LabelDummySwitcher.java:55-756`, `src/alg/layered/intermediate/LabelDummySwitcher.ts` (the staged class),
`src/alg/layered/options/CenterEdgeLabelPlacementStrategy.ts`, `src/alg/layered/graph/{LGraph,Layer,LNode}.ts` (accessors only),
`test/helpers/layered-labels-replay-*.ts`, `decisions.md` G1, F1, F10, F11, F16.

## Architecture decisions

G1, F1, F10 (E1 recipe), F11 (container idioms), M15, AD-10.

## Interface contract (consumed by T11)

`new LabelDummySwitcher()` with `process(graph, monitor)`; static `INCLUDE_LABEL` unchanged.

## Acceptance criteria

- Given a `scenarios/LabelDummySwitcher/*` row for each placement strategy, when replayed, then each label dummy sits in the layer
  the row records.
- Given `INCLUDE_LABEL`, when read, then its id and default equal the staged value.
- Given an edge reversed by cycle breaking, when its label dummy is switched, then `isPartOfReversedEdge` picks the end layer as the row does.
- Given a fresh process, when the module is imported, then no `ReferenceError`.

## Observability / Rollback

N/A — no new observable operations. Reversible.
