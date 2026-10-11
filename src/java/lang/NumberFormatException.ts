// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from './IllegalArgumentException.js';

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/NumberFormatException.html */
export class NumberFormatException extends IllegalArgumentException {
  constructor(message?: string) {
    super(message);
    this.name = 'NumberFormatException';
  }
}
