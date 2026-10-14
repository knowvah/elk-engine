// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { JsonToken } from './JsonToken.js';
import { EOFException } from '../../java/io/EOFException.js';
import { MalformedJsonException } from './MalformedJsonException.js';
import * as State from '../internal/JsonReaderState.js';

// Local bindings: a hot-path read of an imported binding costs a property lookup under the test transform.
const { buildPath, HEX_ESCAPE_PATTERN, KEYWORDS, NUMBER_PATTERN, Peeked, Scope, SIMPLE_ESCAPES, TOKEN_OF_PEEKED } =
  State;
const TOKEN = JsonToken;

const TROUBLESHOOTING_URL = 'https://github.com/google/gson/blob/main/Troubleshooting.md#malformed-json';
const LENIENT_HINT = 'Use JsonReader.setStrictness(Strictness.LENIENT) to accept malformed JSON';
const BOM = '\uFEFF';
const NON_EXECUTE_PREFIX = ")]}'\n";
const HEX_RADIX = 16;
const UNICODE_ESCAPE_LENGTH = 4;
const LENIENT_ONLY = 1;
const DELIMITER = 2;
/** The characters that end an unquoted literal; the lenient-only ones also require lenient mode to appear. */
const CHAR_KINDS: ReadonlyMap<string, number> = new Map([
  ...[...'/\\;#='].map((c): [string, number] => [c, LENIENT_ONLY]),
  ...[...'{}[]:, \t\f\r\n'].map((c): [string, number] => [c, DELIMITER]),
]);
const BACKSLASH_CODE = 0x5c;
const NEWLINE_CODE = 0x0a;
const DEPTH_DELTA: Readonly<Record<string, number>> = {
  [JsonToken.BEGIN_ARRAY]: 1,
  [JsonToken.BEGIN_OBJECT]: 1,
  [JsonToken.END_ARRAY]: -1,
  [JsonToken.END_OBJECT]: -1,
};

/**
 * A pull parser over a string, with Gson's `JsonReader` token semantics, lenient-mode extensions and error
 * messages (`... at line L column C path $...`). Number tokens keep their source text (`nextString`).
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/stream/JsonReader.html
 */
export class JsonReader {
  private readonly text: string;
  private readonly limit: number;
  private pos = 0;
  private lineNumber = 0;
  private lineStart = 0;
  private peeked: number = Peeked.NONE;
  private peekedNumberLength = 0;
  private lenient = false;
  // Parallel stacks sized by `stackSize` (not push/pop: shrinking and regrowing the arrays is a measurable cost).
  private readonly stack: number[] = [Scope.EMPTY_DOCUMENT];
  private readonly pathNames: (string | null)[] = [null];
  private readonly pathIndices: number[] = [0];
  private stackSize = 1;

  constructor(text: string) {
    this.text = text;
    this.limit = text.length;
    if (text.startsWith(BOM)) {
      this.pos = 1;
      this.lineStart = 1;
    }
  }

  setLenient(lenient: boolean): void {
    this.lenient = lenient;
  }

  isLenient(): boolean {
    return this.lenient;
  }

  hasNext(): boolean {
    const p = this.ensurePeeked();
    return p !== Peeked.END_OBJECT && p !== Peeked.END_ARRAY && p !== Peeked.EOF;
  }

  peek(): JsonToken {
    return TOKEN_OF_PEEKED[this.ensurePeeked()]!;
  }

  beginArray(): void {
    this.begin(Peeked.BEGIN_ARRAY, Scope.EMPTY_ARRAY, TOKEN.BEGIN_ARRAY);
  }

  endArray(): void {
    this.end(Peeked.END_ARRAY, TOKEN.END_ARRAY);
  }

  beginObject(): void {
    this.begin(Peeked.BEGIN_OBJECT, Scope.EMPTY_OBJECT, TOKEN.BEGIN_OBJECT);
  }

  endObject(): void {
    this.end(Peeked.END_OBJECT, TOKEN.END_OBJECT);
  }

  nextName(): string {
    const p = this.ensurePeeked();
    let result: string;
    if (p === Peeked.UNQUOTED_NAME) result = this.nextUnquotedValue();
    else if (p === Peeked.SINGLE_QUOTED_NAME) result = this.nextQuotedValue("'");
    else if (p === Peeked.DOUBLE_QUOTED_NAME) result = this.nextQuotedValue('"');
    else throw this.unexpectedToken(TOKEN.NAME);
    this.peeked = Peeked.NONE;
    this.pathNames[this.stackSize - 1] = result;
    return result;
  }

