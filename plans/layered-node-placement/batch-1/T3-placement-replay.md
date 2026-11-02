<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Placement replay helpers

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T3): add the layered placement replay helpers`
Scratch: a private subdirectory `<scratchpad>/T3/`.

## Context

Mission 7d (README), N3. The TS twin of T1's rows. The 7b helpers (`test/helpers/layered-phase-replay-{rows,normalise,
dump,ops,compare}.ts`) and the 7c helpers (`test/helpers/layered-order-replay-{rows,dump,compare,ops}.ts`) are landed
and never edited. They load rows, import the input with the options on the imported target, normalise, run steps
(`runSteps`) with injected `Factories` (`layered-phase-replay-ops.ts:19-24`: `createProcessor(name)`,
`createPhase(phase, strategy)`), compute the B2 dump plus the 7c `ports` order (`orderDump`,
`layered-order-replay-dump.ts:54`) and compare at the AD-4 bar (`compareOrder`, `compareOrderFullDump`,
`layered-order-replay-compare.ts:52-58`; numbers within `TOLERANCE` = 1e-6, `layered-framework-replay.ts:37,454`).
The 7b `runPrefix` fixes the prefix phase set to P1/P2 and 7c's `runOrderPrefix` (`layered-order-replay-ops.ts:34`)
adds P3, so 7d adds its own prefix runner. `createPhase(phase, strategy)` takes any phase string, so
`P4_NODE_PLACEMENT` needs no change to the step interpreter.

## Task

1. `test/helpers/layered-placement-replay-rows.ts`: `loadPlacementRows(file)` — `loadOrderRows` plus a type
   `PlacementRow` whose `expected` has `geometry: PlacementGeometry` (`nodes: Record<path, { pos, size, margin }>`,
   `layers: HexPair[]`, optional `ports: Record<path, { pos }>`, optional `labels: Record<path, { pos }>`); reject a
   row without `geometry`, naming it.
2. `test/helpers/layered-placement-replay-dump.ts`: `placementDump(graph, importDump)` → `orderDump(graph, importDump)`
   plus `geometry` with `ports` and `labels` **always** computed (every node's ports and labels in list order, paths
   from the 7a positional scheme incl. `new/p<k>`; layer sizes from `Layer.getSize()` in order).
3. `test/helpers/layered-placement-replay-compare.ts`: `comparePlacement(actual, expected)` → `compareOrder` diffs plus
   geometry diffs: every coordinate within 1e-6 (reuse the number rule of `layered-framework-replay.ts:454` /
   `layered-site-replay-compare.ts:10`, not a new tolerance), a node, layer, port or label missing or extra reported by
   path; `ports`/`labels` are compared only when the **expected** side carries them (N3 presence rule).
   `comparePlacementFullDump` delegates to `compareOrderFullDump` when `expected.dump` exists.
4. `test/helpers/layered-placement-replay-ops.ts`: `runPlacementPrefix(row, factories)` — 7c's `runOrderPrefix` shape
   accepting `P4_NODE_PLACEMENT/<STRATEGY>` entries and the 7d processor names (both go through `factories`).
5. Tests (structural, L4): a 7c `scenarios/*` row imported and normalised yields `geometry` equal to the import
   geometry and `changed: []`; a fake P4 phase that moves one node's `y` by 2e-6 and another's by 5e-7 makes
   `comparePlacement` report exactly the first; a row missing `geometry` throws naming the row; a fake phase that
   moves a port is reported only when the expected row carries `ports`.

## Write-set

`test/helpers/layered-placement-replay-{rows,dump,compare,ops}.ts` and their `.test.ts`.

## Read-set

`test/helpers/layered-order-replay-{rows,dump,compare,ops}.ts` (exports listed above), `test/helpers/layered-phase-replay-{rows,dump,ops,compare}.ts`
(`Factories`, `Expected`, `runSteps`, `importRow`, `normalise`), `test/helpers/layered-framework-replay.ts:37-120,440-470`
(`NodeDump`/`PortDump`/`LabelDump`, `TOLERANCE`, `decodeHex`), `batch-1/T1-placement-recorder.md` § Interface
contract, `decisions.md` N3.

## Architecture decisions

N3 (geometry shape, presence rule, AD-4 tolerance on coordinates, order exact).

## Interface contract (consumed by T4–T8, T10–T12)

```ts
loadPlacementRows(file: string): PlacementRow[]
placementDump(graph: LGraph, importDump: LGraphDump): PlacementExpected   // orderDump + geometry (ports/labels always)
comparePlacement(actual: PlacementExpected, expected: PlacementExpected): Diff[]   // [] means equal
comparePlacementFullDump(actual, expected): Diff[]
runPlacementPrefix(row: PlacementRow, factories: Factories): LGraph
// unchanged from 7b/7c: importRow, normalise, runSteps(row, factories), Factories
```

## Acceptance criteria

- Given a 7c scenario row, when imported, normalised and dumped, then `changed` is empty and `geometry` equals the
  import geometry for every node, port, label and layer.
- Given a fake phase moving one node by 2e-6 and another by 5e-7, when compared, then exactly the first node is named.
- Given a row without `geometry`, when loaded, then it throws naming the row.
- Given `npm run typecheck` and `npx prettier --check`, when run, then clean.

## Observability / Rollback

N/A — test tooling. Reversible.
