// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from './RuntimeException.js';

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/UnsupportedOperationException.html */
export class UnsupportedOperationException extends RuntimeException {
  constructor(message?: string) {
    super(message);
    this.name = 'UnsupportedOperationException';
  }
}