  nextString(): string {
    const p = this.ensurePeeked();
    let result: string;
    if (p === Peeked.UNQUOTED) result = this.nextUnquotedValue();
    else if (p === Peeked.SINGLE_QUOTED) result = this.nextQuotedValue("'");
    else if (p === Peeked.DOUBLE_QUOTED) result = this.nextQuotedValue('"');
    else if (p === Peeked.NUMBER) result = this.nextNumberText();
    else throw this.unexpectedToken(TOKEN.STRING);
    this.finishValue();
    return result;
  }

  nextBoolean(): boolean {
    const p = this.ensurePeeked();
    if (p !== Peeked.TRUE && p !== Peeked.FALSE) throw this.unexpectedToken(TOKEN.BOOLEAN);
    this.finishValue();
    return p === Peeked.TRUE;
  }

  nextNull(): void {
    if (this.ensurePeeked() !== Peeked.NULL) throw this.unexpectedToken(TOKEN.NULL);
    this.finishValue();
  }

  /** Skips the next value, nested structure included. */
  skipValue(): void {
    let count = 0;
    do {
      count += this.skipToken(this.peek());
      if (this.peeked === Peeked.EOF) return;
    } while (count !== 0);
  }

  /** The JSONPath of the reader's current position, e.g. `$.a[2]`. */
  getPath(): string {
    return buildPath(this.stack, this.stackSize, this.pathNames, this.pathIndices);
  }

  private begin(peeked: number, scope: number, token: JsonToken): void {
    if (this.ensurePeeked() !== peeked) throw this.unexpectedToken(token);
    this.stack[this.stackSize] = scope;
    this.pathNames[this.stackSize] = null;
    this.pathIndices[this.stackSize++] = 0;
    this.peeked = Peeked.NONE;
  }

  private end(peeked: number, token: JsonToken): void {
    if (this.ensurePeeked() !== peeked) throw this.unexpectedToken(token);
    this.stackSize--;
    this.pathNames[this.stackSize] = null;
    this.finishValue();
  }

  private finishValue(): void {
    this.peeked = Peeked.NONE;
    this.pathIndices[this.stackSize - 1]!++;
  }

  /** Consumes the peeked token; returns how it changes the nesting depth. */
  private skipToken(token: JsonToken): number {
    const delta = DEPTH_DELTA[token] ?? 0;
    if (delta === 0) this.skipScalar(token);
    else this.skipNesting(token);
    return delta;
  }

  private skipNesting(token: JsonToken): void {
    if (token === TOKEN.BEGIN_ARRAY) this.beginArray();
    else if (token === TOKEN.BEGIN_OBJECT) this.beginObject();
    else if (token === TOKEN.END_ARRAY) this.endArray();
    else this.endObject();
  }

  private skipScalar(token: JsonToken): void {
    if (token === TOKEN.NAME) this.nextName();
    else if (token === TOKEN.BOOLEAN) this.nextBoolean();
    else if (token === TOKEN.NULL) this.nextNull();
    else if (token !== TOKEN.END_DOCUMENT) this.nextString();
  }

  private nextNumberText(): string {
    const result = this.text.slice(this.pos, this.pos + this.peekedNumberLength);
    this.pos += this.peekedNumberLength;
    return result;
  }

  private unexpectedToken(expected: JsonToken): IllegalStateException {
    return new IllegalStateException(`Expected ${expected} but was ${this.peek()}${this.locationString()}`);
  }

  private ensurePeeked(): number {
    if (this.peeked === Peeked.NONE) this.peeked = this.doPeek();
    return this.peeked;
  }

  private doPeek(): number {
    const top = this.stack[this.stackSize - 1]!;
    switch (top) {
      case Scope.EMPTY_ARRAY:
        this.setTop(Scope.NONEMPTY_ARRAY);
        break;
      case Scope.NONEMPTY_ARRAY: {
        const ended = this.peekArraySeparator();
        if (ended) return Peeked.END_ARRAY;
        break;
      }
      case Scope.EMPTY_OBJECT:
      case Scope.NONEMPTY_OBJECT:
        return this.peekName(top);
      case Scope.DANGLING_NAME:
        this.readNameSeparator();
        break;
      case Scope.EMPTY_DOCUMENT:
        if (this.lenient) this.consumeNonExecutePrefix();
        this.setTop(Scope.NONEMPTY_DOCUMENT);
        break;
      default: {
        if (this.nextNonWhitespace(false) === '') return Peeked.EOF;
        this.checkLenient();
        this.pos--;
      }
    }
    return this.peekValue(top);
  }

  private setTop(scope: number): void {
    this.stack[this.stackSize - 1] = scope;
  }

