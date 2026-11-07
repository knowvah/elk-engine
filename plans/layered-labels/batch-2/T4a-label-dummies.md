<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4a — `LabelDummyInserter`, `LabelDummyRemover`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4a): port the label dummy inserter and remover`
`J`, `JT` as README. Scratch: a private subdirectory `<scratchpad>/T4a/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal; a
hand-derived expectation is stop 3. A verbatim side-effect-free duplicate such as `X || X` is collapsed with a comment naming the
Java line (the CodeQL collapse rule); everything else stays verbatim. No assertion the Java lacks in a ported suite. L4 applies.

## Context

Mission 7f2, G1, F1, F10, F11. `LabelDummyInserter` (186 Java lines) runs first in P3's before-phase and turns each
center-labelled edge into a label dummy node; `LabelDummyRemover` (175) restores the edge and places the labels after node
placement. About 134 `tests/layered` models carry labels, so both are default paths for any labelled layout. Both arms
(`LABEL_DUMMY_INSERTER`, `LABEL_DUMMY_REMOVER` of `IntermediateProcessorStrategyCreate.ts:83-84,233-234`) throw until T11.

## Task

1. Port `src/alg/layered/intermediate/LabelDummyInserter.ts` from `J/intermediate/LabelDummyInserter.java:55-186`:
   `process` (`:65-128`), `edgeNeedsToBeProcessed` (`:130`), `retrieveThickness` (`:138`), `createLabelDummy` (`:162`), the
   `CENTER_LABEL` predicate (`:58`) as a named function. Java order and names kept; `@see` on every symbol.
2. Port `LabelDummyRemover.ts` from `J/intermediate/LabelDummyRemover.java:60-175`: `process` (`:63-133`) and the two private helpers
   (`:135`, `:147`). Respect the limits (500-line files, 30 NLOC, CCN 10, 5 params): split behind a facade at Java method
   boundaries, `npm run complexity` after the first full write of each file.
3. **Numeric (F11):** `double` stays `number`; any `(float)` or `(int)` cast goes through `Float32`/`d2i` shims; the unboxing audit
   on `getProperty` results with a null default (`setProperty(p, null)` removes the key, so non-null defaults cannot unbox to null).
4. **Containers (F11):** any `HashMap`/`HashSet` iteration is insertion-ordered with an AD-10 journal row naming the Java line;
   if an iteration is observable and order-dependent, stop 17.
5. Replay every `scenarios/LabelDummyInserter/*`, `scenarios/LabelDummyRemover/*` row and the `models` rows stopping at
   `LABEL_DUMMY_INSERTER` and `LABEL_DUMMY_REMOVER` through T2's loader, with the class injected.
6. Port nothing of `LabelDummyRemoverTest`; that is T13a's.

## Write-set

`src/alg/layered/intermediate/{LabelDummyInserter,LabelDummyRemover}*.ts` and their colocated tests.

## Read-set

`J/intermediate/{LabelDummyInserter,LabelDummyRemover}.java`, `src/alg/layered/graph/{LGraph,LNode,LEdge,LLabel,LPort}.ts`
(accessors only), `src/alg/layered/options/InternalProperties.ts`, `test/helpers/layered-labels-replay-*.ts`,
`docs/translation-rules.md`, `decisions.md` G1, F1, F10, F11, F16.

## Architecture decisions

G1 (scope), F1 (arms), F10 (E1 recipe: lazy tables at module level, no entry-order import), F11 (idioms), AD-10.

## Interface contract (consumed by T11)

`new LabelDummyInserter()` and `new LabelDummyRemover()`, each an `ILayoutProcessor<LGraph>` with `process(graph, monitor)`.

## Acceptance criteria

- Given a `scenarios/LabelDummyInserter/*` row, when replayed with the class injected, then the dump equals the row (AD-4).
- Given a `scenarios/LabelDummyRemover/*` row, when replayed, then label positions and edge bend points equal the row.
- Given an edge with several center labels, when inserted and removed, then the original label order is restored.
- Given a fresh process, when each new module is imported, then no `ReferenceError`.

## Observability / Rollback

N/A — no new observable operations. Reversible.
