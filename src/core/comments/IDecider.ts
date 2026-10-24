// SPDX-License-Identifier: EPL-2.0
import type { IMatcher } from './IMatcher.js';

/**
 * Java `Class<? extends IMatcher<?, T>>` key: the (possibly abstract) constructor of a matcher.
 */
export type MatcherClass<T> = abstract new (...args: never[]) => IMatcher<never, T>;

/**
 * An attachment decider has the final say on which attachment target to attach a comment to, if any. The decision is
 * based on the normalized heuristic values produced by the matchers for each possible target.
 *
 * @typeParam T - type of attachment targets.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/IDecider.java
 */
export interface IDecider<T> {
  /**
   * Decides which target to attach a comment to, if any.
   *
   * @param normalizedHeuristics - maps possible attachment targets to a map from matchers to the normalized heuristic
   *   values they produced.
   * @returns the selected attachment target, or `null` if the comment should be left unattached.
   */
  makeAttachmentDecision(normalizedHeuristics: Map<T, Map<MatcherClass<T>, number>>): T | null;
}
