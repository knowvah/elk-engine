<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — E1 preparation and the entry-point fitness test

**Agent:** typescript-pro (sonnet) · **Commit:** `fix(T2): prepare the crossing-minimization enum for wiring`

## Context

Mission 7c (README), C5. In 7b, wiring a strategy enum's arms closed an ESM import cycle the Java also has (enum →
phase class → `LayeredOptions` → provider → transformer → importer → enum) and three kinds of module-level reads
failed in the temporal dead zone (decision E1 and the observations in `.agent-notes/layered-cycles-layers.md`). The
recipe is now applied **before** wiring, and the fresh-process import probe becomes a fitness function (AD-8).

## Task

1. `tools/melk/config.ts`: add `org.eclipse.elk.alg.layered.options.CrossingMinimizationStrategy` to
   `NON_LEAF_DEFAULT_TYPES` (comment: mission 7c, C5); `npm run melk:generate Layered`; confirm
   `melk:generate Core Labels Polyomino` leaves those bundles byte-identical and `LayeredOptions.ts` unchanged.
2. `test/architecture/layered-entry-points.fitness.test.ts`: for each entry — `src/alg/layered/options/{CycleBreakingStrategy,
   LayeringStrategy,CrossingMinimizationStrategy,LayeredMetaDataProvider,LayeredOptions}.ts`,
   `src/alg/layered/intermediate/IntermediateProcessorStrategy.ts`, `src/alg/layered/LayeredLayoutProvider.ts` — spawn
   `node --import tsx -e "import('<abs path>')"` (`execFileSync`, the repo's tsx) and assert exit 0 with no
   `ReferenceError`/`before initialization` in stderr; one `it` per entry; the list is a named constant with a comment
   telling later missions to append their enums (7d `NodePlacementStrategy`, 7e `EdgeRouterFactory`).
3. Run `npx vitest run test/architecture test/melk`.

## Write-set

`tools/melk/config.ts`, `src/alg/layered/options/LayeredMetaDataProvider.ts` (generated only),
`test/architecture/layered-entry-points.fitness.test.ts`.

## Read-set

`tools/melk/config.ts:10-25`, `test/architecture/*.fitness.test.ts` (style), `plans/layered-cycles-layers/decisions.md`
E1, `.agent-notes/layered-cycles-layers.md` (the two cycle observations).

## Acceptance criteria

- Given the regenerated provider, when diffed, then only the `CROSSING_MINIMIZATION_STRATEGY` default and property
  became lazy getters and no other generated file changed.
- Given each entry module, when imported first in a fresh process, then the test passes (today and after T7/T8 wire the arms).
- Given `npm run typecheck` and `npx prettier --check`, when run on the written files, then clean.

## Observability / Rollback

N/A. Reversible.
