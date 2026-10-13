<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — `Pair`, `ExclusiveBounds`, `IFactory`, `InstancePool`, `GraphAdapters`

**Agent:** typescript-pro · **Commit:** `feat(T3): add pair, exclusive bounds, instance pool and graph adapters`

## Context
`LayoutOptionData` (T8) uses `Pair` and bound checks; `.melk` lower bounds use
`ExclusiveBounds.greaterThan(…)`; `LayoutAlgorithmData` (T10) holds an `InstancePool` built from an
`IFactory`; `IndividualSpacings` (T14) takes a `GraphAdapters.NodeAdapter`.

## Task
TDD. Port `Pair` (with `equals`/`hashCode`/`toString`, comparators and any static helpers),
`ExclusiveBounds` (`greaterThan`, `lessThan`, their nested bound classes kept in the file per C3),
`IFactory`, `InstancePool`, and `adapters/GraphAdapters` (interfaces only; Java nested interfaces
become exported TS interfaces in one file, reachable as `GraphAdapters.NodeAdapter` per C3 — a
type-only namespace is acceptable, journal the form). `hashCode` uses the existing
`src/java/lang` helpers.

## Write-set
`src/core/util/{Pair,ExclusiveBounds,IFactory,InstancePool}.ts`,
`src/core/util/adapters/GraphAdapters.ts`, and a `.test.ts` for `Pair`, `ExclusiveBounds`,
`InstancePool`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/util/{Pair,ExclusiveBounds,IFactory,InstancePool}.java`
- `…/core/util/adapters/GraphAdapters.java`
- `docs/translation-rules.md` §6.1 (`equals`/`hashCode`), §6.4 (nested classes)
- `src/java/lang/{JavaDouble,JavaString}.ts` (hash helpers)

## Interface contract (consumed by T8, T10, T14)
```ts
class Pair<F, S> implements Iterable<unknown> { constructor(first?: F, second?: S); static create(); static of(f, s);
  static fromMap(map); static FirstComparator; static SecondComparator; getFirst(); getSecond();
  setFirst(); setSecond(); equals(o: unknown): boolean; hashCode(): number; toString(): string; clear() }
class ExclusiveBounds { static greaterThan(n: number): Comparable<number>; static lessThan(n: number): Comparable<number>;
  static ExclusiveLowerBound; static ExclusiveUpperBound }   // nested classes stay in the file (C3)
interface IFactory<T> { create(): T; destroy(obj: T): void }
class InstancePool<T> { static INFINITE = -1; constructor(factory: IFactory<T>, limit?: number); fetch(): T; release(obj: T): void; clear(): void }
```
Names follow the Java exactly (`Pair.java:45-267`, `ExclusiveBounds.java:24-140`,
`InstancePool.java:29-106`); the `Pair(Entry)` constructor overload follows translation-rules §6.5.

## Acceptance criteria
- Given `ExclusiveBounds.greaterThan(0)`, when compared with `0` and `Double.MIN_VALUE`, then the
  results are "not satisfied" and "satisfied" per the Java `compareTo` contract.
- Given an `InstancePool` with limit 2, when fetching three, releasing all, then fetching again,
  then reuse order and `destroy` calls match the Java.
- Given two equal `Pair`s, then `equals` is true and `hashCode` equal; `toString` matches the Java
  format.

## Quality bar
README gates; 100% coverage of the classes with bodies; functions ≤ 30 NLOC; `@see` on every class.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No other `core.util` classes (`ElkUtil` is T5, `IndividualSpacings` is T14).
