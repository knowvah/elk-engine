// SPDX-License-Identifier: EPL-2.0

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/IllegalStateException.html */
export class IllegalStateException extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'IllegalStateException';
  }
}
