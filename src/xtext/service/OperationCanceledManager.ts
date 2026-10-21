// SPDX-License-Identifier: EPL-2.0
import { OperationCanceledException } from '../../equinox/core/runtime/OperationCanceledException.js';
import type { CancelIndicator } from '../util/CancelIndicator.js';
import { OperationCanceledError } from './OperationCanceledError.js';

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
