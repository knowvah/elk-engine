<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — EnumSet shim + PortSide, Direction, SizeConstraint

**Agent:** typescript-pro · **Commit:** `feat(core): add enumset shim and the portside, direction and sizeconstraint enums`

## Context
The ported `PropertyTest` (T7) needs `PortSide.EAST` and `EnumSet.allOf(SizeConstraint)`;
`PortSide.fromDirection` needs `Direction`. `ElkReflect` clones `EnumSet` by `instanceof` (D6).
Enums follow translation-rules §6.3; `EnumSet` follows the JDK 21 Javadoc only (AD-9).

## Task
TDD. Create `EnumSet` (ordinal-ordered, backed by a boolean/bit array sized by `values().length`),
then the three enums as classes with `static readonly` instances in declaration order. Port every
`PortSide` constant set (`SIDES_*`, 16 of them, via `Sets.immutableEnumSetOf`/`immutableEnumSet`),
`right()`, `left()`, `opposed()`, `areAdjacent`, `fromDirection`, `isVertical`, `isHorizontal`;
`Direction.isHorizontal/isVertical/opposite`; `SizeConstraint.fixed/minimumSize/
minimumSizeWithPorts/free`.

## Write-set
`src/java/util/EnumSet.ts`, `src/core/options/PortSide.ts`, `src/core/options/Direction.ts`,
`src/core/options/SizeConstraint.ts`, and one colocated `.test.ts` per file.

## Read-set
- `../decisions.md#d7--enums-enumset-annotations`
- `docs/translation-rules.md:361-369` (§6.3 enums)
- `src/guava/Sets.ts:12-24,100-125` (`Ordinal`, `immutableEnumSet*`)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/options/{PortSide,Direction,SizeConstraint}.java`
- JDK 21 Javadoc `java.util.EnumSet` (WebFetch)

## Interface contract (consumed by T7)
```ts
export interface EnumClass<E extends Ordinal> { values(): readonly E[] }
export class EnumSet<E extends Ordinal> implements Iterable<E> {
  static allOf<E extends Ordinal>(enumClass: EnumClass<E>): EnumSet<E>;
  static noneOf<E extends Ordinal>(enumClass: EnumClass<E>): EnumSet<E>;
  static of<E extends Ordinal>(first: E, ...rest: E[]): EnumSet<E>;
  static copyOf<E extends Ordinal>(set: EnumSet<E>): EnumSet<E>;
  add(e: E): boolean; remove(e: E): boolean; contains(e: E): boolean; size(): number; isEmpty(): boolean;
  clear(): void; clone(): EnumSet<E>; equals(o: unknown): boolean; [Symbol.iterator](): Iterator<E>;
}
// Enum shape (each enum): static readonly NORTH: PortSide …; static values(): readonly PortSide[];
// static valueOf(name: string): PortSide; ordinal(): number; name(): string; toString(): string;
// compareTo(other: PortSide): number
```
`of(...)` needs the enum class for sizing: derive it from `first.constructor` (document).
`equals` is set equality (same elements).

## Acceptance criteria
- Given `EnumSet.of(PortSide.WEST, PortSide.NORTH)`, when iterated, then `NORTH, WEST`.
- Given `EnumSet.allOf(SizeConstraint)`, then size 4 and `clone()` is a distinct equal set.
- Given `PortSide.NORTH`, then `right()` is `EAST`, `left()` is `WEST`, `opposed()` is `SOUTH`;
  `UNDEFINED.right()` is `UNDEFINED`; `SIDES_NORTH_EAST` contains exactly `NORTH`, `EAST`.
- Given `SizeConstraint.minimumSizeWithPorts()`, then equals `EnumSet.of(PORTS, MINIMUM_SIZE)`;
  `fixed()` is empty.
- Given `PortSide.fromDirection(Direction.LEFT)`, then `WEST`; `Direction.UP.opposite()` is `DOWN`.

## Quality bar
README gates; 100% coverage; functions ≤ 30 NLOC, CCN ≤ 10. `@see` paths on every class.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No other `core.options` enums (they arrive with the `.melk` codegen, mission 3). Do not change
`src/guava/Sets.ts`.
