// SPDX-License-Identifier: EPL-2.0
import type { Rectangle2D } from '../../java/awt/geom/Rectangle2D.js';
import { isNullOrEmpty } from '../../guava/Strings.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { isLowerCase, isUpperCase, isWhitespace } from '../../java/lang/JavaCharacter.js';
import { trim } from '../../java/lang/JavaString.js';
import { StringBuilder } from '../../java/lang/StringBuilder.js';
import { Pattern } from '../../java/util/regex/Pattern.js';
import { Pair } from '../util/Pair.js';
import { DistanceMatcher } from './DistanceMatcher.js';
import type { IBoundsProvider } from './IBoundsProvider.js';
import type { IDataProvider } from './IDataProvider.js';
import { IMatcher } from './IMatcher.js';

/** Regular expression fragment standing for "any amount of horizontal or vertical whitespace". */
const WHITESPACE_PLACEHOLDER = '[\\h\\v]*';
const WORD_BOUNDARY = '\\b';

/**
 * A binary matcher that checks if target names are referenced in comment texts. This can either be the case or not,
 * hence the term <em>binary heuristic</em>. Indeed, the matcher will always output either 0 or 1. It will only output 1
 * if a target's name appears in a comment's text, and if no other target's name appears in it.
 *
 * The matcher can operate in two modes: a strict and a fuzzy mode. In strict mode, target names have to appear exactly
 * as they are in the text of a comment, as a separate word. In fuzzy mode, case is ignored and arbitrary whitespace is
 * allowed between two parts of the name (divided by spaces or through camel case).
 *
 * @typeParam C - type of comments.
 * @typeParam T - type of attachment targets.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/NodeReferenceMatcher.java
 */
export class NodeReferenceMatcher<C, T> extends IMatcher<C, T> {
  /** Function used to retrieve a comment's text. */
  private commentTextFunction: ((comment: C) => string | null) | null = null;
  /** Function used to retrieve a target's name. */
  private targetNameFunction: ((target: T) => string | null) | null = null;
  /** The bounds provider to use. */
  private boundsProvider: IBoundsProvider<C, T> | null = null;
  /** The maximum distance attached comments may be away from each other. */
  private maxDistance = -1;
  /** Whether to use fuzzy mode when looking for occurrences of a target's name in a comment's text. */
  private fuzzy = false;
  /**
   * The comment-target attachments we've found during preprocessing. Java: an identity-keyed HashMap used for lookups
   * only (P2), so a JS Map (identity keys) is equivalent.
   */
  private readonly foundAttachments: Map<C, T> = new Map();

  // ---- Configuration ----

  /**
   * Configures the matcher to use the given function to obtain the text for a comment.
   *
   * @param f - the function to use.
   * @returns this object for method chaining.
   * @throws TypeError if the function is null (Java: `Objects.requireNonNull` NPE).
   */
  withCommentTextProvider(f: ((comment: C) => string | null) | null): this {
    if (f === null || f === undefined) {
      throw new TypeError('Comment text function cannot be null.');
    }

    this.commentTextFunction = f;
    return this;
  }

  /**
   * Configures the matcher to use the given function to obtain the name of an attachment target.
   *
   * @param f - the function to use.
   * @returns this object for method chaining.
   * @throws TypeError if the function is null (Java: `Objects.requireNonNull` NPE).
   */
  withTargetNameProvider(f: ((target: T) => string | null) | null): this {
    if (f === null || f === undefined) {
      throw new TypeError('Node name function cannot be null.');
    }

    this.targetNameFunction = f;
    return this;
  }

  /**
   * Configures the matcher to be fuzzy when looking for occurrences of target names in a comment's text.
   *
   * @returns this object for method chaining.
   */
  withFuzzyMatching(): this {
    this.fuzzy = true;
    return this;
  }

  /**
   * Configures the matcher to use the given maximum attachment distance. Negative values disable the restriction.
   *
   * @param distance - the maximum possible distance.
   * @returns this object for method chaining.
   */
  withMaximumAttachmentDistance(distance: number): this {
    this.maxDistance = distance;
    return this;
  }

