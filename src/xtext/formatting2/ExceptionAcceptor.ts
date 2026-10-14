// SPDX-License-Identifier: EPL-2.0

/** A sink for exceptions (Java `IAcceptor<Exception>`). */
export type ExceptionHandler = (exception: Error) => void;

/**
 * The three `ExceptionAcceptor` constants. Placed in `formatting2` because the T12 write-set is
 * `src/xtext/formatting2/**` (the Xtext class is `org.eclipse.xtext.util.ExceptionAcceptor`).
 * `LOGGING` is the request default; log output is dropped (no logging in `src/`), so it behaves like
 * `IGNORING`: an exception reported to it makes the offending replacer/edit disappear and formatting go on.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/ExceptionAcceptor.java
 */
export const ExceptionAcceptor: {
  readonly LOGGING: ExceptionHandler;
  readonly THROWING: ExceptionHandler;
  readonly IGNORING: ExceptionHandler;
} = {
  LOGGING: (): void => {
    // Java logs at error level; the port has no logging
  },
  THROWING: (exception: Error): void => {
    throw exception;
  },
  IGNORING: (): void => {},
};
