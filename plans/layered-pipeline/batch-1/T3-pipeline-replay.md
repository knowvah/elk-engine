<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Pipeline replay helpers

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T3): add the layered pipeline replay helpers`
Scratch: a private subdirectory `<scratchpad>/T3/`.

## Context

Mission 7f (README), F3–F5. The TS twin of T1's rows. The 7e helpers (`test/helpers/layered-routing-replay-{rows,dump,compare,
ops}.ts`, landed, never edited) load rows, dump and compare geometry. New: `full` rows lay a whole graph out through the engine
and compare the export; stop rows run through the real driver rather than a hand-walked prefix.

## Task

1. `test/helpers/layered-pipeline-replay-rows.ts`: `loadPipelineRows(file)`; types `FullRow` and `PipelineStopRow` (7e's
   `RoutingRow`); `PIPELINE_ROW_GROUPS = ['full', 'models', 'scenarios', 'sites']`; reject a `full` row without
   `expected.layout`/`expected.plans`, naming it; `registerPipelineEnums()` for enum-valued options 7f adds (the 7e
   helper's registration pattern; `ENUM_TYPES` closes its list, `.agent-notes/layered-edge-routing.md`).
2. `test/helpers/layered-pipeline-replay-names.ts`: `planNames(processors)`: the entry names a row's `prefix` uses, phases as
   `<PHASE>/<STRATEGY>`, processors by `IntermediateProcessorStrategy` member, `GraphTransformer` by position
   (`DIRECTION_PREPROCESSOR` when first in the plan, `DIRECTION_POSTPROCESSOR` otherwise, F5). Instances are matched by class
   against the enum's `create()`; two members creating one class are resolved by position, documented in the header.
3. `test/helpers/layered-pipeline-replay-ops.ts`:
   - `runFullRow(row)` → `{ layout: unknown, plans }`: read the input (`.json` through `ElkGraphJson`, `.elkt` through
     `ElkGraphText`, inline `elk`), apply `options` (the `applyOverlay`/recorder rule), `new RecursiveGraphLayoutEngine().layout(
     graph, new BasicProgressMonitor())`, `JSON.parse(exportLikeOracle(graph))`; `plans` through a `TestController`-free
     walk: `ElkLayered.prepareLayoutTest` on each imported level.
   - `compareFullRow(actual, row)` → `compareLayout(row.expected.layout, actual.layout)` diffs plus exact `plans` diffs.
   - `runStopRow(row, comparator)`: import, apply options, `new ElkLayered().prepareLayoutTest(graph)`, assert
     `planNames` prefix equals `row.prefix`, `runLayoutTestStep` to the stop, dump with the row's dump, compare with
     `comparator`. Used by T9 and T10; `comparator` and dump are parameters so 7b–7e rows use their own.
   - `runSteps`-compatible handling of the new `componentsSplit`/`componentsCombine` ops, before the landed `runSteps` sees
     the remaining steps (the 7e `call` precedent).
4. Tests (structural, L4): a fake driver walking a fixed plan; `planNames` on a plan with `GraphTransformer` first and last; a row
   missing `expected.layout` throws naming the row; a `full` comparison reports a `2e-6` coordinate difference and passes a
   `5e-7` one; a plan difference reports the first differing entry.

## Write-set

`test/helpers/layered-pipeline-replay-{rows,names,ops}.ts` and their `.test.ts`.

## Read-set

`test/helpers/layered-routing-replay-{rows,ops}.ts`, `test/helpers/layered-phase-replay-ops.ts:19-27,128-157`,
`test/helpers/graph-json-oracle.ts`, `test/helpers/graph-overlay.ts`, `test/golden/compare-json.ts:150-175`,
`test/golden/layout-goldens.test.ts:39-55` (pipeline shape), `decisions.md` F3–F5, F16.

## Architecture decisions

F4 (full rows), F5 (plan equality, no `normalise`), F16.

## Interface contract (output, consumed by T9, T10, T14, T15)

`loadPipelineRows`, `planNames`, `runFullRow`, `compareFullRow`, `runStopRow(row, { dump, compare })`, as above. `runStopRow`
needs `ElkLayered`'s Java API (`prepareLayoutTest`, `getLayoutTestConfiguration`, `runLayoutTestStep`); until T8 its tests inject a fake.

## Acceptance criteria

- Given a `full` row differing by 2e-6 in one coordinate, when compared, then the diff names that path; at 5e-7, none.
- Given a plan with `GraphTransformer` first and last, when named, then the names are `DIRECTION_PREPROCESSOR` and `DIRECTION_POSTPROCESSOR`.
- Given a row missing a required field, when loaded, then the error names the row.
- Given the helpers' tests, when run, then no ELK literal is hand-derived.

## Observability / Rollback

N/A — no new observable operations. Reversible.
