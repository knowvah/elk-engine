<!-- SPDX-License-Identifier: EPL-2.0 -->

# T20 — `PropertyConstantsDelegator`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T20): port property constants delegator`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). This class swaps a property constant for an algorithm-specific one with the same id, so that
algorithm defaults apply. Nothing in ELK calls it (R1), and there is no Java test.
- The registry it reads, `LayoutMetaDataService` and `LayoutAlgorithmData`, has landed.
- `getKnownOptionIds()` is already JVM-ordered (inventory row V3).
- `IndividualSpacings.getIndividualOrInherited` landed with a merged `ElkNode | NodeAdapter` signature.

## Task
1. Port `J/util/PropertyConstantsDelegator.java`: `createEmpty`, `createForLayoutAlgorithmData`,
   `createForLayoutAlgorithmWithId`, `addDelegate`, `getPropertyOrDelegate`, the two `getProperty` overloads and the
   two `getIndividualOrInheritedProperty` overloads.
2. **`propertyDelegates`** is a `HashMap<IProperty, IProperty>`. `Property.equals` and `hashCode` compare by **id**,
   so a lookup with a *different* `Property` object of the same id must hit.
   - Use `JavaHashMap` with the `IProperty` (hashable) strategy, as row V2 does. A JS `Map` keyed by object identity
     would be wrong. Lookups only, so order is irrelevant; journal the choice.
3. **Overloads:**
   - `getProperty(IPropertyHolder | GraphElementAdapter, property)` has the same body in both Java overloads, so use
     one implementation with a union parameter (§6.5).
   - `getIndividualOrInheritedProperty(ElkNode | NodeAdapter, property)` delegates to the landed merged
     `IndividualSpacings.getIndividualOrInherited`.
4. In `createForLayoutAlgorithmData`, each known option becomes `new Property<unknown>(optionId,
   algorithmData.getDefaultValue(optionId))`, in `getKnownOptionIds()` order.
5. Write unit tests:
   - with a registered stub algorithm, whose id must not end in a core suffix (M14), and a known option with an
     algorithm-specific default, `getProperty(holder, CoreOptions.X)` returns that default when unset;
   - `createForLayoutAlgorithmWithId('unknown')` returns an empty delegator;
   - delegation through an adapter and through `getIndividualOrInheritedProperty`.

## Write-set
`src/core/util/PropertyConstantsDelegator.ts`, colocated test.

## Read-set
- `J/util/PropertyConstantsDelegator.java`.
- `src/core/data/{LayoutMetaDataService,LayoutAlgorithmData}.ts`, `src/core/util/IndividualSpacings.ts`,
  `src/core/util/adapters/GraphAdapters.ts`.
- `src/graph/properties/Property.ts`, `src/java/util/{JavaHashMap,HashStrategy}.ts`, `test/helpers/layout-provider-stubs.ts`.
- `docs/translation-rules-collections.md` (V2, V3).

## Interface contracts (outputs)
- `PropertyConstantsDelegator.createEmpty()`, `.createForLayoutAlgorithmData(data)`,
  `.createForLayoutAlgorithmWithId(id)`.
- `addDelegate(p): this`, `getPropertyOrDelegate(p)`, `getProperty(holderOrAdapter, p)`,
  `getIndividualOrInheritedProperty(nodeOrAdapter, p)`.

## Acceptance criteria
- Given a delegate for id `x` and a lookup with a different `Property` object whose id is `x`, when
  `getPropertyOrDelegate` runs, then the delegate is returned (id equality).
- Given an algorithm whose known option has a default that differs from the core default, when `getProperty` reads
  an unset holder, then the algorithm default is returned.
- Given `createForLayoutAlgorithmWithId` with an unregistered id, when called, then an empty delegator is returned,
  and `getPropertyOrDelegate(p)` returns `p` itself.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
