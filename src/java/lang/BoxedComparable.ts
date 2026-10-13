// SPDX-License-Identifier: EPL-2.0
import { ClassCastException } from './ClassCastException.js';
import type { Comparable } from './Comparable.js';
import { compare as doubleCompare } from './DoubleCompare.js';
import * as JavaString from './JavaString.js';

/**
 * A bound that is a `number`, `string` or `boolean`: Java `Integer`, `Double`, `String` and `Boolean`
 * are `Comparable`, their JavaScript counterparts have no `compareTo`. {@link BoxedComparable.value}
 * is the bound itself.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Comparable.html
 */
export class BoxedComparable implements Comparable<unknown> {
  readonly value: number | string | boolean;

  constructor(value: number | string | boolean) {
    this.value = value;
  }

  compareTo(other: unknown): number {
    const mine = this.value;
    if (typeof mine === 'number' && typeof other === 'number') {
      return doubleCompare(mine, other);
    } else if (typeof mine === 'string' && typeof other === 'string') {
      return JavaString.compareTo(mine, other);
    } else if (typeof mine === 'boolean' && typeof other === 'boolean') {
      return Number(mine) - Number(other);
    }
    throw new ClassCastException(`Cannot compare ${typeof mine} with ${typeof other}`);
  }

  toString(): string {
    return String(this.value);
  }
}

/** Java `instanceof Comparable<?>` for a bound; primitives are wrapped in a {@link BoxedComparable}. */
export function asComparable(bound: unknown): Comparable<unknown> | null {
  if (typeof bound === 'number' || typeof bound === 'string' || typeof bound === 'boolean') {
    return new BoxedComparable(bound);
  }
  const compareTo = typeof bound === 'object' && bound !== null ? (bound as { compareTo?: unknown }).compareTo : null;
  return typeof compareTo === 'function' ? (bound as Comparable<unknown>) : null;
}
