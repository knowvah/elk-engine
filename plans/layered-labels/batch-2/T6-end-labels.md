<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — `EndLabelPreprocessor`, `EndLabelPostprocessor`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port the end label pre and postprocessors`
`J`, `JT` as README. Scratch: a private subdirectory `<scratchpad>/T6/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal; a
hand-derived expectation is stop 3. A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line (the
CodeQL collapse rule); everything else stays verbatim. L4 applies.

## Context

Mission 7f2, G1, G4, F1, F10, F11. `EndLabelPreprocessor` (487 Java lines) gathers the labels at the ends of edges into one
`LabelCell` per port, lays them out with the landed `RectangleStripOverlapRemover` and grows node margins; the result is stored
as `InternalProperties.END_LABELS`, a `HashMap<LPort, LabelCell>` (`J/intermediate/EndLabelPreprocessor.java:110`). The landed
`EndLabelSorter` only looks it up (`EndLabelSorter.java:78`); `EndLabelPostprocessor` (85) iterates `values()` once
(`EndLabelPostprocessor.java:74`) and each `LabelCell` lays out only its own labels. Arms `END_LABEL_PREPROCESSOR` and
`END_LABEL_POSTPROCESSOR` (`IntermediateProcessorStrategyCreate.ts:174,242`) throw until T11.

## Task

1. `EndLabelPreprocessor.ts` from `J/intermediate/EndLabelPreprocessor.java:73-487`: `process` (`:76-88`), the per-node method
   (`:90-127`, which builds the map at `:110`), `gatherLabels` (the static `LPort` overload `:169`, the private one `:200`),
   per-port label cell creation (`:129-167`), node-level sizing (`:244-267`), `placeLabels` (`:269-364`, one arm per
   `PortSide`), the side-wide pass (`:366-418`), `updateNodeMargins` (`:420`), `getLabelSide` (`:453`), `maxEdgeThickness`
   (`:463`), `portSideToOverlapRemovalDirection` (`:470`). Split behind a facade at Java method boundaries (it exceeds the
   limits); `npm run complexity` after the first full write.
2. `EndLabelPostprocessor.ts` from `J/intermediate/EndLabelPostprocessor.java:50-85`.
3. **G4:** `END_LABELS` holds an **insertion-ordered `Map<LPort, LabelCell>`** (AD-10): journal an AD-10 row naming
   `EndLabelPreprocessor.java:110`. Keys are identity-compared ports; no `JavaHashMap`.
4. **Reversal twin (G4):** a test helper makes `EndLabelPostprocessor` iterate the map's values in **reverse**, and the test replays
   every end-label row (every `scenarios` and `models` row whose plan has `END_LABEL_POSTPROCESSOR`, FX2's parallel-edge scenario
   included) under both orders, asserting equal dumps. A difference is stop 17.
5. `Float32`/`d2i` on any `(float)`/`(int)` cast; boxed-compare audit on `LabelCell`/`LabelSide` comparisons (C6, stop 16 when
   provenance is unprovable); the `!label.hasProperty(InternalProperties.END_LABEL_EDGE)` test (`:224`) reads the property exactly.
6. Replay every `scenarios/EndLabelPreprocessor/*`, `scenarios/EndLabelPostprocessor/*` row and the `models` rows stopping at the
   two arms, with the classes injected; FX2's parallel-edge row runs through the landed `EndLabelSorter` too.
7. Port nothing of `EndLabelSorterTest`; that is T13a's.

## Write-set

`src/alg/layered/intermediate/{EndLabelPreprocessor,EndLabelPostprocessor}*.ts` and their colocated tests.

## Read-set

`J/intermediate/{EndLabelPreprocessor,EndLabelPostprocessor}.java`, `J/intermediate/EndLabelSorter.java:57-100,157-177` (lookups
only), `src/alg/common/nodespacing/cellsystem/LabelCell.ts`,
`src/alg/common/overlaps/RectangleStripOverlapRemover{,OverlapRemovalDirection}.ts`,
`src/alg/layered/options/InternalProperties.ts` (`END_LABELS`), `src/alg/layered/intermediate/EndLabelSorter.ts`,
`test/helpers/layered-labels-replay-*.ts`, `decisions.md` G1, G4, F1, F10, F11, F16.

## Architecture decisions

G1, G4 (insertion order, reversal twin), F1, F10 (E1 recipe), F11 (idioms), AD-10, FX2 (landed `EndLabelSorter` order).

## Interface contract (consumed by T11)

`new EndLabelPreprocessor()`, `new EndLabelPostprocessor()`; `END_LABELS` values are `Map<LPort, LabelCell>` in insertion
order, as `EndLabelSorter.ts` already reads it.

## Acceptance criteria

- Given an end-label row, when replayed with the class injected, then label positions and node margins equal the row (AD-4).
- Given every end-label row, when `EndLabelPostprocessor` iterates `values()` forward and reversed, then the dumps are equal.
- Given FX2's parallel-edge scenario, when replayed, then it equals the oracle row; a mismatch is stop 17.
- Given a fresh process, when each new module is imported, then no `ReferenceError`.

## Observability / Rollback

N/A — no new observable operations. Reversible.
