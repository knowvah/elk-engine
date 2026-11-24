// SPDX-License-Identifier: EPL-2.0

/**
 * The deepest chain of suspended activations an explicit-stack loop accepts (AC6, issue #67). A Java recursion that never
 * ends (a cyclic successor structure, a node that is its own right sibling) ends in a `StackOverflowError`; the recursive
 * port ended in V8's `RangeError`. A loop over an explicit stack has no such end, so it counts the activations the Java
 * would hold and stops here. The value lies above every depth the oracle reaches: the deepest tree it laid out in the
 * probes of issue #67 was 15,000 deep, on a case thread with the JVM's default 2 MB stack, which scales to about 60,000 on
 * an 8 MB main thread. An input the oracle lays out never meets the limit; the smaller it is, the sooner a recursion
 * without end throws.
 */
export const MAX_STACK_DEPTH = 100_000;

/** V8's message for stack exhaustion, which the recursive port threw. */
export const STACK_OVERFLOW_MESSAGE = 'Maximum call stack size exceeded';

/**
 * Java's `StackOverflowError` for a recursion run on an explicit stack: throws when `depth`, the number of activations the
 * Java recursion would hold at this point (the frames of the explicit stack, or the iterations of a loop that replaces a
 * tail call), exceeds {@link MAX_STACK_DEPTH}. Nothing in scope catches the Java error, so it is the plain `RangeError` of
 * V8's own stack exhaustion (AD-16b).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StackOverflowError.html
 */
export function checkStackDepth(depth: number): void {
  if (depth > MAX_STACK_DEPTH) {
    throw new RangeError(STACK_OVERFLOW_MESSAGE);
  }
}
