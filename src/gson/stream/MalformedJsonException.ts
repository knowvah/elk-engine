// SPDX-License-Identifier: EPL-2.0
import { IOException } from '../../java/io/IOException.js';

/** @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/stream/MalformedJsonException.html */
export class MalformedJsonException extends IOException {
  override readonly javaName: string = 'com.google.gson.stream.MalformedJsonException';

  constructor(message?: string) {
    super(message);
    this.name = 'MalformedJsonException';
  }
}
