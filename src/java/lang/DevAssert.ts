// SPDX-License-Identifier: EPL-2.0
import { AssertionError } from './AssertionError.js';

/**
 * The stand-in for the JVM's `-ea` flag: process-wide configuration, off by default as on a JVM started without
 * `-ea`. A layout reads it through {@link devAssert} and never writes it, so no state of one run reaches the next;
 * it is the reviewed module global of `test/architecture/module-globals.fitness.test.ts`.
 */
let enabled = false;

/** Enables or disables every {@link devAssert} of the process, as `-ea` / `-da` do for a JVM. */
export function setAssertionsEnabled(value: boolean): void {
  enabled = value;
}

/** Whether {@link devAssert} evaluates its check. */
export function assertionsEnabled(): boolean {
  return enabled;
}

/**
 * Java's `assert check;` and `assert check : detail;` (translation rules 6.8). Disabled, it evaluates nothing: neither
 * thunk is called. Enabled, it calls `check` and, when that returns false, throws an {@link AssertionError} whose
 * message is the string conversion of `detail()`; `detail` is evaluated only on that failure.
 *
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html#jls-14.10
 */
export function devAssert(check: () => boolean, detail?: () => unknown): void {
  if (!enabled || check()) return;
  throw new AssertionError(detail === undefined ? undefined : String(detail()));
}
