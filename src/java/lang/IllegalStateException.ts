// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from './RuntimeException.js';

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/IllegalStateException.html */
export class IllegalStateException extends RuntimeException {
  constructor(message?: string) {
    super(message);
    this.name = 'IllegalStateException';
  }
}
