// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../util/Pair.js';
import { AggregatedMatchDecider } from './AggregatedMatchDecider.js';
import type { IBoundsProvider } from './IBoundsProvider.js';
import type { IDataProvider } from './IDataProvider.js';
import type { IDecider, MatcherClass } from './IDecider.js';
import { IExplicitAttachmentProvider } from './IExplicitAttachmentProvider.js';
import type { IFilter } from './IFilter.js';
import type { IMatcher } from './IMatcher.js';

/** Java's lambda `(a) -> null`: an explicit attachment provider that never finds anything (R5). */
class NoExplicitAttachments<C, T> extends IExplicitAttachmentProvider<C, T> {
  override findExplicitAttachment(_comment: C): T | null {
    return null;
  }
}

function requireNonNull<V>(value: V | null, message: string): V {
  if (value === null) {
    // Java: Objects.requireNonNull NPE (D10: TypeError)
    throw new TypeError(message);
  }
  return value;
}

/** Java `Collection.isEmpty()` for the `Iterable` provider results. */
function isEmpty(values: Iterable<unknown>): boolean {
  return values[Symbol.iterator]().next().done === true;
}

/**
 * Main class of the comment attachment framework. Comment attachment infers the relation between comments and the
 * objects they refer to, using an explicit attachment provider, filters, matchers, a bounds provider and a decider.
 *
 * @typeParam C - type of comments.
 * @typeParam T - type of attachment targets.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/CommentAttacher.java
 */
export class CommentAttacher<C, T> {
  private includeHierarchy = true;
  private explicitAttachmentsDisableHeuristics = true;
  private explicitAttachmentProvider: IExplicitAttachmentProvider<C, T> = new NoExplicitAttachments<C, T>();
  private boundsProvider: IBoundsProvider<C, T> | null = null;
  private readonly filters: IFilter<C>[] = [];
  private readonly matchers: IMatcher<C, T>[] = [];
  private decider: IDecider<T> = new AggregatedMatchDecider<T>();

  /** Limits comment attachment to the current hierarchy level. */
  limitToCurrentHierarchyLevel(limit: boolean): this {
    this.includeHierarchy = !limit;
    return this;
  }

  /** Keeps heuristics enabled even if explicit attachments are found. */
  keepHeuristicsEnabledWithExplicitAttachments(keepEnabled: boolean): this {
    this.explicitAttachmentsDisableHeuristics = !keepEnabled;
    return this;
  }

  /** Uses the given explicit attachment provider; `null` disables explicit attachments. */
  withExplicitAttachmentProvider(provider: IExplicitAttachmentProvider<C, T> | null): this {
    this.explicitAttachmentProvider = provider === null ? new NoExplicitAttachments<C, T>() : provider;
    return this;
  }

  /** Notifies the given bounds provider of preprocessing and cleanup. */
  withBoundsProvider(provider: IBoundsProvider<C, T>): this {
    this.boundsProvider = requireNonNull(provider, 'The bounds provider must not be null.');
    return this;
  }

  /** Adds the given filter. */
  addFilter(filter: IFilter<C>): this {
    this.filters.push(requireNonNull(filter, 'The filter must not be null.'));
    return this;
  }

  /** Adds the given matcher. */
  addMatcher(matcher: IMatcher<C, T>): this {
    this.matchers.push(requireNonNull(matcher, 'The matcher must not be null.'));
    return this;
  }

  /** Uses the given decider. */
  withAttachmentDecider(attachmentDecider: IDecider<T>): this {
    this.decider = requireNonNull(attachmentDecider, 'The attachment decider must not be null.');
    return this;
  }

  /**
   * Runs the comment attachment heuristic with its current configuration on the given data provider.
   *
   * @param dataProvider - provider for the data set to run comment attachment on.
   */
  attachComments(dataProvider: IDataProvider<C, T>): void {
    // Do necessary preprocessing
    this.preprocess(dataProvider);

    const explicitAttachments: Pair<C, T>[] = [];
    const heuristicAttachments: Pair<C, T>[] = [];

    // Iterate over all comments we should iterate over
    const processingQueue: IDataProvider<C, T>[] = [dataProvider];
    while (processingQueue.length > 0) {
      const currentHierarchy = processingQueue.shift() as IDataProvider<C, T>;
      for (const comment of currentHierarchy.provideComments()) {
        this.collectAttachment(currentHierarchy, comment, explicitAttachments, heuristicAttachments);
      }

      // If we include hierarchy, check if the current node has children
      if (this.includeHierarchy) {
        processingQueue.push(...currentHierarchy.provideSubHierarchies());
      }
    }

    // Tell everyone to clean up after themselves
    this.cleanup();

    // Attach what we've found
    this.edgeifyFoundAttachments(dataProvider, explicitAttachments, heuristicAttachments);
  }

