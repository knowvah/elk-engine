<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Option codegen, option enums and staging

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): generate packing options and stage the providers` · Scratch: `$TMPDIR/alg-packing/T5/`

## Context

Mission 8c, PK8. `npm run melk:generate RectPacking SPOrE Topdownpacking` emits `RectPackingMetaDataProvider`/`RectPackingOptions`,
`SporeMetaDataProvider`/`SporeOverlapRemovalOptions`/`SporeCompactionOptions`, `TopdownpackingMetaDataProvider`/`TopdownpackingOptions`
(paths in `docs/architecture/port-map.md:456-541`). The hand-written option types they name come from the Java: `R/options/*`
(`OptimizationGoal`), `R/p1widthapproximation/WidthApproximationStrategy`, `R/p2packing/PackingStrategy`,
`R/p3whitespaceelimination/WhiteSpaceEliminationStrategy`, `S/options/*` (six enums), `P/NodeArrangementStrategy`,
`P/WhitespaceEliminationStrategy`, and the phase enums if an option names them. Strategy enums' `create()` instantiate phase classes
that do not exist yet: stage those enum files (or only their `create()`), as 8a/8b staged providers.

## Task

1. Generate the options; check `tools/melk` config/imports need entries for the new types (the `PackingMode` / `Dimension` convention).
2. Port the option enums whole, staging only what needs later classes (`// @staged 8c` on line 2, `create()` throwing the staged message).
3. Stage the four providers (non-throwing constructor, throwing `layout`; `TopdownpackingLayoutProvider` also throwing `getPredictedGraphSize`).
4. Rows in `test/architecture/staged-classes.json`; widen `MARKER` in `staged-classes.fitness.test.ts` by the token `8c` and update its
   header comment ("the list is empty after mission 8c").
5. Option tests per bundle in the shape of `test/melk/polyomino-options.test.ts` / the 8b option tests (ids, defaults, the oracle
   metadata dump `test/golden/refs/java/metadata.json`).
6. Run the per-module import smoke (TDZ, 7a F10) over the new modules; add `NON_LEAF_DEFAULT_TYPES` entries only if it fails.
7. `npm run melk:generate Core Labels Polyomino Layered Tree Radial VertiFlex Force Stress Disco` then `git diff --exit-code src/` (stop 10).

## Write-set

`src/alg/{rectpacking,spore,topdownpacking}/options/**`, the enum files at their Java paths (`src/alg/rectpacking/{p1widthapproximation,p2packing,p3whitespaceelimination}/*Strategy.ts`,
`src/alg/topdownpacking/{NodeArrangementStrategy,WhitespaceEliminationStrategy}.ts`), the four staged provider files at their Java
paths, their `*.test.ts`, `test/architecture/staged-classes.json`, `test/architecture/staged-classes.fitness.test.ts` (MARKER and
header only), `tools/melk/{config,imports}.ts` only where a new type needs an entry, `test/melk/*-options.test.ts` (new files).

## Read-set

`tools/melk/{config,generate,imports,emit}.ts`, `tools/melk/sources/{RectPacking,SPOrE,Topdownpacking}.melk`, the Java enums above,
`src/alg/force/options/*`, `src/alg/disco/options/*`, `test/architecture/staged-classes.fitness.test.ts`,
`test/melk/model-algorithms.test.ts:110-130`, `decisions.md#pk8--staging-and-registration`.

## Interface contract (consumed by every later task)

The generated option classes and providers under their Java names; staged class list `{ path, mission: "8c" }`.

## Acceptance criteria

- Given the generated options, when compared with `refs/java/metadata.json`, then every option id, default and target equals the oracle's.
- Given the staging fitness test, then marker files and `staged-classes.json` agree, and `PENDING_TYPES` is still `[]`.
- Given the landed bundles regenerated, then `git diff --exit-code src/` is clean.
- Given the per-module import smoke over the new modules, then every module loads alone.

## Observability / Rollback

N/A — no new observable operations. Reversible.