  /**
   * Configures the matcher to use the given bounds provider to determine the bounds of comments and targets.
   *
   * @param provider - the bounds provider to use.
   * @returns this object for method chaining.
   * @throws TypeError if the provider is null (Java: `Objects.requireNonNull` NPE).
   */
  withBoundsProvider(provider: IBoundsProvider<C, T> | null): this {
    if (provider === null || provider === undefined) {
      throw new TypeError('Bounds provider must not be null.');
    }

    this.boundsProvider = provider;
    return this;
  }

  /**
   * Checks whether the current configuration is valid.
   *
   * @throws IllegalStateException if the configuration is invalid.
   */
  private checkConfiguration(): void {
    if (this.commentTextFunction === null) {
      throw new IllegalStateException('A comment text function is required.');
    }

    if (this.targetNameFunction === null) {
      throw new IllegalStateException('A node name function is required.');
    }

    if (this.maxDistance >= 0 && this.boundsProvider === null) {
      throw new IllegalStateException('A bounds provider must be installed if a maximum attachment distance is set.');
    }
  }

  // ---- IMatcher ----

  override preprocess(dataProvider: IDataProvider<C, T>, includeHierarchy: boolean): void {
    this.checkConfiguration();
    const commentTextFunction = this.commentTextFunction as (comment: C) => string | null;
    const targetNameFunction = this.targetNameFunction as (target: T) => string | null;

    // Build up maps of comment texts
    const commentTexts: Pair<C, string>[] = [];

    for (const comment of dataProvider.provideComments()) {
      const commentText = commentTextFunction(comment);

      if (!isNullOrEmpty(commentText)) {
        commentTexts.push(Pair.of(comment, commentText as string));
      }
    }

    // Build up maps of target names
    const targetNames: Pair<T, string>[] = [];
    for (const target of dataProvider.provideTargets()) {
      const targetName = targetNameFunction(target);

      if (!isNullOrEmpty(targetName)) {
        targetNames.push(Pair.of(target, targetName as string));
      }
    }

    // Go find matches!
    this.goFindMatches(commentTexts, targetNames);

    // Recurse into sub levels
    if (includeHierarchy) {
      for (const subProvider of dataProvider.provideSubHierarchies()) {
        this.preprocess(subProvider, true);
      }
    }
  }

  override cleanup(): void {
    this.foundAttachments.clear();
  }

  override raw(comment: C, target: T): number {
    // Simply lookup the comment-target pair in our map
    return (this.foundAttachments.get(comment) ?? null) === target ? 1 : 0;
  }

  override normalized(comment: C, target: T): number {
    return this.raw(comment, target);
  }

  // ---- Matching ----

  /**
   * Runs off and finds matches between comments and attachment targets. A target and a comment match if the target's
   * name is contained in the comment's text, and if no other target is mentioned in the comment's text. Matches are
   * recorded in `foundAttachments`.
   *
   * @param commentTexts - pairs of comments and their (non-empty) text.
   * @param targetNames - pairs of targets and their (non-empty) names.
   */
  private goFindMatches(commentTexts: Pair<C, string>[], targetNames: Pair<T, string>[]): void {
    // Produce regular expression patterns for all target names
    const targetRegexps: Pair<T, Pattern>[] = [];
    for (const targetNamePair of targetNames) {
      const name = targetNamePair.getSecond() as string;
      const regexp = this.fuzzy
        ? NodeReferenceMatcher.fuzzyRegexpFor(name)
        : NodeReferenceMatcher.strictRegexpFor(name);
      targetRegexps.push(Pair.of(targetNamePair.getFirst() as T, regexp));
    }

    // Check each pair of comment and target
    for (const commentTextPair of commentTexts) {
      const foundTarget = NodeReferenceMatcher.findUniqueTarget(targetRegexps, commentTextPair.getSecond() as string);

      // Record the match, if any and if the maximum attachment distance allows
      if (foundTarget !== null) {
        this.recordMatch(commentTextPair.getFirst() as C, foundTarget.target);
      }
    }
  }

