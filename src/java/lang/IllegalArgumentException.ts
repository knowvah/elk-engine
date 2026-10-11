// SPDX-License-Identifier: EPL-2.0

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/IllegalArgumentException.html */
export class IllegalArgumentException extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'IllegalArgumentException';
  }
}
