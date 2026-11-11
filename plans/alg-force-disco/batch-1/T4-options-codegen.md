<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Options codegen and staged providers

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4): generate force and disco options and stage providers` · Scratch: `$TMPDIR/alg-force-disco/T4/`

## Context

Mission 8b, FD5. The JVM-dump melk tests already cover `Force`, `Stress` and `Disco`. The generated `*MetaDataProvider` imports its
provider, so three providers are staged.

## Task

1. Port `F/options/ForceModelStrategy`, `D/options/CompactionStrategy` and `F/stress/StressMajorization.Dimension`
   (`src/alg/force/stress/Dimension.ts`, the `PackingMode` convention).
2. Add `src/alg/force/{ForceLayoutProvider,stress/StressLayoutProvider}.ts` and `src/alg/disco/DisCoLayoutProvider.ts`: line-2 marker
   `// @staged 8b`, a non-throwing constructor, `layout` throwing the staged message; rows in `staged-classes.json`.
3. Widen `MARKER` in `test/architecture/staged-classes.fitness.test.ts` by the token `8b` and update its header comment. Change nothing
   else in that file.
4. `npm run melk:generate Force Stress Disco`, unedited. Check that `Core`, `Labels`, `Polyomino`, `Layered`, `Tree`, `Radial` and
   `VertiFlex` regenerate byte-identically.
5. `test/melk/force-disco-options.test.ts`: option ids and defaults against the `.melk` text (the `polyomino-options.test.ts` shape).
6. Run the per-module import smoke; add `NON_LEAF_DEFAULT_TYPES` only if it fails.

## Write-set

`src/alg/force/options/**`, `src/alg/disco/options/**`, `src/alg/force/stress/Dimension.ts`, the three staged providers,
`test/architecture/staged-classes.json`, `test/architecture/staged-classes.fitness.test.ts`, `test/melk/force-disco-options.test.ts`,
`tools/melk/config.ts` (only per task item 6).

## Read-set

`tools/melk/{config,generate,imports}.ts`, `tools/melk/sources/{Force,Stress,Disco}.melk`, `test/melk/polyomino-options.test.ts`,
`test/architecture/staged-classes.fitness.test.ts`, `src/core/util/PackingMode.ts`, `decisions.md#fd5-staging-and-registration`.

## Interface contract (consumed by T6–T10)

`ForceOptions`, `StressOptions`, `DisCoOptions`, the metadata providers, `ForceModelStrategy`, `CompactionStrategy`, `Dimension`, under the
generated and Java names.

## Acceptance criteria

- Given the generator run twice, then `git diff --exit-code src/` is clean after the second.
- Given the fitness tests, then every staged file has its marker and row, and `PENDING_TYPES` is still `[]`.
- Given each `.melk` option, then the test reads its id and default from the generated class.

## Observability / Rollback

N/A — no new observable operations. Reversible.
