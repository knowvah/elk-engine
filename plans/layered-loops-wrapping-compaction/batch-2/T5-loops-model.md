<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Loops model + `SelfLoopHolderTest`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): port the self-loop model classes`
Scratch: `$TMPDIR/7g/T5/`.

## Context

W1, W6, W8, W9, W13. `J/intermediate/loops/{SelfLoopType (72), SelfLoopEdge (107), SelfLoopPort (107), SelfLoopHolder (226),
SelfHyperLoop (249), SelfHyperLoopLabels (262)}.java`. Three are staged in TS since 7a (`SelfLoopEdge.ts`, `SelfLoopHolder.ts`,
`SelfLoopPort.ts`: only `getSLPortMap()` and the members `LGraphAdapters` reads are real; `src/alg/layered/graph/LGraphAdaptersLPortAdapter.ts:118`).
`SelfLoopHolder.slPorts` is a `LinkedHashMap` (`:47`) → `Map`; `SelfHyperLoop.slEdges` is a `HashSet` (`:57`) returned by
`getSLEdges()` (`:158`): find every reader, journal one `ad10` row (W6), insertion order. `occupiedPortSides` is an `EnumSet`
(`:72`) → the landed `EnumSet` shim.

## Task

1. Port `JT/intermediate/loops/SelfLoopTestGraphCreator.java` to `test/helpers/SelfLoopTestGraphCreator.ts` and
   `JT/intermediate/loops/SelfLoopHolderTest.java` (3 runs) **first** to
   `src/alg/layered/intermediate/loops/SelfLoopHolderTest.test.ts`, Java literals unchanged.
2. Port the six classes whole (replace the staged bodies; keep line 2 `// @staged 7g` and the registry rows, W13).
3. Rewrite the three staged-class tests (`SelfLoop{Edge,Holder,Port}.test.ts`) into tests of the real classes (W9, journaled
   with old and new); behavioural literals from the Java suite or rows only (L4).

## Write-set

`src/alg/layered/intermediate/loops/{SelfLoopType,SelfLoopEdge,SelfLoopPort,SelfLoopHolder,SelfHyperLoop,SelfHyperLoopLabels}.ts`
(plus prefixed section files), their `.test.ts` files, `SelfLoopHolderTest.test.ts`, `test/helpers/SelfLoopTestGraphCreator.ts`.

## Read-set

The six Java files, the test and its creator, `src/alg/layered/graph/LGraphAdapters*.ts` (the members already read),
`src/alg/layered/options/InternalProperties.ts` (`SELF_LOOP_HOLDER`), `src/java/util/EnumSet.ts`, `decisions.md` W6, W9, W13.

## Acceptance criteria

- Given `SelfLoopHolderTest`, when run, then its 3 cases pass with the Java's assertions unchanged.
- Given `LGraphAdapters.test.ts`, when run, then it still passes (the members it reads are unchanged in behaviour).
- Given the staged markers, when the architecture suite runs, then it passes (markers and rows kept).
- Given `slEdges` and every other hashed container, when audited, then the journal holds one `ad10` row each.

## Observability / Rollback

N/A. Reversible.
