<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Comparable + graph.properties interfaces

**Agent:** typescript-pro · **Commit:** `feat(graph): add the property system interfaces`

## Context
`IProperty`, `IPropertyHolder`, `IPropertyValueProxy` are the contract every property holder and
every later `*Options` class implements. `Property` bounds are `Comparable<? super T>` with
sentinel infinities; `getAllProperties()` returns a `Map` in Java that two different containers
must satisfy here (D5).

## Task
Write the four interface files (type-only, no runtime code) and `Comparable`.

## Write-set
`src/java/lang/Comparable.ts`, `src/graph/properties/IProperty.ts`,
`src/graph/properties/IPropertyHolder.ts`, `src/graph/properties/IPropertyValueProxy.ts`,
`src/graph/properties/PropertyMap.ts`.

## Read-set
- `../decisions.md#d5--property-maps`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/{IProperty,IPropertyHolder,IPropertyValueProxy}.java`
- `src/guava/Sets.ts:12-24` (`Comparator`, `NaturallyOrdered`, `Ordinal` conventions)
- `src/java/util/JavaHashMap.ts:237-372` (public API the `PropertyMap` view must be satisfiable by)

## Interface contract (consumed by T7, T8, T9)
```ts
export interface Comparable<T> { compareTo(other: T): number }
export interface IProperty<T> { getDefault(): T; getId(): string;
  getLowerBound(): Comparable<T>; getUpperBound(): Comparable<T> }
export interface PropertyMap extends Iterable<[IProperty<unknown>, unknown]> {
  get(property: IProperty<unknown>): unknown | undefined; containsKey(property: IProperty<unknown>): boolean;
  isEmpty(): boolean; size(): number }
export interface IPropertyHolder {
  setProperty<T>(property: IProperty<T>, value: T | null): IPropertyHolder;   // null removes (Java semantics)
  getProperty<T>(property: IProperty<T>): T; hasProperty(property: IProperty<unknown>): boolean;
  copyProperties(holder: IPropertyHolder | null): IPropertyHolder; getAllProperties(): PropertyMap }
export interface IPropertyValueProxy { resolveValue<T>(property: IProperty<T>): T | null }
```
Java `IProperty<? super T>` in `setProperty` is simplified to `IProperty<T>` (TS has no lower
bounds); note it in the `@see`. `undefined`/`null`: `getProperty` may return `null` when the
default is `null` (Java), `get` on the map returns `undefined` for absent keys.

## Acceptance criteria
- Given the five files, when `npm run typecheck` runs, then exit 0.
- Given a test double `class P implements IProperty<number>`, then it compiles against the
  interface (covered by T7's tests; this task adds no `.test.ts` because the files are type-only).
- Given the module-globals fitness test, then no runtime `let`/side effects were added.

## Quality bar
README gates (typecheck + format:check). Every symbol carries `/** @see org.eclipse.elk.graph/src/…/<Name>.java */`.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No classes here (`Property`, `MapPropertyHolder` are T7). Do not add methods the Java interfaces
lack.
