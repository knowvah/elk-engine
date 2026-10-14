// SPDX-License-Identifier: EPL-2.0

/** A `Throwable` as Java's `Throwable.toString()` renders it: `<fully qualified class>: <message>`. */
export function throwableToString(error: Error): string {
  const javaName = (error as { javaName?: string }).javaName ?? error.name;
  return `${javaName}: ${error.message}`;
}

/**
 * Java `RuntimeException` base of Gson's unchecked exceptions (no `RuntimeException` shim exists in `src/java/lang`).
 * `new JsonParseException(cause)` takes the message from the cause's `toString()`, as `Throwable(Throwable)` does.
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/JsonParseException.html
 */
export class JsonParseException extends Error {
  readonly javaName: string = 'com.google.gson.JsonParseException';

  constructor(messageOrCause: string | Error, cause?: Error) {
    if (typeof messageOrCause === 'string') {
      super(messageOrCause, cause === undefined ? undefined : { cause });
    } else {
      super(throwableToString(messageOrCause), { cause: messageOrCause });
    }
    this.name = 'JsonParseException';
  }
}
