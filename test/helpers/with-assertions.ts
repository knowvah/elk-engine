// SPDX-License-Identifier: EPL-2.0
import { assertionsEnabled, setAssertionsEnabled } from '../../src/java/lang/DevAssert.js';

/**
 * Runs `body` with the switch at `enabled`, then restores the state the suite setup chose. The one way a test runs
 * a step as a JVM without `-ea` does (`false`), or pins an `AssertionError` whatever the suite's mode is (`true`).
 */
export function withAssertions<T>(enabled: boolean, body: () => T): T {
  const before = assertionsEnabled();
  setAssertionsEnabled(enabled);
  try {
    return body();
  } finally {
    setAssertionsEnabled(before);
  }
}
