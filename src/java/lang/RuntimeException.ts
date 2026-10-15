// SPDX-License-Identifier: EPL-2.0
import { Exception } from './Exception.js';

/**
 * The parent of Java's unchecked exceptions (AD-16a). A ported `catch (RuntimeException e)` stays a catch-all,
 * because the port's `TypeError` for Java's `NullPointerException` (D10) is not under this class.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/RuntimeException.html
 */
export class RuntimeException extends Exception {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RuntimeException';
  }
}
