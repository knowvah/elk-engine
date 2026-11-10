<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — `ComponentsCompactor`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T12): port the connected components compactor`
Scratch: `$TMPDIR/7g/T12/`.

## Context

W1, W4, W6, W9, W13. `J/components/ComponentsCompactor.java` (825) with nested `InternalConnectedComponents`,
`InternalComponent`, `InternalUnionExternalExtension`, `InternalExternalExtension`, `Hullpoints`, `Segments`, `OuterSegments`
(`:593-825`; prefixed files, M15 naming). The three placers construct it only under `COMPACTION_CONNECTED_COMPONENTS`
(`SimpleRowGraphPlacer.java:85`, `ComponentGroupGraphPlacer.java:122`, `ComponentGroupModelOrderGraphPlacer.java:134`); the TS
class is staged (`compact`, `getOffset`, `getGraphSize` throw). Hashed containers (W6): `HashMultimap<Direction, LEdge>
externalExtensions` (`:215`), `Sets.newHashSet(externalExtensions.get(...))` (`:296`), `InternalUnionExternalExtension.edges`
(`:670`). Uses T8's `OneDimensionalComponentsCompaction` and T4's `recthull`.

## Task

1. Port the class and its nested types (replace the staged body, keep the marker, W13).
2. Rewrite `ComponentsCompactor.test.ts` into tests of the real class (W9, journaled). `ComponentsProcessor.test.ts:356-379`
   is T15's.
3. Replay the `full/components-compaction/*` and `full/converted/labels/ticket-213_componentsCompaction` rows once T15 wires the
   pipeline (T16's); here, rows that stop after `ComponentsProcessor` combine, if T1 recorded them, or a direct call of `compact`
   on a row's graphs.

## Write-set

`src/alg/layered/components/ComponentsCompactor.ts` (plus prefixed nested-type files) and their `.test.ts` files.

## Read-set

`J/components/ComponentsCompactor.java`, T4's and T8's TS files, `src/alg/layered/components/{SimpleRowGraphPlacer,ComponentGroupGraphPlacer,ComponentGroupModelOrderGraphPlacer}.ts`
(the call sites), `decisions.md` W4, W6, W9, W13.

## Acceptance criteria

- Given each nested type, when ported, then it lives in a prefixed file and keeps the Java's member names.
- Given each hashed container, when audited, then the journal holds an `ad10` row; iterated identity sets get a reversal twin in
  T16.
- Given `npm run typecheck`, `npm run complexity` and the architecture suite, when run, then all are clean.

## Observability / Rollback

N/A. Reversible.
