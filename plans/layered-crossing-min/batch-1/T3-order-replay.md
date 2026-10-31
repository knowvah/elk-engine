<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Order replay helpers

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T3): add the layered order replay helpers`

## Context

Mission 7c (README), C3. The TS twin of T1's rows. The 7b helpers (`test/helpers/layered-phase-replay-{rows,normalise,
dump,ops,compare}.ts`, landed, never edited) already load rows, import the input with the options on the imported
target, normalise, run steps (`runSteps`) and prefixes (`runPrefix`) with injected `Factories`, compute the B2 dump
and compare at the AD-4 bar. Their `createPhase(phase, strategy)` takes any phase string, so `P3_NODE_ORDERING` needs
no ops change. What 7c adds is the `ports` field and its comparison.

## Task

1. `test/helpers/layered-order-replay-rows.ts`: `loadOrderRows(file)` — `loadRows` plus a type `OrderRow` whose
   `expected` has `ports: Record<string, string[]>`; reject a row without `ports`.
2. `test/helpers/layered-order-replay-dump.ts`: `orderDump(graph, importDump)` → `phaseDump(graph, importDump)` plus
   `ports` (every node's ports in list order, paths from the 7a positional scheme incl. `new/p<k>`).
3. `test/helpers/layered-order-replay-compare.ts`: `compareOrder(actual, expected)` → `compareExpected` diffs plus
   per-node port-order diffs (order is the contract here, unlike `edges`/`changed`); `compareOrderFullDump` delegates
   to `compareFullDump` when `expected.dump` exists.
4. Tests (structural, L4): a 7b scenario row imported and normalised yields `ports` equal to the import order and
   `changed: []`; a fake P3 phase that swaps two nodes in a layer and two ports on a node makes `compareOrder` report
   both; a row missing `ports` throws naming the row.

## Write-set

`test/helpers/layered-order-replay-{rows,dump,compare}.ts` and their `.test.ts`.

## Read-set

`test/helpers/layered-phase-replay-{rows,dump,ops,compare}.ts` (exports and `Factories`), `test/helpers/layered-framework-replay.ts`
(`assignPaths`, `dumpLGraph`), `batch-1/T1-order-recorder.md` § Interface contract, `decisions.md` C3.

## Interface contract (consumed by T4–T8, T10–T12)

```ts
loadOrderRows(file: string): OrderRow[]
orderDump(graph: LGraph, importDump: LGraphDump): OrderExpected   // phaseDump + ports
compareOrder(actual: OrderExpected, expected: OrderExpected): Diff[]  // [] means equal
compareOrderFullDump(actual, expected): Diff[]
// unchanged from 7b: importRow, normalise, runSteps(row, factories), runPrefix(row, factories), Factories
```

## Acceptance criteria

- Given a 7b scenario row, when imported, normalised and dumped, then `changed` is empty and `ports` lists each node's
  ports in import order.
- Given a fake phase swapping two nodes and two ports, when replayed, then the diff names the layer and the node.
- Given `npm run typecheck` and prettier, when run, then clean.

## Observability / Rollback

N/A. Reversible.
