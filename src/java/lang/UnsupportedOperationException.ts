// SPDX-License-Identifier: EPL-2.0

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/UnsupportedOperationException.html */
export class UnsupportedOperationException extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'UnsupportedOperationException';
  }
}
