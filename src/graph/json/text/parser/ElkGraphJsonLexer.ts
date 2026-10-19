// SPDX-License-Identifier: EPL-2.0

import { ELK_GRAPH_JSON_KEYS, ElkGraphJsonTokenType, HIDDEN_TOKEN_TYPES } from './ElkGraphJsonTokenType.js';

/**
 * One lexer token; `offset` is the UTF-16 index of its first code unit, `line` the 1-based line there. Structurally
 * the parse runtime's `Token` (`src/xtext/parser/Token.ts`).
 */
export interface ElkGraphJsonToken {
  readonly type: string;
  readonly text: string;
  readonly offset: number;
  readonly line: number;
  readonly hidden: boolean;
}

export interface JsonLexResult {
  readonly tokens: ElkGraphJsonToken[];
  /** True when the generated lexer's `reportError` fired (presence only). */
  readonly lexError: boolean;
}

const TAB = 0x09;
const LF = 0x0a;
const CR = 0x0d;
const SPACE = 0x20;
const DOUBLE_QUOTE = 0x22;
const SINGLE_QUOTE = 0x27;
const PLUS = 0x2b;
const MINUS = 0x2d;
const DOT = 0x2e;
const SLASH = 0x2f;
const ZERO = 0x30;
const NINE = 0x39;
const UPPER_A = 0x41;
const UPPER_E = 0x45;
const UPPER_Z = 0x5a;
const CARET = 0x5e;
const UNDERSCORE = 0x5f;
const LOWER_A = 0x61;
const LOWER_E = 0x65;
const LOWER_Z = 0x7a;
const BACKSLASH = 0x5c;
const ASTERISK = 0x2a;

const { RULE_ID, RULE_STRING, RULE_SIGNED_INT, RULE_FLOAT, RULE_WS, RULE_ANY_OTHER, INVALID } = ElkGraphJsonTokenType;
const { RULE_ML_COMMENT, RULE_SL_COMMENT } = ElkGraphJsonTokenType;

const ML_COMMENT_CLOSE = '*/';
const PUNCTUATION_TYPES: ReadonlyMap<number, string> = new Map([
  [0x7b, ElkGraphJsonTokenType.T__13],
  [0x2c, ElkGraphJsonTokenType.T__14],
  [0x7d, ElkGraphJsonTokenType.T__15],
  [0x3a, ElkGraphJsonTokenType.T__16],
  [0x5b, ElkGraphJsonTokenType.T__17],
  [0x5d, ElkGraphJsonTokenType.T__18],
]);

/** The type name `tokenNames` prints for a keyword literal: the literal in single quotes, inner quotes escaped. */
function keywordType(literal: string): string {
  return `'${literal.replaceAll("'", "\\'")}'`;
}

/** Bare keywords: the 14 keys and the value words, mapped to their token type. */
const WORD_KEYWORD_TYPES: ReadonlyMap<string, string> = new Map(
  [...ELK_GRAPH_JSON_KEYS, 'true', 'false', 'null'].map((word) => [word, keywordType(word)] as const),
);
/** Quoted keywords by opening quote, mapped to their token type: `"children"` and `'children'`. */
const QUOTED_KEYWORD_TYPES: ReadonlyMap<number, ReadonlyMap<string, string>> = new Map(
  [DOUBLE_QUOTE, SINGLE_QUOTE].map((quote) => {
    const mark = String.fromCharCode(quote);
    return [quote, new Map(ELK_GRAPH_JSON_KEYS.map((key) => [key, keywordType(`${mark}${key}${mark}`)] as const))];
  }),
);
const MAX_KEY_LENGTH = Math.max(...ELK_GRAPH_JSON_KEYS.map((key) => key.length));
const KEY_FIRST_CODES: ReadonlySet<number> = new Set(ELK_GRAPH_JSON_KEYS.map((key) => key.charCodeAt(0)));

function isDigit(code: number): boolean {
  return code >= ZERO && code <= NINE;
}

function isIdStart(code: number): boolean {
  return (code >= LOWER_A && code <= LOWER_Z) || (code >= UPPER_A && code <= UPPER_Z) || code === UNDERSCORE;
}

function isIdPart(code: number): boolean {
  return isIdStart(code) || isDigit(code);
}

function isExponentMark(code: number): boolean {
  return code === LOWER_E || code === UPPER_E;
}

function isSign(code: number): boolean {
  return code === PLUS || code === MINUS;
}

