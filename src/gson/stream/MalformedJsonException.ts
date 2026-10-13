// SPDX-License-Identifier: EPL-2.0

/**
 * Java `java.io.IOException`. No `src/java/io` shim exists yet; defined here until one is added (reported to the
 * orchestrator).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/IOException.html
 */
export class IOException extends Error {
  readonly javaName: string = 'java.io.IOException';

  constructor(message?: string) {
    super(message);
    this.name = 'IOException';
  }
}

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/EOFException.html */
export class EOFException extends IOException {
  override readonly javaName: string = 'java.io.EOFException';

  constructor(message?: string) {
    super(message);
    this.name = 'EOFException';
  }
}

/** @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/stream/MalformedJsonException.html */
export class MalformedJsonException extends IOException {
  override readonly javaName: string = 'com.google.gson.stream.MalformedJsonException';

  constructor(message?: string) {
    super(message);
    this.name = 'MalformedJsonException';
  }
}
