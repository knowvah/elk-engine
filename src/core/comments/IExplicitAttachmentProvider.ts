// SPDX-License-Identifier: EPL-2.0
import type { IDataProvider } from './IDataProvider.js';

/**
 * Knows which attachment targets comments were explicitly attached to by the user.
 *
 * Note that if an implementation holds state, all resources should be released once {@link cleanup} is called.
 * (Java interface with default methods; an abstract class here, R5.)
 *
 * @typeParam C - type of comments.
 * @typeParam T - type of attachment targets.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/IExplicitAttachmentProvider.java
 */
export abstract class IExplicitAttachmentProvider<C, T> {
  /**
   * Finds and returns the attachment target the given comment was explicitly attached to by the user, if any.
   *
   * @param comment - the comment whose explicit attachment to find.
   * @returns the target, or `null` if there is none. A non-null target is in the same hierarchy level as the comment.
   */
  abstract findExplicitAttachment(comment: C): T | null;

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
