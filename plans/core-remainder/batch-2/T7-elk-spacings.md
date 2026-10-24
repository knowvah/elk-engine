<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — `ElkSpacings`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port elk spacings builders`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). `ElkSpacings` configures the core spacing options relative to a base spacing.
`alg.layered`'s `LayeredSpacings` extends `AbstractSpacingsBuilder` later (mission 7a). It uses T5's
`LayoutConfigurator` (`IPropertyHolderOptionFilter`, `OPTION_TARGET_FILTER`).

## Task
1. Port `J/util/ElkSpacings.java`: `ElkSpacings.withBaseValue`, the nested `ElkCoreSpacingsBuilder` and the nested
   abstract generic `AbstractSpacingsBuilder<T>`.
   - The nested classes go in prefixed files (P1, M15), e.g. `ElkSpacingsElkCoreSpacingsBuilder.ts` and
     `ElkSpacingsAbstractSpacingsBuilder.ts`, re-exported by `ElkSpacings.ts`.
   - If a static `CoreOptions` field creates an ESM temporal-dead-zone cycle, use cached static getters (M12/M16
     precedent) and journal it.
2. **`factorMap`** becomes `JavaHashMap<IProperty<number>, number>` with the `IProperty` hash strategy (inventory row
   V2, P2). Both iterations, `getFactors` (`ImmutableMap.copyOf`, `:209`) and `build` (`keySet().stream()`, `:288`),
   follow its order.
3. Keep the upstream oddities verbatim:
   - `DOUBLE_EQ_EPSILON = 10e-5`, which is `1e-4`;
   - the identifier `getDependendSpacingOptions`;
   - the `assert` in the static initializer (`:80`). Omit it with a comment naming the line; there is no `devAssert`
     helper (`KVector.ts` precedent).
4. Port every branch of `computeFactor`, `withFactor`, `withValue` (including the `-Double.MIN_VALUE` cases),
   `withOverwrite`, `build`, `apply` and `toVisitor`.
5. Port `JT/alg/SpacingConfigurationTest.java` (11 cases) to `src/core/alg/SpacingConfigurationTest.test.ts`.
   - `PlainJavaInitialization.initializePlainJavaLayout()` becomes `LayoutMetaDataService.unload();
     LayoutMetaDataService.getInstance();` (P4, J6).
   - Replace Guava `Streams` with plain iteration. Expectations are unchanged.

## Write-set
`src/core/util/ElkSpacings.ts` and the prefixed nested-class files, `src/core/alg/SpacingConfigurationTest.test.ts`,
colocated unit tests.

## Read-set
- `J/util/ElkSpacings.java`, `JT/alg/SpacingConfigurationTest.java`.
- T5's `src/core/LayoutConfigurator.ts`.
- `src/java/util/{JavaHashMap,HashStrategy}.ts`, `src/guava/{Maps,ImmutableMap,DoubleMath}.ts`.
- `src/core/options/CoreOptions.ts` (spacing options).
- `docs/translation-rules-collections.md` (row V2).
- `plans/elk-json-adapter/decisions.md` (J6).

## Interface contracts (outputs)
- `ElkSpacings.withBaseValue(base: number): ElkCoreSpacingsBuilder`.
- `AbstractSpacingsBuilder<T>`: `withFactor`, `withValue`, `withOverwrite`, `getFactors`, `build(): (holder) => void`,
  `apply(holder)`, `toVisitor(): IGraphElementVisitor`.
- Statics: `ELK_OPTION_TARGET_FILTER`, `ElkCoreSpacingsBuilder.BASE_SPACING_OPTION`.
- Subclassable in mission 7a: protected `thisT`, `getBaseSpacingOption`, `getDependendSpacingOptions`, `getFilters`,
  `computeFactor`.

## Acceptance criteria
- Given the 11 `SpacingConfigurationTest` cases, when run, then all pass with the Java expectations.
- Given `factorMap`, when inspected, then it is a `JavaHashMap` using the `IProperty` strategy (V2).
- Given `withOverwrite(false)` and a holder that already has a spacing, when `apply` runs, then the existing value is
  kept.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
