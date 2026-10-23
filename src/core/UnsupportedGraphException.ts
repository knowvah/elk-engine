// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../java/lang/RuntimeException.js';

/**
 * Exception thrown when a graph is not supported by a layout algorithm. The three Java constructors (`()`, `(String)`, `(String, Throwable)`) collapse to
 * `(message?, cause?)` (translation-rules 6.5).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/UnsupportedGraphException.java
 */
export class UnsupportedGraphException extends RuntimeException {
  constructor(message?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'UnsupportedGraphException';
  }
}
