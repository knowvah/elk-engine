<!-- SPDX-License-Identifier: EPL-2.0 -->

# T18 — JSON and content-assist deferrals; remove `MISSION5_PROVIDERS`

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T18): port the tests deferred to mission 5`

## Context
Earlier missions deferred tests that need a layout algorithm or the three registrations: J6 deferred
`SectionsTest.preserveSectionIdsTest` and `TransferLayoutTest.transferLayoutEdgeSectionExistsTest` (both use
`random`); C10 deferred `LayoutDataContentAssistTest.Other.testAlgorithmSpecificKnown` and
`testAlgorithmSpecificUnknown` (box, fixed). `JsonMetaDataConverter.test.ts` carries the `MISSION5_PROVIDERS`
scaffolding, emptied by T8/T10/T12/T14. Other deferrals stay: `exportLayoutOptions`, `importIndividualSpacingsTest`,
`EdgeCoordsTest` → mission 7h (layered).

## Task
1. Port the two Xtend tests verbatim from `$ELK_SOURCE_DIR/test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/{SectionsTest,TransferLayoutTest}.xtend`
   (Xtend semantics per `docs/translation-rules.md` §8); they lay out with `RecursiveGraphLayoutEngine`. Update the
   file headers' "Ported"/"Deferred" lists.
2. Port the two `LayoutDataContentAssistTest` cases verbatim
   (`$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core/data/LayoutDataContentAssistTest.java:120-150`);
   update the header (C10 closed).
3. `JsonMetaDataConverter.test.ts`: remove `MISSION5_PROVIDERS`, `isDeferred` and the absence test; every recorded row
   now runs (`:30-100`). Keep the other assertions.

## Write-set
`src/graph/json/SectionsTest.test.ts`, `src/graph/json/TransferLayoutTest.test.ts`,
`src/graph/json/JsonMetaDataConverter.test.ts`, `src/core/data/LayoutDataContentAssist.test.ts`.

## Read-set
The two `.xtend` files and the Java test above; the four TS test files; `src/core/RecursiveGraphLayoutEngine.ts`
(symbols); `src/core/util/BasicProgressMonitor.ts` (symbols).

## Acceptance criteria
- `preserveSectionIdsTest` and `transferLayoutEdgeSectionExistsTest` pass verbatim with random layout.
- `testAlgorithmSpecificKnown` and `testAlgorithmSpecificUnknown` pass verbatim.
- Every `converter` row of `test/golden/refs/java/graph-json.json` replays in `JsonMetaDataConverter.test.ts`; no `MISSION5`
  identifier remains in `src/` or `test/` (`grep -rn MISSION5 src test` empty).

## Observability / Rollback
N/A — tests only. Reversible: revert the commit.
