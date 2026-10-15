// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from './RuntimeException.js';

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/IndexOutOfBoundsException.html */
export class IndexOutOfBoundsException extends RuntimeException {
  constructor(message?: string) {
    super(message);
    this.name = 'IndexOutOfBoundsException';
  }
}
