// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../../../java/lang/RuntimeException.js';

/**
 * Dedicated exception indicating that no spacing value could be determined for a certain set of graph elements. This
 * is probably due to a programming error. Java's nested `Spacings.UnspecifiedSpacingException` (M15 file naming); its
 * no-argument and message constructors are one constructor with an optional message.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/Spacings.java
 */
export class UnspecifiedSpacingException extends RuntimeException {
  constructor(msg?: string) {
    super(msg);
    this.name = 'UnspecifiedSpacingException';
  }
}
