// SPDX-License-Identifier: EPL-2.0

/**
 * The failure of serialising an ElkGraph to `.elkj`: the TypeScript counterpart of the `RuntimeException` that
 * `ISerializationDiagnostic.EXCEPTION_THROWING_ACCEPTOR` throws for the first serialisation diagnostic (a violated
 * upper bound such as edge sections, a value the sequencer cannot place, a value converter error, a cross reference
 * that is not in scope). Callers match on presence only (D3); the message names the offending object and what to
 * change.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/diagnostic/ISerializationDiagnostic.java
 */
export class ElkGraphJsonSerializationError extends Error {
  constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message, options);
    this.name = 'ElkGraphJsonSerializationError';
  }
}
