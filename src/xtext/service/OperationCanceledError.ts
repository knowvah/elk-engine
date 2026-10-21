// SPDX-License-Identifier: EPL-2.0

/**
 * Stand-in for `OperationCanceledError`: the `Error` an `OperationCanceledException` is rethrown as,
 * so that a `catch (RuntimeException)` does not swallow the cancellation.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/service/OperationCanceledError.java
 */
export class OperationCanceledError extends Error {
  constructor(cause: unknown) {
    super('operation canceled', { cause });
    this.name = 'OperationCanceledError';
  }
}
