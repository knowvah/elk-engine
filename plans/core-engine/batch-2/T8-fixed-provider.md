<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — `FixedLayoutProvider`; un-hold Fixed; Fixed tripwires

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T8): port the fixed layout provider and register it`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Decision C1 held back every registration referencing four types (`tools/melk/config.ts` `PENDING_TYPES`); the
generated `FixedLayouterOptions.ts` does not exist until `org.eclipse.elk.core.util.FixedLayoutProvider` leaves the
list, and the provider imports it — so port, un-hold and regenerate in one commit. Runbook:
`docs/architecture/melk-codegen.md`. First link of the serial codegen chain: nothing else may edit `config.ts`,
`CoreOptions.ts` or `test/melk/**` in this batch. M9: flip the tripwires for `fixed` only.
Known latent ELK bug to keep: `FixedLayoutProvider.java:174-177` calls `sections.remove()` with no `next()`, so an
edge with > 1 section throws `IllegalStateException` (EMF iterator) — `.agent-notes/elkgraph-model.md:105-117`.

## Task
1. Port `J/util/FixedLayoutProvider.java` (224 lines) verbatim in structure: node/port/label positions from the
   fixed-position options, edge section handling (including the latent bug through the ported EMF list iterator),
   padding and size computation with `SizeConstraint`, `EdgeRouting`.
2. Remove `FixedLayoutProvider` from `PENDING_TYPES`; run `npm run melk:generate`; commit the generated
   `FixedLayouterOptions.ts` and the regenerated `CoreOptions.ts` (no hand edits to generated files).
3. Tripwires (M9), `fixed` only:
   - `test/melk/model-algorithms.test.ts`: the C1 mechanism tests use a test-local copy of the original four types
     (assertions unchanged); the "lists the pending types" assertion states the current list.
   - `test/melk/held-back.ts` / `stub-provider.ts` and the emit tests that use them: whatever compares the live
     registry with the JVM metadata dump now expects `fixed` and its option supports to be registered.
   - `src/graph/json/JsonMetaDataConverter.test.ts`: remove the `fixed` row from `MISSION5_PROVIDERS` and adjust the
     deferred-row count to match.
   - `test/helpers/mission5-stand-ins.ts`: drop `fixed` from the stand-ins.
   Journal each edit with T8.
4. Tests: Java-derived unit tests for each branch (built graphs; expected values traced from the Java with
   `FixedLayoutProvider.java:<line>`); end-to-end goldens come in T17.

## Write-set
`src/core/util/FixedLayoutProvider.ts` (+ test), `tools/melk/config.ts`, `src/core/options/FixedLayouterOptions.ts`
and `src/core/options/CoreOptions.ts` (generated only), `test/melk/**`, `src/graph/json/JsonMetaDataConverter.test.ts`,
`test/helpers/mission5-stand-ins.ts`.

## Read-set
`J/util/FixedLayoutProvider.java`, `J/AbstractLayoutProvider.java`; `docs/architecture/melk-codegen.md`;
`tools/melk/{config,generate}.ts`; `test/melk/{held-back,stub-provider,model-algorithms.test,emit.test}.ts`;
`src/graph/json/JsonMetaDataConverter.test.ts:25-100`; `test/helpers/mission5-stand-ins.ts`;
`src/emf/**/ListIterator*` (the iterator `remove()` behaviour); `plans/core-engine/decisions.md#m9--tripwires`.

## Interface contracts (outputs)
`class FixedLayoutProvider extends AbstractLayoutProvider` (`layout(node, monitor)`); generated
`FixedLayouterOptions` (`ALGORITHM_ID = "org.eclipse.elk.fixed"`, option constants). Consumed by T14, T16–T19.

## Acceptance criteria
- Given an edge with two sections, when fixed layout runs, then `IllegalStateException` is thrown as the JVM does.
- Given nodes with `position` set and `nodeSize.constraints` empty, when fixed layout runs, then the parent size
  equals the Java computation (max extent + padding).
- Given `npm run melk:generate`, when run twice, then the output is identical, and the registry comparison test
  against `test/golden/refs/java/metadata.json` shows `org.eclipse.elk.fixed` and its supports equal to the JVM dump.
- Given the stand-in validator tests, when run, then the `box`/`random` rows still use stand-ins and the `fixed`
  rows validate against the real registration with their vector results.

## Observability / Rollback
N/A. Reversible: revert the commit (it re-holds Fixed).

## Amendment (M12 — user, 2026-10-23)
Add `tools/melk/emit.ts` to the write-set: algorithm `*Options` option constants become cached static getters
(decisions.md M12). Saved first attempt: scratchpad `t8/` (provider port, regenerated files).
