// SPDX-License-Identifier: EPL-2.0
import { Gson } from './Gson.js';

/**
 * Configures a {@link Gson}. Only the three calls ElkGraphJson makes are ported (J1).
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/GsonBuilder.html
 */
export class GsonBuilder {
  private pretty = false;
  private htmlSafe = true;

  /** Java `disableHtmlEscaping`. */
  disableHtmlEscaping(): this {
    this.htmlSafe = false;
    return this;
  }

  /** Java `setPrettyPrinting`: two-space indentation. */
  setPrettyPrinting(): this {
    this.pretty = true;
    return this;
  }

  /** Java `create`. */
  create(): Gson {
    return new Gson(this.pretty, this.htmlSafe);
  }
}
