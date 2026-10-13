<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — `LayoutCategoryData`, `LayoutAlgorithmData`, provider base types, option interfaces

**Agent:** typescript-pro · **Commit:** `feat(T10): add layout algorithm and category data`

## Context
Generated algorithm classes (`*Options`, emitted for later missions, T17) build
`LayoutAlgorithmData` with a provider factory; categories collect their layouters in the service
(T14). `AbstractLayoutProvider implements IGraphLayoutEngine` is the provider base type.
`ILabelManager` is the type of `LabelManagementOptions.LABEL_MANAGER` (T13).

## Task
TDD. Port, with every member:
- `LayoutCategoryData` (+ nested `Builder`; `getLayouters`, `equals`/`hashCode`/`toString`).
- `LayoutAlgorithmData` (+ nested `Builder`: `id`, `name`, `providerFactory`, `category`,
  `melkBundleName`, `definingBundleId`, `description`, `imagePath`, `supportedFeatures`,
  `validatorClass`): `addKnownOption`, `getKnownOptionIds`, `knowsOption(IProperty|string)`,
  `getDefaultValue(IProperty|string)` (overloads per translation-rules §6.5), `supportsFeature`,
  `getInstancePool` (an `InstancePool` over the factory), getters. `knownOptions` is a
  `Maps.newHashMap()` with `String` keys → `JavaHashMap` (AD-10), so `getKnownOptionIds()` iterates in
  JVM order.
- `IGraphLayoutEngine` (`layout(ElkNode, IElkProgressMonitor)`), `AbstractLayoutProvider`
  (`initialize(parameter)`, `dispose()`, abstract `layout`).
- `ILabelManager` (exactly the Java method set) and `ITopdownSizeApproximator`
  (`getSize(ElkNode): KVector`), each also exporting its same-named `javaInterface(…)` token (T8):
  the generated options pass them as `optionClass`.
- T8 typed `Registry.register` through `ILayoutMetaData`; do not edit T8's files — consumers
  narrow with `instanceof` (translation-rules §6.5).

## Write-set
`src/core/data/{LayoutCategoryData,LayoutAlgorithmData}.ts`,
`src/core/{AbstractLayoutProvider,IGraphLayoutEngine}.ts`, `src/core/labels/ILabelManager.ts`,
`src/core/options/ITopdownSizeApproximator.ts`, `LayoutCategoryData.test.ts`,
`LayoutAlgorithmData.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/data/{LayoutCategoryData,LayoutAlgorithmData}.java`
- `…/core/{AbstractLayoutProvider,IGraphLayoutEngine}.java`, `…/core/labels/ILabelManager.java`,
  `…/core/options/ITopdownSizeApproximator.java`
- `src/java/util/JavaHashMap.ts` (String-key hashing), `src/graph/properties/GraphFeature.ts`
- `src/core/util/{InstancePool,IFactory}.ts` (T3), `src/core/util/IElkProgressMonitor.ts` (T4),
  `src/core/validation/IValidatingGraphElementVisitor.ts` (T5), `src/java/lang/JavaClass.ts` (T8)

## Interface contract (consumed by T13, T14, T16, T17)
```ts
class LayoutAlgorithmData implements ILayoutMetaData { static readonly Builder;
  addKnownOption(p: IProperty<unknown>, d: unknown): void; getKnownOptionIds(): Set<string>;
  knowsOption(p: IProperty<unknown> | string): boolean; getDefaultValue(p: IProperty<unknown> | string): unknown;
  supportsFeature(f: GraphFeature): boolean; getSupportedFeatures(); getInstancePool(): InstancePool<AbstractLayoutProvider>;
  getValidatorClass(); getCategoryId(); getBundleName(); getDefiningBundleId(); getPreviewImagePath() }
class LayoutCategoryData implements ILayoutMetaData { static readonly Builder; getLayouters(): LayoutAlgorithmData[] }
abstract class AbstractLayoutProvider implements IGraphLayoutEngine { initialize(p: string): void; dispose(): void;
  abstract layout(node: ElkNode, monitor: IElkProgressMonitor): void }
```

## Acceptance criteria
- Given an algorithm with known options added in order `c, a, b`, when `getKnownOptionIds()`, then
  the order equals Java `HashMap` iteration for those keys (expected order derived from the
  `hash.json` String-key vectors or computed with `JavaHashMap`'s vector-proven hashing).
- Given `knowsOption(property)` and `knowsOption(property.getId())`, then both agree; an unknown id
  is `false` and its `getDefaultValue` is `null`.
- Given a `Builder` with a test-only `IFactory`, when `getInstancePool().fetch()`, then the factory's
  `create` runs once per new instance.
- Given `simpleNameOf(ILabelManager)` and `simpleNameOf(ITopdownSizeApproximator)` (the tokens),
  then `ILabelManager` and `ITopdownSizeApproximator`.
- Given a category, when two algorithms are added to `getLayouters()`, then `toString`, `equals` and
  `hashCode` follow the Java (id-based).

## Quality bar
README gates; 100% coverage; functions ≤ 30 NLOC, CCN ≤ 10; `@see` on every class.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No layout provider implementations; no `RecursiveGraphLayoutEngine` (mission 5).
