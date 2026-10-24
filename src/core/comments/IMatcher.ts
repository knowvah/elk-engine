// SPDX-License-Identifier: EPL-2.0
import type { IDataProvider } from './IDataProvider.js';

/**
 * A matcher determines how likely it is that a comment is related to an attachment target. Matchers provide a raw
 * heuristic result and a normalized result. The latter is constrained to be in `[0, 1]` (including the
 * boundaries), while the former is unconstrained, but may choose to follow the same constraints.
 *
 * Note that if an implementation holds state, all resources should be released once {@link cleanup} is called.
 * (Java interface with default methods; an abstract class here, R5.)
 *
 * @typeParam C - type of comments.
 * @typeParam T - type of attachment targets.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/IMatcher.java
 */
export abstract class IMatcher<C, T> {
  /**
   * Computes the raw heuristic value for the given comment and the given attachment target.
   *
   * @param comment - the comment node.
   * @param target - the attachment target.
   * @returns the raw heuristic result.
   */
  abstract raw(comment: C, target: T): number;

  /**
   * Computes the normalized heuristic value in `[0, 1]` for the given comment and attachment target.
   *
   * @param comment - the comment node.
   * @param target - the attachment target.
   * @returns the normalized heuristic result.
   */
  abstract normalized(comment: C, target: T): number;

  /**
   * Does any preprocessing necessary. The default implementation does nothing.
   *
   * @param _dataProvider - the data set provider.
   * @param _includeHierarchy - whether preprocessing also covers all sub levels.
   */
  preprocess(_dataProvider: IDataProvider<C, T>, _includeHierarchy: boolean): void {
    // default: do nothing
  }

  /** Does any cleaning necessary to get the implementation ready for the next run. The default does nothing. */
  cleanup(): void {
    // default: do nothing
  }
}
