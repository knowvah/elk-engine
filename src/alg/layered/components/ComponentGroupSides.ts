// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../core/options/PortSide.js';
import type { ImmutableSet } from '../../../guava/ImmutableSet.js';
import type { HashStrategy } from '../../../java/util/HashStrategy.js';
import { EnumSet } from '../../../java/util/EnumSet.js';

/** The `PortSide.SIDES_*` constants a constraint row names, without the `SIDES_` prefix. */
export type SideSetName =
  | 'NONE'
  | 'NORTH'
  | 'EAST'
  | 'SOUTH'
  | 'WEST'
  | 'NORTH_SOUTH'
  | 'EAST_WEST'
  | 'NORTH_WEST'
  | 'NORTH_EAST'
  | 'SOUTH_WEST'
  | 'EAST_SOUTH'
  | 'NORTH_EAST_WEST'
  | 'EAST_SOUTH_WEST'
  | 'NORTH_SOUTH_WEST'
  | 'NORTH_EAST_SOUTH'
  | 'NORTH_EAST_SOUTH_WEST';

/** One `CONSTRAINTS.put(key, value)` of `ComponentGroup` / `ModelOrderComponentGroup`. */
export type ConstraintRow = readonly [key: SideSetName, value: SideSetName];

/** A `Set<PortSide>` as the component groups see it: the `EnumSet` of a graph's property or a `PortSide.SIDES_*` set. */
export type PortSideSet = EnumSet<PortSide> | ImmutableSet<PortSide>;

/**
 * Java's `HashMultimap<Set<PortSide>, Set<PortSide>>` as a lookup table: the Java only calls `get(key)` and tests the
 * values for existing components (F11), so the table is keyed by the bit mask of the key set and keeps the value sets
 * in `put` order. No hash order is involved.
 */
export type ConstraintTable = ReadonlyMap<number, readonly EnumSet<PortSide>[]>;

/** Java `Set<PortSide>` equality over either set type, as an `EnumSet`. */
export function toSideSet(sides: PortSideSet): EnumSet<PortSide> {
  if (sides instanceof EnumSet) {
    return sides;
  }
  const result = EnumSet.noneOf(PortSide);
  for (const side of sides) {
    result.add(side);
  }
  return result;
}

/** The `PortSide.SIDES_*` constant of a row as an `EnumSet`. */
export function sidesNamed(name: SideSetName): EnumSet<PortSide> {
  const key = `SIDES_${name}` as const;
  return toSideSet(PortSide[key]);
}

function maskOf(sides: EnumSet<PortSide>): number {
  let mask = 0;
  for (const side of sides) {
    mask |= 1 << side.ordinal();
  }
  return mask;
}

/** Builds the lookup table of a `static { ... put ... }` block, rows in Java order. */
export function buildConstraintTable(rows: readonly ConstraintRow[]): ConstraintTable {
  const table = new Map<number, EnumSet<PortSide>[]>();
  for (const [key, value] of rows) {
    const mask = maskOf(sidesNamed(key));
    const values = table.get(mask) ?? [];
    table.set(mask, values);
    const valueSet = sidesNamed(value);
    if (!values.some((existing) => existing.equals(valueSet))) {
      values.push(valueSet);
    }
  }
  return table;
}

/** Java `Multimap.get(key)` on a constraint table: the value sets of the key, empty when it has none. */
export function constraintsFor(table: ConstraintTable, key: PortSideSet): readonly EnumSet<PortSide>[] {
  return table.get(maskOf(toSideSet(key))) ?? [];
}

/**
 * The key protocol of `ComponentGroup.components` (`ArrayListMultimap<Set<PortSide>, LGraph>`). `Set.hashCode` is the sum
 * of the element hashes; a `PortSide` is an enum constant with the identity hash, which is the constant 1 under the
 * oracle's `-XX:hashCode=2`, so the hash of a set is its size. The key order of `keys()` / `values()` follows from that.
 * Decision FX3 (user, mission 7f): insertion order, AD-10's default, fails three `combine` rows in `layerless` order.
 */
export const SIDE_SET_STRATEGY: HashStrategy<EnumSet<PortSide>> = {
  hash: (sides) => sides.size(),
  equals: (a, b) => a.equals(b),
};
