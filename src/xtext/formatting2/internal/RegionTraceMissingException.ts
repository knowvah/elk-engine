// SPDX-License-Identifier: EPL-2.0

/**
 * Thrown by a {@link TextSegmentSet} without tracing when two segments conflict; `AbstractFormatter2` then
 * reruns the whole formatting with tracing enabled (`handleTraceMissing`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/RegionTraceMissingException.java
 */
export class RegionTraceMissingException extends Error {
  /**
   * Java `super(cause)`: the detail message is `cause.toString()` (class name, plus `: message` when there is
   * one), or none when there is no cause.
   */
  constructor(cause: Error | null) {
    super(cause === null ? undefined : describe(cause), cause === null ? undefined : { cause });
    this.name = 'RegionTraceMissingException';
  }
}

/** `Throwable.toString()`. */
function describe(cause: Error): string {
  return cause.message === '' ? cause.name : `${cause.name}: ${cause.message}`;
}
