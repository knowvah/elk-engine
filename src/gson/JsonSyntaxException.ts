// SPDX-License-Identifier: EPL-2.0
import { JsonParseException } from './JsonParseException.js';

/** @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/JsonSyntaxException.html */
export class JsonSyntaxException extends JsonParseException {
  override readonly javaName: string = 'com.google.gson.JsonSyntaxException';

  constructor(messageOrCause: string | Error, cause?: Error) {
    super(messageOrCause, cause);
    this.name = 'JsonSyntaxException';
  }
}
