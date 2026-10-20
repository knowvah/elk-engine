// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../../../java/lang/RuntimeException.js';

/**
 * Equinox `OperationCanceledException`, thrown by Xtext's `OperationCanceledManager`.
 *
 * @see org.eclipse.equinox.common/src/org/eclipse/core/runtime/OperationCanceledException.java
 */
export class OperationCanceledException extends RuntimeException {
  constructor(message?: string) {
    super(message);
    this.name = 'OperationCanceledException';
  }
}
