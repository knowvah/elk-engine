// SPDX-License-Identifier: EPL-2.0

/**
 * The root of the Java exceptions a program may catch; the JS `Error` stands in for `Throwable` (AD-16a).
 * `options.cause` carries Java's `Throwable cause`.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Exception.html
 */
export class Exception extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'Exception';
  }
}
