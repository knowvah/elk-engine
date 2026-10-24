// SPDX-License-Identifier: EPL-2.0
import type { IDataProvider } from './IDataProvider.js';

/**
 * Determines if a given comment is eligible for attachment to an attachment target. There are types of comments that
 * can very well stand on their own, without any need for attachment. A filter identifies such comments.
 *
 * Note that if an implementation holds state, all resources should be released once {@link cleanup} is called.
 * (Java interface with default methods; an abstract class here, R5.)
 *
 * @typeParam C - type of comments.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/IFilter.java
 */
export abstract class IFilter<C> {
  /**
   * Checks if the given comment can be attached to an attachment target.
   *
   * @param comment - the comment.
   * @returns `true` if the comment can be attached to graph elements, `false` if it is meant to be standalone.
   */
  abstract eligibleForAttachment(comment: C): boolean;

  /**
   * Does any preprocessing necessary. The default implementation does nothing.
   *
   * @param _dataProvider - the data set provider.
   * @param _includeHierarchy - whether preprocessing also covers all sub levels.
   */
  preprocess(_dataProvider: IDataProvider<C, unknown>, _includeHierarchy: boolean): void {
    // default: do nothing
  }

  /** Does any cleaning necessary to get the implementation ready for the next run. The default does nothing. */
  cleanup(): void {
    // default: do nothing
  }
}