function isWhitespace(code: number): boolean {
  return code === TAB || code === LF || code === CR || code === SPACE;
}

/**
 * Single pass over the input reproducing the token decisions of the generated ANTLR lexer. A rule that fails
 * after being predicted yields a hidden `<invalid>` token over the text the rule consumed (Xtext's lexer) and
 * raises the error flag. The scan methods set `type`/`end`/`failed` for the token starting at `start`.
 *
 * @see org.eclipse.elk.graph.json.text/src-gen/org/eclipse/elk/graph/json/text/parser/antlr/internal/InternalElkGraphJsonLexer.java
 */
class Scanner {
  private type: string = RULE_ANY_OTHER;
  private end = 0;
  private failed = false;
  private hasError = false;

  constructor(private readonly text: string) {}

  run(): JsonLexResult {
    const tokens: ElkGraphJsonToken[] = [];
    const hiddenTypes = HIDDEN_TOKEN_TYPES;
    let start = 0;
    let line = 1;
    while (start < this.text.length) {
      this.scanToken(start);
      const type = this.failed ? INVALID : this.type;
      tokens.push({
        type,
        text: this.text.slice(start, this.end),
        offset: start,
        line,
        hidden: this.failed || hiddenTypes.has(type),
      });
      this.hasError ||= this.failed;
      line += this.countLines(start, this.end);
      start = this.end;
    }
    return { tokens, lexError: this.hasError };
  }

  private countLines(from: number, to: number): number {
    let lines = 0;
    for (let i = from; i < to; i++) {
      if (this.text.charCodeAt(i) === LF) lines++;
    }
    return lines;
  }

  private finish(type: string, end: number): void {
    this.type = type;
    this.end = end;
    this.failed = false;
  }

  private fail(end: number): void {
    this.end = end;
    this.failed = true;
  }

  private scanToken(start: number): void {
    const code = this.text.charCodeAt(start);
    if (isWhitespace(code)) return this.scanWhitespace(start);
    if (isIdStart(code)) return this.scanIdentifier(start, start);
    if (isDigit(code)) return this.scanNumber(start);
    if (isSign(code)) return this.scanSigned(start);
    this.scanOther(start, code);
  }

  private scanOther(start: number, code: number): void {
    if (code === CARET && isIdStart(this.text.charCodeAt(start + 1))) return this.scanIdentifier(start, start + 1);
    if (code === DOUBLE_QUOTE || code === SINGLE_QUOTE) return this.scanQuote(start, code);
    if (code === SLASH) return this.scanSlash(start);
    this.finish(PUNCTUATION_TYPES.get(code) ?? RULE_ANY_OTHER, start + 1);
  }

  private scanWhitespace(start: number): void {
    let i = start + 1;
    while (isWhitespace(this.text.charCodeAt(i))) i++;
    this.finish(RULE_WS, i);
  }

  /** A bare word is a keyword when it is exactly one; a `^`-escaped one is always an ID. */
  private scanIdentifier(start: number, nameStart: number): void {
    let i = nameStart + 1;
    while (isIdPart(this.text.charCodeAt(i))) i++;
    const keyword = start === nameStart ? WORD_KEYWORD_TYPES.get(this.text.slice(start, i)) : undefined;
    this.finish(keyword ?? RULE_ID, i);
  }

  /** A sign starts a number only when a digit follows; otherwise it is ANY_OTHER (there is no `->` keyword). */
  private scanSigned(start: number): void {
    if (isDigit(this.text.charCodeAt(start + 1))) return this.scanNumber(start + 1);
    this.finish(RULE_ANY_OTHER, start + 1);
  }

  private scanDigits(from: number): number {
    let i = from;
    while (isDigit(this.text.charCodeAt(i))) i++;
    return i;
  }

  /**
   * SIGNED_INT or FLOAT after an optional sign. A `.` not followed by a digit makes the FLOAT decision
   * (dfa5) fail without a viable alternative: the lexer recovers by throwing out the first digit.
   */
  private scanNumber(digitsStart: number): void {
    const intEnd = this.scanDigits(digitsStart);
    const next = this.text.charCodeAt(intEnd);
    if (next === DOT) {
      if (!isDigit(this.text.charCodeAt(intEnd + 1))) return this.fail(digitsStart + 1);
      const fractionEnd = this.scanDigits(intEnd + 1);
      if (!isExponentMark(this.text.charCodeAt(fractionEnd))) return this.finish(RULE_FLOAT, fractionEnd);
      return this.scanExponent(fractionEnd);
    }
    if (isExponentMark(next)) return this.scanExponent(intEnd);
    this.finish(RULE_SIGNED_INT, intEnd);
  }

