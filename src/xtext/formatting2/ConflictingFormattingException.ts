// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../../java/lang/RuntimeException.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/ConflictingFormattingException.java */
export class ConflictingFormattingException extends RuntimeException {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ConflictingFormattingException';
  }
}