  /** After an array element: true if the array ends here; a (lenient) `;` or `,` separates elements. */
  private peekArraySeparator(): boolean {
    const c = this.nextNonWhitespace(true);
    if (c === ']') return true;
    if (c === ';') this.checkLenient();
    else if (c !== ',') throw this.syntaxError('Unterminated array');
    return false;
  }

  private peekName(top: number): number {
    this.setTop(Scope.DANGLING_NAME);
    if (top === Scope.NONEMPTY_OBJECT) {
      const separator = this.nextNonWhitespace(true);
      if (separator === '}') return Peeked.END_OBJECT;
      if (separator === ';') this.checkLenient();
      else if (separator !== ',') throw this.syntaxError('Unterminated object');
    }
    const c = this.nextNonWhitespace(true);
    switch (c) {
      case '"':
        return Peeked.DOUBLE_QUOTED_NAME;
      case "'":
        this.checkLenient();
        return Peeked.SINGLE_QUOTED_NAME;
      case '}':
        if (top !== Scope.NONEMPTY_OBJECT) return Peeked.END_OBJECT;
        throw this.syntaxError('Expected name');
      default:
        this.checkLenient();
        this.pos--;
        if (this.isLiteral(c)) return Peeked.UNQUOTED_NAME;
        throw this.syntaxError('Expected name');
    }
  }

  private readNameSeparator(): void {
    this.setTop(Scope.NONEMPTY_OBJECT);
    const c = this.nextNonWhitespace(true);
    if (c === ':') return;
    if (c !== '=') throw this.syntaxError("Expected ':'");
    this.checkLenient();
    if (this.pos < this.limit && this.text[this.pos] === '>') this.pos++;
  }

  private consumeNonExecutePrefix(): void {
    this.nextNonWhitespace(true);
    this.pos--;
    if (this.text.startsWith(NON_EXECUTE_PREFIX, this.pos)) this.pos += NON_EXECUTE_PREFIX.length;
  }

  private peekValue(top: number): number {
    const c = this.nextNonWhitespace(true);
    switch (c) {
      case ']':
        if (top === Scope.EMPTY_ARRAY) return Peeked.END_ARRAY;
        return this.peekImplicitNull(top);
      case ';':
      case ',':
        return this.peekImplicitNull(top);
      case "'":
        this.checkLenient();
        return Peeked.SINGLE_QUOTED;
      case '"':
        return Peeked.DOUBLE_QUOTED;
      case '[':
        return Peeked.BEGIN_ARRAY;
      case '{':
        return Peeked.BEGIN_OBJECT;
      default:
        this.pos--;
        return this.peekLiteral();
    }
  }

  /** A `,`, `;` or `]` where an array element is expected stands for a (lenient) `null` element. */
  private peekImplicitNull(top: number): number {
    if (top !== Scope.EMPTY_ARRAY && top !== Scope.NONEMPTY_ARRAY) throw this.syntaxError('Unexpected value');
    this.checkLenient();
    this.pos--;
    return Peeked.NULL;
  }

  private peekLiteral(): number {
    let result = this.peekKeyword();
    if (result !== Peeked.NONE) return result;
    result = this.peekNumber();
    if (result !== Peeked.NONE) return result;
    if (!this.isLiteral(this.text[this.pos]!)) throw this.syntaxError('Expected value');
    this.checkLenient();
    return Peeked.UNQUOTED;
  }

  private peekKeyword(): number {
    const entry = KEYWORDS[this.text[this.pos]!.toLowerCase()];
    if (entry === undefined) return Peeked.NONE;
    const [keyword, token] = entry;
    const length = keyword.length;
    if (this.pos + length > this.limit) return Peeked.NONE;
    if (this.text.slice(this.pos, this.pos + length).toLowerCase() !== keyword) return Peeked.NONE;
    if (this.pos + length < this.limit && this.isLiteral(this.text[this.pos + length]!)) return Peeked.NONE;
    this.pos += length;
    return token;
  }

  /** A number token ends at the first non-literal character; a number followed by a literal character is not one. */
  private peekNumber(): number {
    NUMBER_PATTERN.lastIndex = this.pos;
    const match = NUMBER_PATTERN.exec(this.text);
    if (match === null) return Peeked.NONE;
    const next = this.text[this.pos + match[0].length];
    if (next !== undefined && this.isLiteral(next)) return Peeked.NONE;
    this.peekedNumberLength = match[0].length;
    return Peeked.NUMBER;
  }

  /** Whether `c` can be part of an unquoted literal; the characters `/ \ ; # =` are lenient-only. */
  private isLiteral(c: string): boolean {
    const kind = CHAR_KINDS.get(c);
    if (kind === LENIENT_ONLY) this.checkLenient();
    return kind === undefined;
  }

