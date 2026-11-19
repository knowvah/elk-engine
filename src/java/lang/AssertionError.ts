// SPDX-License-Identifier: EPL-2.0

/**
 * Thrown by a failed `assert` ({@link devAssert}). Java's parent is `java.lang.Error`, which the port does not
 * model: the JS `Error` stands in for `Throwable` (AD-16a), so this class is outside `Exception` and a ported
 * `catch (Exception e)` does not catch it, as in Java. The detail message is the string conversion of the assert's
 * detail expression; without one the message is empty (Java: `null`).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/AssertionError.html
 */
export class AssertionError extends Error {
  constructor(detailMessage?: string) {
    super(detailMessage);
    this.name = 'AssertionError';
  }
}
