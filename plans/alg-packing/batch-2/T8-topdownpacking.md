<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — Topdownpacking, `GridElkNode`, guards, suites

**Agent:** typescript-pro (opus; PK3 touches a landed guard) · **Commit:** `feat(T8): port topdownpacking with GridElkNode` ·
Scratch: `$TMPDIR/alg-packing/T8/`

## Context

Mission 8c, PK3, PK10. `P/*` (1,113 lines). `GridElkNode` per PK3: delegation over every member of the TS `ElkNode` interface chain
(`src/graph/{ElkNode,ElkConnectableShape,ElkShape,ElkGraphElement,EMapPropertyHolder}.ts`, `src/emf/ecore/InternalEObject.ts`,
`src/graph/properties/IPropertyHolder.ts`) plus `Grid<ElkNode>`; `put` inserts. The guard registry (`src/graph/ElkGraphPackage.ts:170-198`)
becomes a list per interface name. Core topdown is landed (`src/core/RecursiveGraphLayoutEngineTopdown.ts`; `isTopdownLayoutProvider`
is structural).

## Task

1. Port `Grid`, `GridElkNode`, `INodeArranger`, `TopdownPackingPhases`, the two phases, the provider (unstage it and the enums T5 staged).
2. Registry change: `registerImpl` appends once per class; `isInstance` true for any registered class; `GridElkNode.ts` registers under
   `ElkNode` and each super-interface name with a guard. Add one guard test per name for a `GridElkNode`; every landed guard test unchanged (stop 19).
3. Port `PT/test/TopdownPackingTest.java`, `PT/test/TopdownLayoutTest.java`, `PT/layered/test/PortPlacementCalculationTest.java` whole
   (PK10; the last two run fixed and layered via `registerLayered()`).
4. `test/helpers/topdownpacking-replay-*.ts`; replay every row of `topdownpacking.json` (P1 grid incl. row list lengths, P2, `predicted`).
5. A test that `logGraph` with logging enabled copies the wrapped node through the wrapper (`BasicProgressMonitor`, `copyGraph`).

## Write-set

`src/alg/topdownpacking/**` (except `options/**`, T5's), `src/graph/ElkGraphPackage.ts`, `src/graph/ElkGraphPackage.test.ts` (or the
landed guard test file, additive cases only), `test/architecture/staged-classes.json` (topdownpacking rows), `test/helpers/topdownpacking-replay-*.ts`.

## Read-set

The Java above and `PT/**`, `src/graph/ElkGraphPackage.ts:160-200`, `src/graph/impl/ElkNodeImpl.ts`, the interface files above,
`src/core/util/BasicProgressMonitor.ts:285-305`, `src/graph/util/ElkGraphCopy.ts`, `src/core/RecursiveGraphLayoutEngineTopdown.ts`,
`test/helpers/layered-framework-replay.ts` (`registerLayered`), `decisions.md#pk3--gridelknode`.

## Interface contract

`GridElkNode` (`implements ElkNode, Grid<ElkNode>`), `registerImpl(name, ctor)` unchanged signature, `isInstance` unchanged signature.

## Acceptance criteria

- Given the three suites, then 4, 5 and 2 tests pass with the Java's assertions.
- Given every `topdownpacking.json` row, when replayed, then grid (with row list lengths), bounds and predicted sizes equal the row.
- Given a `GridElkNode`, then `isElkNode` and each super-interface guard return true; every landed guard test is unchanged and green.
- Given the TS `ElkNode` interface chain, then `GridElkNode` delegates every member (typecheck proves completeness); the omitted Java EMF members are listed in one comment with their lines.

## Observability / Rollback

N/A — no new observable operations. Reversible (the registry change is internal and additive).