  private checkLenient(): void {
    if (!this.lenient) throw this.syntaxError(LENIENT_HINT);
  }

  /** The next non-whitespace character (comments skipped when lenient), or `''` at the end if `!throwOnEof`. */
  private nextNonWhitespace(throwOnEof: boolean): string {
    while (this.pos < this.limit) {
      const c = this.text[this.pos++]!;
      if (c === '\n') {
        this.lineNumber++;
        this.lineStart = this.pos;
      } else if (c === '/') {
        if (!this.skipSlashComment()) return c;
      } else if (c === '#') {
        this.checkLenient();
        this.skipToEndOfLine();
      } else if (c !== ' ' && c !== '\t' && c !== '\r') {
        return c;
      }
    }
    if (throwOnEof) throw new EOFException(`End of input${this.locationString()}`);
    return '';
  }

  /** After a `/`: skips the comment and returns true, or returns false if the `/` is not a comment start. */
  private skipSlashComment(): boolean {
    if (this.pos === this.limit) return false;
    this.checkLenient();
    const next = this.text[this.pos];
    if (next === '*') {
      this.pos++;
      if (!this.skipTo('*/')) throw this.syntaxError('Unterminated comment');
      this.pos += 2;
      return true;
    }
    if (next !== '/') return false;
    this.pos++;
    this.skipToEndOfLine();
    return true;
  }

  private skipTo(toFind: string): boolean {
    for (; this.pos + toFind.length <= this.limit; this.pos++) {
      if (this.text[this.pos] === '\n') {
        this.lineNumber++;
        this.lineStart = this.pos + 1;
      } else if (this.text.startsWith(toFind, this.pos)) {
        return true;
      }
    }
    return false;
  }

  private skipToEndOfLine(): void {
    while (this.pos < this.limit) {
      const c = this.text[this.pos++];
      if (c === '\n') {
        this.lineNumber++;
        this.lineStart = this.pos;
        return;
      }
      if (c === '\r') return;
    }
  }

  private nextUnquotedValue(): string {
    let end = this.pos;
    while (end < this.limit && this.isLiteral(this.text[end]!)) end++;
    const result = this.text.slice(this.pos, end);
    this.pos = end;
    return result;
  }

  private nextQuotedValue(quote: string): string {
    const quoteCode = quote.charCodeAt(0);
    let result = '';
    let p = this.pos;
    let start = p;
    while (p < this.limit) {
      const c = this.text.charCodeAt(p++);
      if (c === quoteCode) {
        this.pos = p;
        return result + this.text.slice(start, p - 1);
      }
      if (c === BACKSLASH_CODE) {
        this.pos = p;
        result += this.text.slice(start, p - 1) + this.readEscapeCharacter();
        p = this.pos;
        start = p;
      } else if (c === NEWLINE_CODE) {
        this.lineNumber++;
        this.lineStart = p;
      }
    }
    this.pos = p;
    throw this.syntaxError('Unterminated string');
  }

  private readEscapeCharacter(): string {
    if (this.pos === this.limit) throw this.syntaxError('Unterminated escape sequence');
    const escaped = this.text[this.pos++]!;
    if (escaped === 'u') return this.readUnicodeEscape();
    const simple = SIMPLE_ESCAPES[escaped];
    if (simple !== undefined) return simple;
    if (escaped === '\n') {
      this.lineNumber++;
      this.lineStart = this.pos;
      return escaped;
    }
    if (escaped === "'" || escaped === '"' || escaped === '\\' || escaped === '/') return escaped;
    throw this.syntaxError('Invalid escape sequence');
  }

  private readUnicodeEscape(): string {
    if (this.pos + UNICODE_ESCAPE_LENGTH > this.limit) throw this.syntaxError('Unterminated escape sequence');
    const digits = this.text.slice(this.pos, this.pos + UNICODE_ESCAPE_LENGTH);
    if (!HEX_ESCAPE_PATTERN.test(digits)) throw this.syntaxError(`Malformed Unicode escape \\u${digits}`);
    this.pos += UNICODE_ESCAPE_LENGTH;
    return String.fromCharCode(Number.parseInt(digits, HEX_RADIX));
  }

  private locationString(): string {
    const line = this.lineNumber + 1;
    const column = this.pos - this.lineStart + 1;
    return ` at line ${line} column ${column} path ${this.getPath()}`;
  }

  private syntaxError(message: string): MalformedJsonException {
    return new MalformedJsonException(`${message}${this.locationString()}\nSee ${TROUBLESHOOTING_URL}`);
  }
}
