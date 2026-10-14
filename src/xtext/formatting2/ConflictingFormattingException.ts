// SPDX-License-Identifier: EPL-2.0

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/ConflictingFormattingException.java */
export class ConflictingFormattingException extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ConflictingFormattingException';
  }
}
