// SPDX-License-Identifier: EPL-2.0
import { isNullOrEmpty } from '../../guava/Strings.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { equalsIgnoreCase } from '../../java/lang/JavaString.js';
import type { IDataProvider } from './IDataProvider.js';
import { IFilter } from './IFilter.js';

/**
 * A filter that checks whether a comment's text starts with one of a set of prefixes. Depending on configuration, a
 * prefix match either makes the comment ineligible (the default) or is required for eligibility.
 *
 * @typeParam C - type of comments.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/TextPrefixFilter.java
 */
export class TextPrefixFilter<C> extends IFilter<C> {
  private commentTextProvider: ((comment: C) => string) | null = null;
  private readonly prefixes: string[] = [];
  private rejectCommentOnPrefixMatch = true;
  private caseSensitive = false;

  // ---- Configuration ----

  /**
   * Sets the function that retrieves a comment's text.
   *
   * @param f - the function.
   * @returns this object for method chaining.
   * @throws TypeError if the function is null (Java: `Objects.requireNonNull` NPE).
   */
  withCommentTextProvider(f: ((comment: C) => string) | null): this {
    if (f === null || f === undefined) {
      throw new TypeError('Comment text function cannot be null.');
    }

    this.commentTextProvider = f;
    return this;
  }

  /**
   * Requires a prefix match for eligibility instead of rejecting comments on a match.
   *
   * @returns this object for method chaining.
   */
  withPrefixMatchRequiredForEligibility(): this {
    this.rejectCommentOnPrefixMatch = false;

    return this;
  }

  /**
   * Makes prefix matching case sensitive.
   *
   * @returns this object for method chaining.
   */
  withCaseSensitiveMatching(): this {
    this.caseSensitive = true;

    return this;
  }

  /**
   * Adds a prefix to check for.
   *
   * @param prefix - the non-empty prefix.
   * @returns this object for method chaining.
   * @throws IllegalArgumentException if the prefix is null or empty.
   */
  addPrefix(prefix: string | null): this {
    if (isNullOrEmpty(prefix)) {
      throw new IllegalArgumentException("Prefix cannot be null or empty. Wouldn't make sense.");
    }

    this.prefixes.push(prefix as string);

    return this;
  }

  private checkConfiguration(): void {
    if (this.commentTextProvider === null) {
      throw new IllegalStateException('A comment text provider is required.');
    }

    if (this.prefixes.length === 0) {
      throw new IllegalStateException('At least one prefix is required.');
    }
  }

  // ---- IFilter ----

  override preprocess(_dataProvider: IDataProvider<C, unknown>, _includeHierarchy: boolean): void {
    this.checkConfiguration();
  }

  override eligibleForAttachment(comment: C): boolean {
    // Java NPEs when no provider is configured; the TypeError here is the same unrecoverable failure.
    const commentText = (this.commentTextProvider as (comment: C) => string)(comment);

    if (!isNullOrEmpty(commentText)) {
      for (const prefix of this.prefixes) {
        // We can only have a match if the comment is as least as long as the prefix
        if (commentText.length >= prefix.length) {
          const commentPrefix = commentText.substring(0, prefix.length);

          const startsWithPrefix = this.caseSensitive
            ? commentPrefix === prefix
            : equalsIgnoreCase(commentPrefix, prefix);

          if (startsWithPrefix) {
            // If we reject a comment once it matches a prefix, we now need to return false.
            // If we require comments to match a prefix, we now need to return true
            return !this.rejectCommentOnPrefixMatch;
          }
        }
      }
    }

    // If we arrive here, no prefix has matched
    return this.rejectCommentOnPrefixMatch;
  }
}
