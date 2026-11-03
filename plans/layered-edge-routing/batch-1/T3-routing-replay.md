<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Routing replay helpers

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T3): add the layered routing replay helpers`
Scratch: a private subdirectory `<scratchpad>/T3/`.

## Context

Mission 7e (README), R3, R12. The TS twin of T1's rows. The 7d helpers (`test/helpers/layered-placement-replay-{rows,
dump,compare,ops}.ts`, landed, never edited) load rows (`loadPlacementRows`, `:57`), compute the placement dump
(`placementDump`, `layered-placement-replay-dump.ts:64`: order dump + `geometry`), compare at the AD-4 bar
(`comparePlacement`/`comparePlacementFullDump`, `layered-placement-replay-compare.ts:60-65`; numbers within
`TOLERANCE` = 1e-6, `layered-framework-replay.ts:37,454`) and run a pipeline prefix (`runPlacementPrefix`,
`layered-placement-replay-ops.ts:40`). Steps run through `runSteps` with injected `Factories`
(`layered-phase-replay-ops.ts:19-24,128`: `createProcessor(name)`, `createPhase(phase, strategy)`; `createPhase` takes
any phase string, so `P5_EDGE_ROUTING` needs no change to the step interpreter, but the `call` op does).

## Task

1. `test/helpers/layered-routing-replay-rows.ts`: `loadRoutingRows(file)` — `loadPlacementRows` plus a type
   `RoutingRow` whose `expected.geometry` has `graph: { size, offset }`, `edges: Record<path, { bendPoints: HexPair[],
   junctionPoints?: HexPair[] }>`, optional `splines: Record<path, { chain: string[], route: SegmentSummary[] }>`;
   `calls` rows have `expected.result: CallResult` (`{ type, value }` per R12); `ROUTING_ROW_GROUPS = ['models',
   'scenarios', 'sites', 'calls']`; reject a row without `geometry.graph`/`geometry.edges` (or, for `calls`, without
   `result`), naming it. `loadRoutingRows` accepts both ref files and concatenates.
2. `test/helpers/layered-routing-replay-dump.ts`: `routingDump(graph, importDump)` → `placementDump(graph, importDump)`
   plus `graph`, `edges` (every edge of the traversal in `expected.edges` order, paths from the 7a positional scheme;
   `junctionPoints` only when the edge has the `JUNCTION_POINTS` property) and `splines` **always** computed from
   `SPLINE_EDGE_CHAIN`/`SPLINE_ROUTE_START` when any edge carries them (the `SplineSegment` fields of R3; the class is
   staged until T6, so read the fields structurally and type them locally).
3. `test/helpers/layered-routing-replay-compare.ts`: `compareRouting(actual, expected)` → `comparePlacement` diffs
   plus graph, edge and spline diffs: every coordinate within 1e-6 (reuse the number rule of
   `layered-framework-replay.ts:454`, not a new tolerance), bend-point and junction-point counts, chains, ranks and
   booleans exact, a missing or extra edge or start edge reported by path; `splines` compared only when the
   **expected** side carries it. `compareRoutingFullDump` delegates to `comparePlacementFullDump` when `expected.dump`
   exists. `compareCall(actual: CallResult, expected: CallResult)` compares per `type` (doubles within 1e-6, the rest exact).
4. `test/helpers/layered-routing-replay-ops.ts`: `runRoutingPrefix(row, factories)` — 7d's `runPlacementPrefix`
   shape accepting `P5_EDGE_ROUTING/<ROUTING>` entries and the 7e processor names (both through `factories`);
   `runCall(row, factories, callers)` — runs the row's steps up to the `call` step through `runSteps`, resolves
   `<Class>.<method>` in `callers: Record<string, (...args: unknown[]) => unknown>`, decodes args (`port` by path from
   the graph's context, `double` by `decodeHex`, `boolean`, `enum` by `valueOf`) and returns a `CallResult` built by
   `summarise(result)` (`number` → `double`, `boolean`, `KVector` → `vector`, `Rectangle`-shaped → `rectangle`,
   `NubSpline`-shaped → `nubs`; shapes detected structurally since the classes land in T6/T7). The 7b/7c/7d helpers
   are never edited: the `call` step is handled here, before `runSteps` sees the remaining steps.
5. Tests (structural, L4): a 7d `scenarios/*` row imported and normalised yields `geometry.edges` with empty bend
   points, `graph` equal to the import's size/offset and `changed: []`; a fake P5 phase that adds one bend point
   `2e-6` off and another `5e-7` off makes `compareRouting` report exactly the first; a row missing `geometry.edges`
   throws naming the row; `splines` diffs appear only when the expected row carries `splines`; `runCall` with a
   fake caller returning a `KVector` yields `{ type: 'vector', … }` and `compareCall` reports a 2e-6 difference.

## Write-set

`test/helpers/layered-routing-replay-{rows,dump,compare,ops}.ts` and their `.test.ts`.

## Read-set

`test/helpers/layered-placement-replay-{rows,dump,compare,ops}.ts` and tests (pattern, read only),
`test/helpers/layered-phase-replay-ops.ts:19-24,80-150`, `test/helpers/layered-order-replay-dump.ts:1-60`,
`test/helpers/layered-framework-replay.ts:37,156,445-460`, `src/alg/layered/graph/LEdge.ts:170-185`
(`getBendPoints`), `src/alg/layered/graph/LGraph.ts:50-90`, `src/alg/layered/options/InternalProperties.ts:295-325`,
`src/core/options/CoreOptions.ts:313-325` (`JUNCTION_POINTS`), `batch-1/T1-routing-recorder.md` § Interface contract,
`decisions.md` R3, R12.

## Architecture decisions

R3 (fields, presence, 1e-6), R12 (`calls`), AD-4.

## Interface contract (consumed by T4–T14)

`loadRoutingRows`, `RoutingRow`, `ROUTING_ROW_GROUPS`, `routingDump`, `compareRouting`, `compareRoutingFullDump`,
`runRoutingPrefix`, `runCall`, `compareCall`, `CallResult`, `SegmentSummary`; a test replays a row with
`runRoutingPrefix(row, factories)` or `runSteps(row, factories)`, dumps with `routingDump(graph, importRow(row).importDump)`
and asserts `compareRouting(actual, row.expected)` is `[]`.

## Acceptance criteria

- Given the 7d rows, when loaded through `loadRoutingRows` with the adapter in the test, then the loader rejects
  them by name (no `geometry.edges`), and a synthetic row with the 7e shape loads.
- Given the fake-phase cases, when compared, then exactly the listed diffs.
- Given `runCall` with a fake caller, when run, then the summary and the comparison behave as listed.
- Given `npm run typecheck`, prettier, `npm run complexity` and the helper tests, when run, then clean.

## Observability / Rollback

N/A. Reversible.
