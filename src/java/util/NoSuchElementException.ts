// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../lang/RuntimeException.js';

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/NoSuchElementException.html */
export class NoSuchElementException extends RuntimeException {
  constructor(message?: string) {
    super(message);
    this.name = 'NoSuchElementException';
  }
}
