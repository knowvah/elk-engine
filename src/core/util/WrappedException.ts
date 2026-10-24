// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../../java/lang/RuntimeException.js';

/**
 * Exception class used to wrap checked exceptions as unchecked ones (AD-16: extends the Java parent).
 *
 * The two Java constructors `(Throwable)` and `(String, Throwable)` are told apart by argument count (6.5). The
 * one-argument form takes its message from `cause.toString()` as `Throwable(Throwable)` does; a `null` cause leaves
 * the message empty. `serialVersionUID` is dropped.
 *
 * @author msp
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/WrappedException.java
 */
export class WrappedException extends RuntimeException {
  /** Create a wrapped exception. */
  constructor(cause: unknown);
  /** Create a wrapped exception with additional message. */
  constructor(message: string, cause: unknown);
  constructor(...args: [unknown] | [string, unknown]) {
    if (args.length === 2) {
      super(args[0], { cause: args[1] });
    } else {
      const cause = args[0];
      super(cause === null ? undefined : String(cause), { cause });
    }
    this.name = 'WrappedException';
  }
}
