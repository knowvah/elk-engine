// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../../../java/lang/RuntimeException.js';

/**
 * What `LazyLinkingResource.resolveLazyCrossReferences` reads from a `CancelIndicator`.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/CancelIndicator.java
 */
export interface CancelIndicator {
  isCanceled(): boolean;
}

/**
 * `CancelIndicator.NullImpl`: never canceled.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/CancelIndicator.java
 */
export const NULL_CANCEL_INDICATOR: CancelIndicator = { isCanceled: (): boolean => false };

/**
 * Port-local stand-in for the platform's `OperationCanceledException` that Xtext's
 * `OperationCanceledManager` throws (the Eclipse runtime class is not ported).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/service/OperationCanceledManager.java
 */
export class OperationCanceledException extends RuntimeException {
  constructor(message?: string) {
    super(message);
    this.name = 'OperationCanceledException';
  }
}

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

/**
 * Throws an {@link OperationCanceledException} when `indicator` reports cancellation.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/service/OperationCanceledManager.java#checkCanceled(CancelIndicator)
 */
export function checkCanceled(indicator: CancelIndicator): void {
  if (indicator.isCanceled()) {
    throw new OperationCanceledException();
  }
}

/**
 * Rethrows a cancellation as an {@link OperationCanceledError}; any other exception returns normally.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/service/OperationCanceledManager.java#propagateAsErrorIfCancelException(Throwable)
 */
export function propagateAsErrorIfCancelException(exception: unknown): void {
  if (exception instanceof OperationCanceledException) {
    throw new OperationCanceledError(exception);
  }
}
