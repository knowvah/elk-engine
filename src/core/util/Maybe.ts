// SPDX-License-Identifier: EPL-2.0
import * as DoubleToString from '../../java/lang/DoubleToString.js';
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import * as JavaDouble from '../../java/lang/JavaDouble.js';
import * as JavaInteger from '../../java/lang/JavaInteger.js';
import * as JavaString from '../../java/lang/JavaString.js';
import { NoSuchElementException } from '../../java/util/NoSuchElementException.js';

/** The Java `Boolean.hashCode()` values. */
const BOOLEAN_TRUE_HASH = 1231;
const BOOLEAN_FALSE_HASH = 1237;

function hasMethod(o: object, name: 'equals' | 'hashCode'): boolean {
  return name in o && typeof (o as Record<string, unknown>)[name] === 'function';
}

function isInt32(a: number): boolean {
  return Number.isInteger(a) && (a | 0) === a;
}

/** Java `a.equals(b)` for a non-null element: value `equals` when defined, else identity. */
function elementEquals(a: unknown, b: unknown): boolean {
  if (typeof a === 'object' && a !== null && hasMethod(a, 'equals')) {
    return (a as { equals(o: unknown): boolean }).equals(b);
  }
  return Object.is(a, b);
}

/**
 * Java `hashCode()` of a non-null element. A number is an `Integer` when it is an int32 and a
 * `Double` otherwise: the two classes cannot be told apart at run time.
 */
function elementHash(a: unknown): number {
  switch (typeof a) {
    case 'string':
      return JavaString.hashCode(a);
    case 'number':
      return isInt32(a) ? JavaInteger.hashCode(a) : JavaDouble.hashCode(a);
    case 'boolean':
      return a ? BOOLEAN_TRUE_HASH : BOOLEAN_FALSE_HASH;
    default:
      return hasMethod(a as object, 'hashCode')
        ? (a as { hashCode(): number }).hashCode()
        : identityHashCode(a as object);
  }
}

/** Java `toString()` of a non-null element; numbers as in {@link elementHash}. */
function elementToString(a: unknown): string {
  if (typeof a === 'number' && !isInt32(a)) {
    return DoubleToString.toString(a);
  }
  return String(a);
}

/**
 * The Java anonymous `Iterator`: yields the contained object once; `remove` clears the maybe.
 * Both read and write the maybe's current object, as the Java inner class does.
 */
class MaybeIterator<T> {
  private visited = false;

  constructor(private readonly maybe: Maybe<T>) {}

  hasNext(): boolean {
    return !this.visited && this.maybe.get() !== null;
  }

  next(): T {
    const object = this.maybe.get();
    if (this.visited || object === null) {
      throw new NoSuchElementException();
    }
    this.visited = true;
    return object;
  }

  remove(): void {
    if (!this.visited || this.maybe.get() === null) {
      throw new IllegalStateException();
    }
    this.maybe.set(null);
  }
}

/**
 * Object that may contain another object, inspired by the Haskell type <i>Maybe</i>. The contained
 * object is `null` when unset, as in Java.
 *
 * The two Java constructors are one: no argument or the object to contain, told apart by argument
 * count (6.5). The Java `Iterable<T>` is both `iterator()` (with `hasNext`/`next`/`remove`) and
 * `[Symbol.iterator]`; `remove` is not reachable through the latter.
 *
 * @param <T> type of contained object
 * @author msp
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/Maybe.java
 */
export class Maybe<T> implements Iterable<T> {
  /** the contained object, which may be `null`. */
  private object: T | null = null;

  /** Creates a maybe without an object. */
  constructor();
  /** Creates a maybe with the given object. */
  constructor(theobject: T | null);
  constructor(...args: [] | [T | null]) {
    if (args.length === 1) {
      this.object = args[0];
    }
  }

  /**
   * Create a maybe with inferred generic type.
   *
   * @returns a new instance of given type
   */
  static create<D>(): Maybe<D> {
    return new Maybe<D>();
  }

  equals(obj: unknown): boolean {
    if (obj instanceof Maybe) {
      const other = obj as Maybe<unknown>;
      return this.object === null ? other.object === null : elementEquals(this.object, other.object);
    }
    return false;
  }

  hashCode(): number {
    return this.object === null ? 0 : elementHash(this.object);
  }

  toString(): string {
    return this.object === null ? 'maybe(null)' : `maybe(${elementToString(this.object)})`;
  }

  /** @param theobject the object to set */
  set(theobject: T | null): void {
    this.object = theobject;
  }

  /** @returns the contained object */
  get(): T | null {
    return this.object;
  }

  /** @returns an iterator over the contained object, if any */
  iterator(): MaybeIterator<T> {
    return new MaybeIterator<T>(this);
  }

  *[Symbol.iterator](): Iterator<T> {
    if (this.object !== null) {
      yield this.object;
    }
  }

  /** Clear any contained object. */
  clear(): void {
    this.object = null;
  }

  /** @returns false if an object instance is contained, true otherwise */
  isEmpty(): boolean {
    return this.object === null;
  }
}
