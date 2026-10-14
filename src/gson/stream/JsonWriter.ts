// SPDX-License-Identifier: EPL-2.0
import { quoteJsonString } from '../JsonPrimitive.js';

const NULL_TEXT = 'null';
const NEWLINE = '\n';
const HTML_UNSAFE = /[<>&=']/g;
const HEX_RADIX = 16;
const UNICODE_ESCAPE_WIDTH = 4;

function htmlEscape(c: string): string {
  return `\\u${c.charCodeAt(0).toString(HEX_RADIX).padStart(UNICODE_ESCAPE_WIDTH, '0')}`;
}

interface Scope {
  readonly isObject: boolean;
  count: number;
}

/**
 * A JSON text writer into a string sink. Only the Gson 2.11.0 behaviour graph.json uses is ported:
 * HTML escaping is off unless `setHtmlSafe(true)`, the output is compact unless an indent is
 * set, and with `serializeNulls` false a `null` object member is dropped together with its name.
 * Numbers are written as their text, so `NaN`/`Infinity` come out bare. Calls out of grammar order
 * are not diagnosed (no caller makes them).
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/stream/JsonWriter.html
 */
export class JsonWriter {
  private readonly out: string[] = [];
  private readonly scopes: Scope[] = [];
  private indent = '';
  private serializeNullsFlag = true;
  private deferredName: string | null = null;
  private htmlSafeFlag = false;

  /** Java `setIndent`: an empty string selects compact output. */
  setIndent(indent: string): void {
    this.indent = indent;
  }

  /** Java `setSerializeNulls`; default `true`. */
  setSerializeNulls(serializeNulls: boolean): void {
    this.serializeNullsFlag = serializeNulls;
  }

  /** Java `setHtmlSafe`: escapes `<`, `>`, `&`, `=` and `'` in string values and names as `\\u003c` etc.; default `false`. */
  setHtmlSafe(htmlSafe: boolean): void {
    this.htmlSafeFlag = htmlSafe;
  }

  beginObject(): this {
    return this.open('{', true);
  }

  endObject(): this {
    return this.close('}');
  }

  beginArray(): this {
    return this.open('[', false);
  }

  endArray(): this {
    return this.close(']');
  }

  /** Java `name`: the member name, written with the next value (or dropped with a skipped `null`). */
  name(name: string): this {
    this.deferredName = name;
    return this;
  }

  /** Java `value(String)`. */
  value(value: string): this {
    return this.literal(this.quote(value));
  }

  /** Java `value(boolean)`. */
  booleanValue(value: boolean): this {
    return this.literal(String(value));
  }

  /** Java `value(Number)`, given the number's text (`Number.toString()`), written verbatim. */
  numberValue(text: string): this {
    return this.literal(text);
  }

  /** Java `nullValue`: omits a pending member name instead when nulls are not serialized. */
  nullValue(): this {
    if (this.deferredName !== null && !this.serializeNullsFlag) {
      this.deferredName = null;
      return this;
    }
    return this.literal(NULL_TEXT);
  }

  /** The text written so far. */
  toString(): string {
    return this.out.join('');
  }

  private quote(text: string): string {
    const quoted = quoteJsonString(text);
    return this.htmlSafeFlag ? quoted.replace(HTML_UNSAFE, htmlEscape) : quoted;
  }

  private open(bracket: string, isObject: boolean): this {
    this.literal(bracket);
    this.scopes.push({ isObject, count: 0 });
    return this;
  }

  private close(bracket: string): this {
    const scope = this.scopes.pop() as Scope; // callers balance begin/end
    if (scope.count > 0) this.newline(this.scopes.length);
    this.out.push(bracket);
    return this;
  }

  private literal(text: string): this {
    this.beforeValue();
    this.out.push(text);
    return this;
  }

  private beforeValue(): void {
    const scope = this.scopes.at(-1);
    if (scope === undefined) return;
    if (scope.count > 0) this.out.push(',');
    scope.count += 1;
    this.newline(this.scopes.length);
    if (scope.isObject) {
      this.out.push(this.quote(this.deferredName as string), this.indent === '' ? ':' : ': '); // a member has a name
      this.deferredName = null;
    }
  }

  private newline(depth: number): void {
    if (this.indent === '') return;
    this.out.push(NEWLINE, this.indent.repeat(depth));
  }
}
