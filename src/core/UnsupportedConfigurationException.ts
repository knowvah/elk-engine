// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../java/lang/RuntimeException.js';

/**
 * Exception thrown when a layout configuration is not supported. The three Java constructors (`()`, `(String)`, `(String, Throwable)`) collapse to
 * `(message?, cause?)` (translation-rules 6.5).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/UnsupportedConfigurationException.java
 */
export class UnsupportedConfigurationException extends RuntimeException {
  constructor(message?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'UnsupportedConfigurationException';
  }
}
