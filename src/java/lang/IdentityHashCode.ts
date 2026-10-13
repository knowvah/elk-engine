// SPDX-License-Identifier: EPL-2.0

/**
 * Per-object identity hash codes. The JVM's values are implementation-defined and not reproducible,
 * so this hands out a stable per-object int from a counter instead (divergence journaled).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/System.html#identityHashCode(java.lang.Object)
 */
class IdentityHashCodes {
  static readonly #codes = new WeakMap<object, number>();
  static #next = 1;

  static of(o: object): number {
    let code = IdentityHashCodes.#codes.get(o);
    if (code === undefined) {
      code = IdentityHashCodes.#next;
      IdentityHashCodes.#next += 1;
      IdentityHashCodes.#codes.set(o, code);
    }
    return code;
  }
}

/**
 * `System.identityHashCode`: the same value for the same object on every call. Distinct objects get
 * distinct values (the Javadoc does not require that, the counter provides it).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/System.html#identityHashCode(java.lang.Object)
 */
export function identityHashCode(o: object): number {
  return IdentityHashCodes.of(o);
}
