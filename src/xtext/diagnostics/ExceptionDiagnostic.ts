// SPDX-License-Identifier: EPL-2.0
import type { Diagnostic } from './Diagnostic.js';

const EXCEPTION_LENGTH = 1;
const EXCEPTION_LINE = 1;

/**
 * The error `LazyLinkingResource.getEObject(String)` adds when resolving a fragment throws. `getColumn`, `getColumnEnd`, `getLineEnd` and `getLocation` are not ported (no `Diagnostic` member of the
 * port carries them). Java's `getSimpleName()` is the exception's `name`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/diagnostics/ExceptionDiagnostic.java
 */
export class ExceptionDiagnostic implements Diagnostic {
  readonly #exception: Error;

  constructor(exception: Error) {
    this.#exception = exception;
  }

  getLength(): number {
    return EXCEPTION_LENGTH;
  }

  getOffset(): number {
    return 0;
  }

  getLine(): number {
    return EXCEPTION_LINE;
  }

  getMessage(): string {
    return `${this.#exception.name}: ${this.#exception.message} (see logs for details)`;
  }

  toString(): string {
    return this.getMessage();
  }

  getException(): Error {
    return this.#exception;
  }
}