  /** Exponent part at the `e`/`E` at `markAt`: optional sign, then at least one digit. */
  private scanExponent(markAt: number): void {
    let i = markAt + 1;
    if (isSign(this.text.charCodeAt(i))) i++;
    const end = this.scanDigits(i);
    if (end === i) return this.fail(i);
    this.finish(RULE_FLOAT, end);
  }

  /**
   * A quote starts either a quoted keyword (`"id"`, `'id'`) or a STRING. The tokens DFA walks the characters after
   * the quote while they spell a prefix of one of the keys: the closing quote right after a whole key predicts the
   * keyword; any other character predicts STRING; the end of input inside the prefix has no viable alternative and
   * throws out the quote alone. A quote that ends the input is ANY_OTHER.
   */
  private scanQuote(start: number, quote: number): void {
    const keyword = this.matchQuotedKeyword(start, quote);
    if (keyword !== undefined) return this.finish(keyword.type, keyword.end);
    if (start + 1 >= this.text.length) return this.finish(RULE_ANY_OTHER, start + 1);
    if (this.endsInsideKeyPrefix(start)) return this.fail(start + 1);
    this.scanString(start, quote);
  }

  private matchQuotedKeyword(start: number, quote: number): { type: string; end: number } | undefined {
    if (!KEY_FIRST_CODES.has(this.text.charCodeAt(start + 1))) return undefined;
    const close = this.text.indexOf(String.fromCharCode(quote), start + 1);
    if (close < 0) return undefined;
    const type = QUOTED_KEYWORD_TYPES.get(quote)?.get(this.text.slice(start + 1, close));
    return type === undefined ? undefined : { type, end: close + 1 };
  }

  /** True when the text after the quote runs to the end of input while still spelling a prefix of a key. */
  private endsInsideKeyPrefix(start: number): boolean {
    if (this.text.length - start - 1 > MAX_KEY_LENGTH) return false;
    const rest = this.text.slice(start + 1);
    return ELK_GRAPH_JSON_KEYS.some((key) => key.startsWith(rest));
  }

  /** The STRING rule; once predicted it may run to the end of input, where it fails over everything consumed. */
  private scanString(start: number, quote: number): void {
    let i = start + 1;
    while (i < this.text.length) {
      const code = this.text.charCodeAt(i);
      if (code === quote) return this.finish(RULE_STRING, i + 1);
      i += code === BACKSLASH ? 2 : 1;
    }
    this.fail(this.text.length);
  }

  private scanSlash(start: number): void {
    const next = this.text.charCodeAt(start + 1);
    if (next === ASTERISK) return this.scanMultiLineComment(start);
    if (next === SLASH) return this.scanSingleLineComment(start);
    this.finish(RULE_ANY_OTHER, start + 1);
  }

  private scanMultiLineComment(start: number): void {
    const close = this.text.indexOf(ML_COMMENT_CLOSE, start + 2);
    if (close < 0) return this.fail(this.text.length);
    this.finish(RULE_ML_COMMENT, close + ML_COMMENT_CLOSE.length);
  }

  /** `//` to end of line, plus one `\n` or `\r\n`; a `\r` not followed by `\n` fails and eats the next char. */
  private scanSingleLineComment(start: number): void {
    let i = start + 2;
    while (i < this.text.length && this.text.charCodeAt(i) !== LF && this.text.charCodeAt(i) !== CR) i++;
    if (i >= this.text.length) return this.finish(RULE_SL_COMMENT, i);
    if (this.text.charCodeAt(i) === CR) {
      i++;
      if (this.text.charCodeAt(i) !== LF) return this.fail(Math.min(i + 1, this.text.length));
    }
    this.finish(RULE_SL_COMMENT, i + 1);
  }
}

/** Tokenizes `text`, reporting whether the generated lexer would have raised a recognition error. */
export function tokenizeWithDiagnostics(text: string): JsonLexResult {
  return new Scanner(text).run();
}

/** Tokens of `text` (hidden tokens included, no EOF token); concatenating their texts yields `text`. */
export function tokenize(text: string): ElkGraphJsonToken[] {
  return tokenizeWithDiagnostics(text).tokens;
}
