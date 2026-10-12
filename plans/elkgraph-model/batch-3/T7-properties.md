<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — Property, MapPropertyHolder, PropertyHolderComparator, GraphFeature, annotations, ElkReflect

**Agent:** typescript-pro · **Commit:** `feat(graph): port the property system and elkreflect`

## Context
`Property` is every layout option's key (id-based equality, cloned defaults via `ElkReflect`);
`MapPropertyHolder` is the base of every algorithm's internal graph (collections site V1, a real
`HashMap`). The Java `PropertyTest` (core.test) is the spec and is ported in full (user decision).

## Task
TDD: port `PropertyTest.java` (132 lines) first as `Property.test.ts`, registering the cloners
the Java `LayoutMetaDataService.java:125-156` registers (`KVector`, `KVectorChain`, `ElkMargin`,
`ElkPadding`, `Array` for `ArrayList`/`LinkedList`, `Set` for `HashSet`/`LinkedHashSet`/`TreeSet`
snapshot) in `beforeAll` (D6, temporary seam — journal it). `IndividualSpacings` is not ported yet:
omit that one registration and say so in the test. Then port, keeping Java method order:
- `Property` (5 constructors → one constructor with overload signatures; `NEGATIVE_INFINITY`/
  `POSITIVE_INFINITY` as `Comparable<unknown>` objects whose `toString()` is `-∞`/`+∞`; `equals`
  via an `isIProperty` guard (`getId` function present); `hashCode` = `JavaString.hashCode(id)`;
  `compareTo` by `JavaString`-style string comparison; `getDefault` clones Cloneables).
- `MapPropertyHolder` on `JavaHashMap` with the exported `PROPERTY` strategy (D5); lazy map as in Java.
- `PropertyHolderComparator.with(property)`; `GraphFeature` enum (§6.3) with `getDescription()`.
- `AdvancedPropertyValue.ts` / `ExperimentalPropertyValue.ts`: registries (`markAdvanced(e)`,
  `isAdvanced(e)`, same for experimental) over `Ordinal` enum constants (D7).
- `ElkReflect`: `register`, `registerNewInstance`, `registerClone`, `newInstance(ctor)`,
  `clone(o)`, `isCloneable(o)` (D6); the static `EnumSet` registration as in Java.

## Write-set
`src/graph/properties/{Property,MapPropertyHolder,PropertyHolderComparator,GraphFeature,AdvancedPropertyValue,ExperimentalPropertyValue}.ts`,
`src/graph/util/ElkReflect.ts`, colocated `.test.ts` for each (`Property.test.ts` holds the ported
`PropertyTest` plus id-equality and bound cases).

## Read-set
- `../decisions.md#d5--property-maps`, `#d6--cloneable-and-elkreflect`, `#d7--enums-enumset-annotations`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/*.java`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkReflect.java`
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/graph/properties/PropertyTest.java`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutMetaDataService.java:120-160`
- `docs/translation-rules.md:342-353` (§6.1), `:395-400` (§6.6 guards)
- `src/java/util/{JavaHashMap,HashStrategy,EnumSet}.ts`, `src/java/lang/{JavaString,IllegalStateException}.ts`
- T3 interfaces, T4 enums, T5 `core.math` classes

## Interface contract (consumed by T8, T9, mission 3 `*Options`)
```ts
export const PROPERTY: HashStrategy<IProperty<unknown>>;   // hash = JavaString.hashCode(id); equals/compare by id
export class Property<T> implements IProperty<T>, Comparable<IProperty<unknown>> {
  constructor(id: string, defaultValue?: T, lowerBound?: Comparable<T> | null, upperBound?: Comparable<T> | null);
  static readonly NEGATIVE_INFINITY: Comparable<unknown>; static readonly POSITIVE_INFINITY: Comparable<unknown>;
  equals(o: unknown): boolean; hashCode(): number; toString(): string; compareTo(other: IProperty<unknown>): number; … }
export function isIProperty(o: unknown): o is IProperty<unknown>;
export class MapPropertyHolder implements IPropertyHolder { … }
export const ElkReflect = { register(ctor, newFun | null, cloneFun | null), registerNewInstance, registerClone,
  newInstance<T>(ctor: new () => T): T | null, clone<T>(o: T): T | null, isCloneable(o: unknown): boolean };
export function markAdvanced(e: Ordinal): void; export function isAdvanced(e: Ordinal | null): boolean; // + experimental twins
```
The Java `Property(IProperty other, T default)` overload is `Property.withDefault(other, value)`
(arity clash with `(id, default)`; note in `@see`).

## Acceptance criteria
- Given the ported `PropertyTest` with the `beforeAll` registrations, then every case passes:
  primitives identical (`===`), `KVector`/`KVectorChain`/`ElkPadding`/`ElkMargin`/lists/sets/
  `EnumSet` are distinct equal copies, an unknown Cloneable (`{ clone() {} }` object) throws
  `IllegalStateException` with the Java message.
- Given two `Property` instances with the same id, when used as `MapPropertyHolder` keys, then
  one entry; `hasProperty` is true for both; `getAllProperties()` has size 1.
- Given a value implementing `IPropertyValueProxy`, when `getProperty`, then the resolved value
  replaces the proxy in the map and is returned; when it resolves to `null`, the default is returned.
- Given `PropertyHolderComparator.with(p)` and holders valued 3, null, 1, when sorted, then 1, 3, null.
- Given `markAdvanced(X.A)`, then `isAdvanced(X.A)` is true, `isAdvanced(X.B)` and
  `isAdvanced(null)` are false.

## Quality bar
README gates; 100% coverage; functions ≤ 30 NLOC, CCN ≤ 10. `@see` on every symbol.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No `src/graph/impl/**` or `ElkGraphUtil` here. Do not add a `LayoutMetaDataService` stub (the
registrations live in the test only). Never weaken a ported assertion (STOP 8).