  /**
   * Finds the one target whose pattern occurs in the text; a second match resets the result to null and stops.
   * The wrapper object distinguishes "no match" from a (theoretically) null-like target value.
   */
  private static findUniqueTarget<T>(targetRegexps: Pair<T, Pattern>[], text: string): { readonly target: T } | null {
    let foundTarget: { readonly target: T } | null = null;

    for (const targetRegexpPair of targetRegexps) {
      const matcher = (targetRegexpPair.getSecond() as Pattern).matcher(text);

      if (matcher.find()) {
        // We only want to establish associations if a target is the only one mentioned in a comment
        if (foundTarget === null) {
          foundTarget = { target: targetRegexpPair.getFirst() as T };
        } else {
          foundTarget = null;
          break;
        }
      }
    }

    return foundTarget;
  }

  /** Records a match if the maximum attachment distance allows. */
  private recordMatch(comment: C, foundTarget: T): void {
    if (this.maxDistance < 0) {
      // There is no distance restriction
      this.foundAttachments.set(comment, foundTarget);
    } else {
      // Calculate the distance between the target and the comment
      const provider = this.boundsProvider as IBoundsProvider<C, T>;
      const commentBounds = provider.boundsForComment(comment) as Rectangle2D.Double;
      const nodeBounds = provider.boundsForTarget(foundTarget) as Rectangle2D.Double;

      if (DistanceMatcher.distance(commentBounds, nodeBounds) <= this.maxDistance) {
        this.foundAttachments.set(comment, foundTarget);
      }
    }
  }

  /**
   * Produces a fuzzy regular expression pattern for the given target name. A space character in the target name can
   * be represented by one or more whitespace characters in the comment text; in a camelCased name, each upper-case
   * character preceded by a lower-case one can be prefixed by whitespace.
   *
   * @param targetName - the target name.
   * @returns regular expression pattern for fuzzy containment.
   */
  static fuzzyRegexpFor(targetName: string): Pattern {
    const trimmedTargetName = trim(targetName);
    const regexp = new StringBuilder();
    // Java sizes the segment buffers by the untrimmed name; capacity has no observable effect here.
    let currentSegment = new StringBuilder();

    for (let i = 0; i < trimmedTargetName.length; i++) {
      const currC = trimmedTargetName.charCodeAt(i);

      if (isUpperCase(currC)) {
        // If the previous character was lower-case, end the current segment and insert whitespace placeholders
        if (i > 0 && isLowerCase(trimmedTargetName.charCodeAt(i - 1))) {
          regexp.append(Pattern.quote(currentSegment.toString()));
          currentSegment = new StringBuilder();

          regexp.append(WHITESPACE_PLACEHOLDER);
        }

        currentSegment.appendChar(currC);
      } else if (isWhitespace(currC)) {
        // The first of a series of whitespace characters must be replaced by whitespace placeholders in the
        // regular expression, and the current segment ends
        if (i > 0 && !isWhitespace(trimmedTargetName.charCodeAt(i - 1))) {
          regexp.append(Pattern.quote(currentSegment.toString()));
          currentSegment = new StringBuilder();

          regexp.append(WHITESPACE_PLACEHOLDER);
        }
      } else {
        // It's neither upper-case, nor whitespace, so just add it to the current segment
        currentSegment.appendChar(currC);
      }
    }

    regexp.append(Pattern.quote(currentSegment.toString()));

    return Pattern.compile(
      WORD_BOUNDARY + regexp.toString() + WORD_BOUNDARY,
      Pattern.DOTALL | Pattern.CASE_INSENSITIVE,
    );
  }

  /**
   * Produces a strict regular expression pattern for the given target name. The pattern matches the target name if
   * it's not part of a longer word.
   *
   * @param targetName - the target name.
   * @returns regular expression pattern for strict containment.
   */
  static strictRegexpFor(targetName: string): Pattern {
    return Pattern.compile(WORD_BOUNDARY + Pattern.quote(targetName) + WORD_BOUNDARY, Pattern.DOTALL);
  }

  // ---- Accessors ----

  /**
   * Returns a map from comments to the targets they were attached to by this heuristic. Meaningful only between
   * `preprocess` and `cleanup`. Comments that are not attached to anything don't appear in the map.
   *
   * @returns mapping of comments to targets.
   */
  getAttachments(): Map<C, T> {
    return this.foundAttachments;
  }
}
