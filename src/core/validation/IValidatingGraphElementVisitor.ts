// SPDX-License-Identifier: EPL-2.0
import type { IGraphElementVisitor } from '../util/IGraphElementVisitor.js';
import type { GraphIssue } from './GraphIssue.js';

/**
 * A graph element visitor that validates the elements it visits. `Collection<GraphIssue>` is
 * `Iterable<GraphIssue>` (translation rules, collections).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/validation/IValidatingGraphElementVisitor.java
 */
export interface IValidatingGraphElementVisitor extends IGraphElementVisitor {
  /**
   * The issues found by this validator.
   *
   * @see org.eclipse.elk.core/src/org/eclipse/elk/core/validation/IValidatingGraphElementVisitor.java
   */
  getIssues(): Iterable<GraphIssue>;
}
