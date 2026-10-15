// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../../java/lang/RuntimeException.js';

/**
 * Exception indicating that something is wrong with a passed json. The four Java constructors
 * (`()`, `(String)`, `(Throwable)`, `(String, Throwable)`) collapse to `(message?, cause?)`
 * (translation-rules 6.5); `new JsonImportException(cause)` has no TS form (its message would be
 * `cause.toString()`) and no caller.
 *
 * @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonImportException.xtend
 */
export class JsonImportException extends RuntimeException {
  constructor(message?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'JsonImportException';
  }
}
