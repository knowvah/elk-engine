// SPDX-License-Identifier: EPL-2.0
import { IndexOutOfBoundsException } from './IndexOutOfBoundsException.js';

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ArrayIndexOutOfBoundsException.html */
export class ArrayIndexOutOfBoundsException extends IndexOutOfBoundsException {
  constructor(message?: string) {
    super(message);
    this.name = 'ArrayIndexOutOfBoundsException';
  }
}
