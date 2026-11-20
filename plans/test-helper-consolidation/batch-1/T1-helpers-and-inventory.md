<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: shared helpers and the final inventory

## Context

Issue #46 item 1: per-file `Factories` objects and `CALLERS` tables, and the order site-row replay block
(`SITE_ROWS`/`siteFactories`/`replaySite`), are copied across the anchored layered tests. This task writes the shared
helpers and the mapping the batch-2 lanes apply. It migrates no call site.

## Write-set

- Create `test/helpers/layered-replay-factories.ts` (split into `layered-replay-factories-<suffix>.ts` siblings if it
  passes 500 lines)
- Create `test/helpers/layered-order-site-replay.ts` (D2)
- Create `test/helpers/layered-spline-callers.ts` (D1 `CALLERS` exception)
- Create `plans/test-helper-consolidation/inventory.md`

## Read-set

- [decisions.md](../decisions.md) D1, D2; [inventory-planning.md](../inventory-planning.md)
- `test/helpers/layered-phase-replay-ops.ts:19-24` (`Factories`), `test/helpers/layered-routing-replay-ops.ts:77`
  (`CallerTable`)
- The first site of each group in the planning inventory; `src/alg/layered/LayeredRoutingVectors.test.ts:67-130`;
  `src/alg/layered/p5edges/splines/{SplinesMath,Rectangle,NubSpline,NubsSelfLoop}{,.sites}.test.ts` (the `CALLERS` blocks)
- `src/alg/layered/p3order/LayerTotalPortDistributor.test.ts:1-40` (variant A),
  `src/alg/layered/intermediate/greedyswitch/SwitchDecider.test.ts:36-60` (variant B)

## Steps

1. Re-run the grouping (the planning script is described at the top of the planning inventory: every
   `const <name>: Factories = {` body, whitespace collapsed). For each group of two or more, check D1's identifier rule
   in every file: same import path and symbol, or a local constant with the same value. Split a group where it fails.
2. Write one export per surviving group (UPPER_SNAKE_CASE, named for what it dispatches, e.g.
   `ORDER_PHASE_FACTORIES`), body copied from the first site, with a one-line doc comment saying which phases and
   processors it covers. Shared constants it needs (phase names) move with it.
3. Write `layered-order-site-replay.ts`: lazy row load (one module-level cache; `test/` is outside the module-globals
   fitness, `module-globals.fitness.test.ts:4`), `replayOrderSite(id)`, using the step 2 export for the order dispatch.
   Grep that no test asserts `no site row` or `is not in layered-order.json`.
4. Write `layered-spline-callers.ts`: `SPLINES_MATH_CALLERS`, `RECTANGLE_CALLERS`, `NUB_SPLINE_CALLERS`,
   `NUBS_SELF_LOOP_CALLERS`, each the union of the current tables for that class; per key, the body of
   `LayeredRoutingVectors.test.ts`. Keep `isBetweenCallers` in `SplinesMath.test.ts` (one user).
5. Write `inventory.md`: one row per object of the planning inventory plus the 23 site-replay blocks and the 9
   `CALLERS` tables: `file:line`, name, lane (T5/T6/T7), action (`→ <export>` or `kept: <reason>`). Every singleton and
   every split-off site gets a reason.
6. `npm run typecheck`, `npx prettier --check test/helpers/<new files>`. A helper with no importer yet is fine until
   batch 2; T8's gates catch an unused export.

## Acceptance criteria

- Given the planning inventory, when T1 finishes, then every one of the 176 objects, 23 replay blocks and 9 tables has
  exactly one `inventory.md` row with a lane and an action.
- Given a group export, when its body is compared with each mapped site, then it is identical after whitespace and
  every identifier resolves to the same symbol or value (D1), or the site is marked `kept`.
- Given `replayOrderSite(id)` for an id present in `layered-order.json`, when called, then it returns what both old
  variants returned (same row, same factories, same `orderDump`).
- Given the new helper files, when `npm run typecheck` runs, then it exits 0.

## Interface contract (consumed by T5-T7)

`inventory.md` rows: `| file:line | name | lane | action |`. Exports: `<NAME>: Factories` objects;
`replayOrderSite(id: string): OrderExpected`; `<CLASS>_CALLERS: CallerTable`.

## Observability / rollback

N/A — test code only, no observable operation. Reversible (revert the commit).