  /** The per-comment body of Java's `attachComments` loop. */
  private collectAttachment(
    currentHierarchy: IDataProvider<C, T>,
    comment: C,
    explicitAttachments: Pair<C, T>[],
    heuristicAttachments: Pair<C, T>[],
  ): void {
    const explicitAttachment = this.explicitAttachmentProvider.findExplicitAttachment(comment);

    if (explicitAttachment !== null) {
      // We'll use the explicit attachment
      explicitAttachments.push(Pair.of(comment, explicitAttachment));
    } else if (
      (explicitAttachments.length === 0 || !this.explicitAttachmentsDisableHeuristics) &&
      this.isEligibleForHeuristicAttachment(comment)
    ) {
      // We don't even bother calculating the heuristics if they are disabled by explicit attachments anyway.
      const heuristicAttachment = this.findMatch(currentHierarchy, comment);
      if (heuristicAttachment !== null) {
        heuristicAttachments.push(Pair.of(comment, heuristicAttachment));
      }
    }
  }

  private preprocess(dataProvider: IDataProvider<C, T>): void {
    this.explicitAttachmentProvider.preprocess(dataProvider, this.includeHierarchy);
    this.filters.forEach((f) => f.preprocess(dataProvider, this.includeHierarchy));
    this.matchers.forEach((h) => h.preprocess(dataProvider, this.includeHierarchy));

    if (this.boundsProvider !== null) {
      this.boundsProvider.preprocess(dataProvider, this.includeHierarchy);
    }
  }

  private isEligibleForHeuristicAttachment(comment: C): boolean {
    return this.filters.every((f) => f.eligibleForAttachment(comment));
  }

  private findMatch(dataProvider: IDataProvider<C, T>, comment: C): T | null {
    // If there are no heuristics, return nothing...
    if (this.matchers.length === 0) {
      return null;
    }

    // Collect attachment target candidates
    const candidates = dataProvider.provideTargetsFor(comment) as Iterable<T> | null;
    if (candidates === null || isEmpty(candidates)) {
      return null;
    }

    // Matcher results, indexed by attachment target, then by the matcher's class. Identity-hashed in Java
    // (AD-10/P2): candidate insertion order here; two matchers of one class collide, the last wins.
    const results = new Map<T, Map<MatcherClass<T>, number>>();
    for (const candidate of candidates) {
      const candidateResults = new Map<MatcherClass<T>, number>();
      results.set(candidate, candidateResults);

      for (const heuristic of this.matchers) {
        candidateResults.set(heuristic.constructor as MatcherClass<T>, heuristic.normalized(comment, candidate));
      }
    }

    // Decide which attachment target to attach the comment to
    return this.decider.makeAttachmentDecision(results);
  }

  private edgeifyFoundAttachments(
    dataProvider: IDataProvider<C, T>,
    explicitAttachments: readonly Pair<C, T>[],
    heuristicAttachments: readonly Pair<C, T>[],
  ): void {
    // Explicit attachments
    for (const explicitAttachment of explicitAttachments) {
      dataProvider.attach(explicitAttachment.getFirst() as C, explicitAttachment.getSecond() as T);
    }

    // Only apply heuristic attachments if they are still enabled
    if (explicitAttachments.length === 0 || !this.explicitAttachmentsDisableHeuristics) {
      for (const heuristicAttachment of heuristicAttachments) {
        dataProvider.attach(heuristicAttachment.getFirst() as C, heuristicAttachment.getSecond() as T);
      }
    }
  }

  private cleanup(): void {
    this.explicitAttachmentProvider.cleanup();
    this.filters.forEach((f) => f.cleanup());
    this.matchers.forEach((h) => h.cleanup());

    if (this.boundsProvider !== null) {
      this.boundsProvider.cleanup();
    }
  }
}
