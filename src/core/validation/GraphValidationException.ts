// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../../java/lang/RuntimeException.js';
import type { GraphIssue } from './GraphIssue.js';

/**
 * Exception thrown when a graph fails validation, optionally carrying the issues found. The Java
 * constructors `()`, `(String)` and `(String, Collection)` collapse to `(message?, issues?)`; `getIssues()`
 * returns the stored collection, or `null` when none was given (Java field default).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/validation/GraphValidationException.java
 */
export class GraphValidationException extends RuntimeException {
  /** Issues attached to the exception. */
  readonly #issues: readonly GraphIssue[] | null;

  constructor(message?: string, issues?: readonly GraphIssue[]) {
    super(message);
    this.name = 'GraphValidationException';
    this.#issues = issues ?? null;
  }

  /** Issues attached to the exception. */
  getIssues(): readonly GraphIssue[] | null {
    return this.#issues;
  }
}
