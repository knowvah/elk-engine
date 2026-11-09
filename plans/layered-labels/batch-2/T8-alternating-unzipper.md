<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — `AlternatingLayerUnzipper`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T8): port the alternating layer unzipper`
`J`, `JT` as README. Scratch: a private subdirectory `<scratchpad>/T8/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal; a
hand-derived expectation is stop 3. A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line (the
CodeQL collapse rule); everything else stays verbatim. No assertion the Java lacks in a ported suite. L4 applies.

## Context

Mission 7f2, G1, F1, F10, F11. `AlternatingLayerUnzipper` (314 Java lines, `J/intermediate/unzipping/`) splits a layer into `N`
alternating sub-layers when `layerUnzipping.strategy` is `ALTERNATING`, moving nodes with `shiftNode` and placing
`PLACEHOLDER`/`NONSHIFTING_PLACEHOLDER` dummies from `createDummyNode`. It is in P3's after-phase for a non-default strategy, so no
default path reaches it and the rows are its only oracle. The arm `ALTERNATING_LAYER_UNZIPPER`
(`IntermediateProcessorStrategyCreate.ts:150`) throws until T11. `AlternatingLayerUnzipperTest` (731 Java lines, 12 runs) is T13b's.

## Task

1. Port `src/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.ts` from
   `J/intermediate/unzipping/AlternatingLayerUnzipper.java:55-314`, one class per file, `@see` on each symbol: `process`
   (`:58-158`: the per-layer split loop `:62-135`, the `newLayers` pass `:136-140`, the placeholder cleanup `:141-158`),
   `getLayerSplitProperty` (`:160`), `getResetOnLongEdgesProperty` (`:182`), `getMinimizeEdgeLengthProperty` (`:199`), `shiftNode`
   (`:219-304`), `createDummyNode` (`:306`). The Java's `public class` has a space in `process (`, ignore it.
2. `Lists.reverse(Lists.newArrayList(node.getIncomingEdges()))` (`:228`) becomes a reversed copy of the incoming-edge snapshot, with
   no mutation of the original. `Pair<Layer, Integer>` (`:136`) uses the landed `Pair` (grep `src/core/util/Pair.ts`).
3. **Numeric (F11):** `maxWidth / averageHeight >= size / 4.0` (`:97`) stays double division; `Int32` for the integer layer and
   node indices; `N` read from the property with the unboxing audit (a null default needs an explicit check).
4. Respect the limits (500-line files, 30 NLOC, CCN 10, 5 params): `process` (about 100 lines) and `shiftNode` (about 85 lines)
   split behind a facade at the Java's inner blocks (comment-delimited), Java order and side-effect order kept;
   `npm run complexity` after the first full write.
5. Layer lists mutate while iterated (`:141-158` uses an iterator `remove`): keep the Java's iteration order exactly, with an
   explicit index loop or the landed list iterator.
6. Replay every `scenarios/AlternatingLayerUnzipper/*` row and the `models` rows stopping at `ALTERNATING_LAYER_UNZIPPER`, with the
   class injected: each strategy of `layerUnzipping`, `layerSplit` values, `resetOnLongEdges` true and false, `minimizeEdgeLength`
   true and false (T1's `unzipping` family), long edges and none.

## Write-set

`src/alg/layered/intermediate/unzipping/**` (the port and its colocated tests).

## Read-set

`J/intermediate/unzipping/AlternatingLayerUnzipper.java`, `src/alg/layered/options/LayeredOptions.ts` (the `LAYER_UNZIPPING_*`
properties), `src/alg/layered/graph/{LGraph,Layer,LNode,LEdge}.ts` (accessors only), `src/alg/layered/graph/LNodeNodeType.ts`,
`test/helpers/layered-labels-replay-*.ts`, `decisions.md` G1, F1, F10, F11, F16.

## Architecture decisions

G1, F1, F10 (E1 recipe), F11 (idioms), AD-10 (no hashing here).

## Interface contract (consumed by T11)

`new AlternatingLayerUnzipper()` with `process(graph, monitor)`; the staged-name `ALTERNATING_LAYER_UNZIPPER` arm creates it.

## Acceptance criteria

- Given a `scenarios/AlternatingLayerUnzipper/*` row per property combination, when replayed, then layer membership and node
  order per layer equal the row.
- Given `resetOnLongEdges` true and a long edge, when the layer is unzipped, then the dummy placement equals the row's.
- Given a layer with fewer nodes than `N`, when processed, then it is left whole as in Java (`:107`).
- Given a fresh process, when the module is imported, then no `ReferenceError`.

## Observability / Rollback

N/A — no new observable operations. Reversible.
