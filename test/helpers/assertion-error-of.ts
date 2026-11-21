// SPDX-License-Identifier: EPL-2.0
import { AssertionError } from '../../src/java/lang/AssertionError.js';
import { withAssertions } from './with-assertions.js';

/**
 * The `AssertionError` that `step` throws with assertions on, as a JVM under `-ea` would, whatever the suite's own
 * setting is. Any other error propagates, and a `step` that returns fails the test: the caller asserts on the message.
 */
export function assertionErrorOf(step: () => unknown): AssertionError {
  try {
    withAssertions(true, step);
  } catch (error) {
    if (error instanceof AssertionError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected an AssertionError, but the step returned');
}
