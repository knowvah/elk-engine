<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — `core.alg` processor configuration side

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4): port layout processor configuration and phase interfaces`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). Every algorithm bundle (layered, mrtree, radial, rectpacking, spore, topdownpacking, vertiflex)
builds its processor pipeline from these types. T6 (`AlgorithmAssembler`) consumes them.
- `ILayoutPhase.getLayoutProcessorConfiguration` returns a `LayoutProcessorConfiguration`, so the interface and the
  class must land together. This follows the 5a lesson that an interface ships with the class its signature names.
- `ILayoutProcessor` already landed in 5a (`src/core/alg/ILayoutProcessor.ts`).

## Task
1. Port the following, one file each, with Java names and `@see`:
   - `J/util/AbstractRandomListAccessor.java`
   - `J/alg/ILayoutProcessorFactory.java`
   - `J/alg/ILayoutPhaseFactory.java`
   - `J/alg/ILayoutPhase.java`
   - `J/alg/EnumBasedFactoryComparator.java`
   - `J/alg/LayoutProcessorConfiguration.java`
2. **Phase enums.** `P extends Enum<P>` becomes `P extends { ordinal(): number }`. TS enums are classes with
   `ordinal()`, `compareTo()` and static `values()`; see `src/core/options/Alignment.ts`.
3. **`EnumBasedFactoryComparator`:** drop the elkjs-exclude block at `:40-47` and leave a one-line comment naming the
   Java lines (P3, M2). It compares with `compareTo` on the two factories, typed as enum-like.
4. **`LayoutProcessorConfiguration`:**
   - `processorsBefore` and `processorsAfter` return `Sets.newHashSet(...)` of factories in Java (`:244`, `:257`).
     Factories are identity-hashed, so use a JS `Set` in insertion order and journal the site (P2, AD-10).
   - Keep the `currentIndex` slot arithmetic (`phase.ordinal()` and `+ 1`) exactly as written.
5. **Test helpers** in `test/helpers/` (P8):
   - Port `JT/alg/TestPhases.java` and `JT/alg/TestProcessors.java` as TS enum classes.
   - Their graph type is a `StringBuffer`; use the landed `src/java/lang/StringBuilder.ts`.
   - `TestProcessors.class.getEnumConstants()[ordinal]` becomes `TestProcessors.values()[ordinal]`.
6. Port `JT/alg/LayoutProcessorConfigurationTest.java` to `src/core/alg/LayoutProcessorConfigurationTest.test.ts`
   (8 cases) with the exact Java expectations.

## Write-set
- `src/core/util/AbstractRandomListAccessor.ts`
- `src/core/alg/{ILayoutProcessorFactory,ILayoutPhaseFactory,ILayoutPhase,EnumBasedFactoryComparator,LayoutProcessorConfiguration}.ts`
- `src/core/alg/LayoutProcessorConfigurationTest.test.ts`
- `test/helpers/{TestPhases,TestProcessors}.ts`
- colocated unit tests (e.g. `AbstractRandomListAccessor.test.ts`, `EnumBasedFactoryComparator.test.ts`)

## Read-set
- The six Java files.
- `JT/alg/{TestPhases,TestProcessors,LayoutProcessorConfigurationTest}.java`.
- `src/core/alg/ILayoutProcessor.ts`, `src/core/options/Alignment.ts` (enum pattern), `src/guava/Sets.ts`,
  `src/java/lang/StringBuilder.ts`.
- `docs/translation-rules.md` §6.3.
- `decisions.md#pre-made` (P2, P3, P8).

## Interface contracts (outputs, consumed by T6)
- `ILayoutProcessorFactory<G> { create(): ILayoutProcessor<G> }`.
- `ILayoutPhaseFactory<P, G> extends ILayoutProcessorFactory<G> { create(): ILayoutPhase<P, G> }`.
- `ILayoutPhase<P, G> extends ILayoutProcessor<G> { getLayoutProcessorConfiguration(graph: G): LayoutProcessorConfiguration<P, G> | null }`.
- `LayoutProcessorConfiguration<P, G>`:
  - static `create()` and `createFrom(other)`;
  - `before`, `after`, `add`, `addBefore`, `addAfter`, `addAll`, `clear`;
  - `processorsBefore(phase)` and `processorsAfter(phase)`, each returning `Set<ILayoutProcessorFactory<G>>`.
- `AbstractRandomListAccessor<T>`, with the protected `provideDefault`, `getListItem`, `setListItem`, `getListSize`
  and `clearList`.
- `EnumBasedFactoryComparator<G>`, with `compare(f1, f2): number`.

## Acceptance criteria
- Given the 8 `LayoutProcessorConfigurationTest` cases, when run, then all pass with the Java expectations.
- Given two factories from one TS enum, when the comparator runs, then the result's sign follows ordinal order. The
  Java type check that throws `UnsupportedOperationException` is absent (M2): the comparator calls `compareTo`
  directly.
- Given `getListItem(5)` on an empty accessor, when called, then the list grows with `provideDefault()` values up to
  index 5. Given a negative index, then `IndexOutOfBoundsException` is thrown.
- Given `setListItem(i, v)` past the end, when called, then only the gap is filled with defaults
  (`AbstractRandomListAccessor.setListItem`).

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
