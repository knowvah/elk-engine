// SPDX-License-Identifier: EPL-2.0

/**
 * A Java enum constant in this port: it exposes its declaration index as `ordinal()`. Structurally
 * identical to `Ordinal` in `src/guava/Sets.ts`; redeclared because `src/java` imports only `src/java`.
 */
export interface Ordinal {
  ordinal(): number;
}

/** The class object of a Java enum: its `values()` lists every constant in declaration order. */
export interface EnumClass<E extends Ordinal> {
  values(): readonly E[];
}

/**
 * A set of constants of one enum, iterated in ordinal (declaration) order and backed by one flag
 * per constant. Written from the JDK 21 Javadoc only (AD-9): iteration order is the natural order of
 * the enum constants, the set is not synchronized, and `equals` is set equality.
 *
 * Java's `Class<E>` argument is the enum class object here (it carries a static `values()`); `of`
 * derives it from `first.constructor`, so every ported enum is a class exposing `static values()`.
 * Wrong-enum arguments (a `ClassCastException` in Java) are ruled out by the type system; `contains`
 * answers `false` for them, as Java does.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/EnumSet.html
 */
export class EnumSet<E extends Ordinal> implements Iterable<E> {
  readonly #universe: readonly E[];
  readonly #present: boolean[];

  private constructor(universe: readonly E[], present: boolean[]) {
    this.#universe = universe;
    this.#present = present;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/EnumSet.html#allOf(java.lang.Class) */
  static allOf<E extends Ordinal>(enumClass: EnumClass<E>): EnumSet<E> {
    const universe = enumClass.values();
    return new EnumSet(
      universe,
      universe.map(() => true),
    );
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/EnumSet.html#noneOf(java.lang.Class) */
  static noneOf<E extends Ordinal>(enumClass: EnumClass<E>): EnumSet<E> {
    const universe = enumClass.values();
    return new EnumSet(
      universe,
      universe.map(() => false),
    );
  }

  /**
   * The varargs overloads `of(E)`, `of(E, E)` ... `of(E first, E... rest)` in one signature; the
   * enum class is taken from `first.constructor`.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/EnumSet.html#of(E,E...)
   */
  static of<E extends Ordinal>(first: E, ...rest: E[]): EnumSet<E> {
    const result = EnumSet.noneOf((first as object).constructor as unknown as EnumClass<E>);
    result.add(first);
    for (const element of rest) {
      result.add(element);
    }
    return result;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/EnumSet.html#copyOf(java.util.EnumSet) */
  static copyOf<E extends Ordinal>(set: EnumSet<E>): EnumSet<E> {
    return set.clone();
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Set.html#add(E) */
  add(e: E): boolean {
    const index = e.ordinal();
    const added = !this.#present[index];
    this.#present[index] = true;
    return added;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Set.html#remove(java.lang.Object) */
  remove(e: E): boolean {
    if (!this.contains(e)) {
      return false;
    }
    this.#present[e.ordinal()] = false;
    return true;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Set.html#contains(java.lang.Object) */
  contains(e: E): boolean {
    const index = e.ordinal();
    return this.#universe[index] === e && this.#present[index] === true;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Set.html#size() */
  size(): number {
    return this.#present.filter(Boolean).length;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Set.html#isEmpty() */
  isEmpty(): boolean {
    return this.size() === 0;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Set.html#clear() */
  clear(): void {
    this.#present.fill(false);
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/EnumSet.html#clone() */
  clone(): EnumSet<E> {
    return new EnumSet(this.#universe, [...this.#present]);
  }

  /**
   * Set equality: `o` is an `EnumSet` with the same elements. Sets over different enums are equal
   * only when both are empty.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Set.html#equals(java.lang.Object)
   */
  equals(o: unknown): boolean {
    if (!(o instanceof EnumSet)) {
      return false;
    }
    const other = o as EnumSet<E>;
    return this.size() === other.size() && [...this].every((element) => other.contains(element));
  }

  /**
   * The elements in iteration (ordinal) order, each as `String.valueOf`, separated by `", "` and
   * enclosed in square brackets.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/AbstractCollection.html#toString()
   */
  toString(): string {
    return '[' + [...this].map((element) => String(element)).join(', ') + ']';
  }

  *[Symbol.iterator](): Iterator<E> {
    for (const [index, element] of this.#universe.entries()) {
      if (this.#present[index]) {
        yield element;
      }
    }
  }
}
