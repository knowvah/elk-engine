// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../../java/lang/RuntimeException.js';

/**
 * Thrown by `guard`/`checkDone` to end a check early without reporting anything; the validator
 * swallows it. Package-private in Java.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/GuardException.java
 */
export class GuardException extends RuntimeException {
  constructor() {
    super();
    this.name = 'GuardException';
  }
}
