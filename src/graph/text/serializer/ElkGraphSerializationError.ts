// SPDX-License-Identifier: EPL-2.0

/**
 * The failure of serialising an ElkGraph: the TypeScript counterpart of the `RuntimeException` that
 * `ISerializationDiagnostic.EXCEPTION_THROWING_ACCEPTOR` throws for the first serialisation diagnostic (a missing
 * required value, a violated lower bound, a value converter error, a cross reference that is not in scope).
 * Callers match on presence only (G2); the message names the offending object and what to change.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/diagnostic/ISerializationDiagnostic.java
 */
export class ElkGraphSerializationError extends Error {
  constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message, options);
    this.name = 'ElkGraphSerializationError';
  }
}
