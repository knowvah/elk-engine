// SPDX-License-Identifier: EPL-2.0
import { IndexOutOfBoundsException } from './IndexOutOfBoundsException.js';

/**
 * Thrown by `String` methods for an index that is negative or greater than the size of the string (for
 * `charAt`, also equal to it). Only the `String` constructor is ported; the `int` one has no caller.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringIndexOutOfBoundsException.html
 */
export class StringIndexOutOfBoundsException extends IndexOutOfBoundsException {
  constructor(message?: string) {
    super(message);
    this.name = 'StringIndexOutOfBoundsException';
  }
}
