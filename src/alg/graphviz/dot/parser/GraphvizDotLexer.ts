// SPDX-License-Identifier: EPL-2.0
import type { Token } from '../../../../xtext/parser/Token.js';
import { GraphvizDotTokenType, HIDDEN_TOKEN_TYPES } from './GraphvizDotTokenType.js';

/**
 * One lexer token: `hidden` covers the grammar's hidden terminals and the error token (both off the parser's
 * channel), `index` is the position in the token list (ANTLR's `getTokenIndex`), `lexerError` the message of the
 * failed rule for an `<invalid>` token (`Lexer.getErrorMessage`), otherwise `null`.
 */
export interface GraphvizDotToken extends Token {
  readonly index: number;
  readonly lexerError: string | null;
}

export interface LexResult {
  readonly tokens: GraphvizDotToken[];
  /** True when the generated lexer's `reportError` fired. */
  readonly lexError: boolean;
}

const TAB = 0x09;
const LF = 0x0a;
const CR = 0x0d;
const SPACE = 0x20;
const DOUBLE_QUOTE = 0x22;
const HASH = 0x23;
const ASTERISK = 0x2a;
const MINUS = 0x2d;
const DOT = 0x2e;
const SLASH = 0x2f;
const ZERO = 0x30;
const NINE = 0x39;
const GREATER_THAN = 0x3e;
const UPPER_A = 0x41;
const UPPER_Z = 0x5a;
const BACKSLASH = 0x5c;
const UNDERSCORE = 0x5f;
const LOWER_A = 0x61;
const LOWER_Z = 0x7a;

const ML_COMMENT_CLOSE = '*/';
const EOF_DISPLAY = '<EOF>';
const CHAR_DISPLAY: ReadonlyMap<number, string> = new Map([
  [LF, '\\n'],
  [TAB, '\\t'],
  [CR, '\\r'],
]);

const PUNCTUATION_TYPES: ReadonlyMap<number, string> = new Map(
  (
    [
      ['{', GraphvizDotTokenType.T__14],
      ['}', GraphvizDotTokenType.T__15],
      [';', GraphvizDotTokenType.T__16],
      ['=', GraphvizDotTokenType.T__17],
      ['[', GraphvizDotTokenType.T__18],
      [',', GraphvizDotTokenType.T__19],
      [']', GraphvizDotTokenType.T__20],
      [':', GraphvizDotTokenType.T__21],
    ] as const
  ).map(([char, type]) => [char.charCodeAt(0), type] as const),
);
const WORD_KEYWORD_TYPES: ReadonlyMap<string, string> = new Map(
  [
    GraphvizDotTokenType.T__13,
    GraphvizDotTokenType.T__22,
    GraphvizDotTokenType.T__25,
    GraphvizDotTokenType.T__26,
    GraphvizDotTokenType.T__27,
    GraphvizDotTokenType.T__28,
  ].map((type) => [type.slice(1, -1), type] as const),
);

function isDigit(code: number): boolean {
  return code >= ZERO && code <= NINE;
}

function isIdStart(code: number): boolean {
  return (code >= LOWER_A && code <= LOWER_Z) || (code >= UPPER_A && code <= UPPER_Z) || code === UNDERSCORE;
}

function isIdPart(code: number): boolean {
  return isIdStart(code) || isDigit(code);
}

function isWhitespace(code: number): boolean {
  return code === TAB || code === LF || code === CR || code === SPACE;
}

/** ANTLR `Lexer.getCharErrorDisplay`; `NaN` (past the end) is `EOF`. */
function charDisplay(code: number): string {
  if (Number.isNaN(code)) return `'${EOF_DISPLAY}'`;
  return `'${CHAR_DISPLAY.get(code) ?? String.fromCharCode(code)}'`;
}

/** ANTLR `Lexer.getErrorMessage` of a `MismatchedTokenException`. */
function mismatchedCharacter(found: number, expecting: number): string {
  return `mismatched character ${charDisplay(found)} expecting ${charDisplay(expecting)}`;
}

/**
 * Single pass over the input reproducing the token decisions of the generated ANTLR lexer (its `mTokens` DFA16
 * and the rule bodies). A rule that fails after being predicted yields a hidden `<invalid>` token over the text the
 * rule consumed (Xtext's `Lexer.nextToken`): a mismatched character is consumed by `recover` (none at the end of
 * input), an early exit of a `(...)+` loop is not. The scan methods set `type`/`end`/`error` for the token at `start`.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/parser/antlr/internal/InternalGraphvizDotLexer.java
 * @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/Lexer.java:51-88
 */
class Scanner {
  private type: string = GraphvizDotTokenType.RULE_ANY_OTHER;
  private end = 0;
  private error: string | null = null;

  constructor(private readonly text: string) {}

  run(): LexResult {
    const tokens: GraphvizDotToken[] = [];
    let start = 0;
    let line = 1;
    while (start < this.text.length) {
      this.scanToken(start);
      const type = this.error === null ? this.type : GraphvizDotTokenType.INVALID;
      tokens.push({
        type,
        text: this.text.slice(start, this.end),
        offset: start,
        line,
        hidden: this.error !== null || HIDDEN_TOKEN_TYPES.has(type),
        index: tokens.length,
        lexerError: this.error,
      });
      line += this.countLines(start, this.end);
      start = this.end;
    }
    return { tokens, lexError: tokens.some((t) => t.lexerError !== null) };
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
    this.error = null;
  }

  private fail(end: number, message: string): void {
    this.end = end;
    this.error = message;
  }

  private scanToken(start: number): void {
    const code = this.text.charCodeAt(start);
    if (isWhitespace(code)) return this.scanWhitespace(start);
    if (isIdStart(code)) return this.scanIdentifier(start);
    if (isDigit(code)) return this.scanNumber(start);
    if (code === MINUS) return this.scanMinus(start);
    this.scanOther(start, code);
  }

  private scanOther(start: number, code: number): void {
    if (code === DOT && isDigit(this.text.charCodeAt(start + 1))) return this.scanFraction(start);
    if (code === DOUBLE_QUOTE) return this.scanString(start);
    if (code === HASH) return this.scanLineRest(start + 1, GraphvizDotTokenType.RULE_PREC_LINE);
    if (code === SLASH) return this.scanSlash(start);
    this.finish(PUNCTUATION_TYPES.get(code) ?? GraphvizDotTokenType.RULE_ANY_OTHER, start + 1);
  }

  private scanWhitespace(start: number): void {
    let i = start + 1;
    while (isWhitespace(this.text.charCodeAt(i))) i++;
    this.finish(GraphvizDotTokenType.RULE_WS, i);
  }

  /** The keywords are case sensitive and win only over the exact word (DFA16 falls back to `RULE_ID`). */
  private scanIdentifier(start: number): void {
    let i = start + 1;
    while (isIdPart(this.text.charCodeAt(i))) i++;
    this.finish(WORD_KEYWORD_TYPES.get(this.text.slice(start, i)) ?? GraphvizDotTokenType.RULE_ID, i);
  }

  /** `->`, `--`, a signed number (`-` then a digit or `.`: always `RULE_INT`/`RULE_FLOAT`), else `RULE_ANY_OTHER`. */
  private scanMinus(start: number): void {
    const next = this.text.charCodeAt(start + 1);
    if (next === GREATER_THAN) return this.finish(GraphvizDotTokenType.T__23, start + 2);
    if (next === MINUS) return this.finish(GraphvizDotTokenType.T__24, start + 2);
    if (isDigit(next)) return this.scanNumber(start + 1);
    if (next === DOT) return this.scanFraction(start + 1);
    this.finish(GraphvizDotTokenType.RULE_ANY_OTHER, start + 1);
  }

  private scanDigits(from: number): number {
    let i = from;
    while (isDigit(this.text.charCodeAt(i))) i++;
    return i;
  }

  /** Digits followed by `.` predict `RULE_FLOAT` (DFA16 states 15/36), otherwise `RULE_INT`. */
  private scanNumber(digitsStart: number): void {
    const intEnd = this.scanDigits(digitsStart);
    if (this.text.charCodeAt(intEnd) === DOT) return this.scanFraction(intEnd);
    this.finish(GraphvizDotTokenType.RULE_INT, intEnd);
  }

  /** `'.' ('0'..'9')+` of `RULE_FLOAT` at `dotAt`: an empty fraction is an early exit that consumes nothing more. */
  private scanFraction(dotAt: number): void {
    const end = this.scanDigits(dotAt + 1);
    if (end > dotAt + 1) return this.finish(GraphvizDotTokenType.RULE_FLOAT, end);
    const at = this.text.charCodeAt(end);
    this.fail(end, `required (...)+ loop did not match anything at character ${charDisplay(at)}`);
  }

  /**
   * `'"' ('\\' '"' | !'"')* '"'`, predicted when any character follows the quote. ANTLR's loop decision takes the
   * escape alternative for `\"` only if a third character follows; at the end of input the `\` is a plain character
   * and the `"` closes the string.
   */
  private scanString(start: number): void {
    if (start + 1 >= this.text.length) return this.finish(GraphvizDotTokenType.RULE_ANY_OTHER, start + 1);
    let i = start + 1;
    while (i < this.text.length) {
      const code = this.text.charCodeAt(i);
      if (code === DOUBLE_QUOTE) return this.finish(GraphvizDotTokenType.RULE_STRING, i + 1);
      const escape = code === BACKSLASH && this.text.charCodeAt(i + 1) === DOUBLE_QUOTE && i + 2 < this.text.length;
      i += escape ? 2 : 1;
    }
    this.fail(this.text.length, mismatchedCharacter(NaN, DOUBLE_QUOTE));
  }

  private scanSlash(start: number): void {
    const next = this.text.charCodeAt(start + 1);
    if (next === ASTERISK) return this.scanMultiLineComment(start);
    if (next === SLASH) return this.scanLineRest(start + 2, GraphvizDotTokenType.RULE_SL_COMMENT);
    this.finish(GraphvizDotTokenType.RULE_ANY_OTHER, start + 1);
  }

  /** An unclosed comment fails at the end of input on the star of the closing pair, or on its slash after a final star. */
  private scanMultiLineComment(start: number): void {
    const close = this.text.indexOf(ML_COMMENT_CLOSE, start + 2);
    if (close >= 0) return this.finish(GraphvizDotTokenType.RULE_ML_COMMENT, close + ML_COMMENT_CLOSE.length);
    const last = this.text.length - 1;
    const closingStarted = last >= start + 2 && this.text.charCodeAt(last) === ASTERISK;
    this.fail(this.text.length, mismatchedCharacter(NaN, closingStarted ? SLASH : ASTERISK));
  }

  /**
   * `PREC_LINE` and `SL_COMMENT`: the rest of the line, then an optional `\n` or `\r\n`. A `\r` not followed by `\n`
   * fails the match of `\n`, and `recover` consumes the character after the `\r`.
   */
  private scanLineRest(from: number, type: string): void {
    let i = from;
    while (i < this.text.length && this.text.charCodeAt(i) !== LF && this.text.charCodeAt(i) !== CR) i++;
    if (i >= this.text.length) return this.finish(type, i);
    if (this.text.charCodeAt(i) === LF) return this.finish(type, i + 1);
    const next = this.text.charCodeAt(i + 1);
    if (next === LF) return this.finish(type, i + 2);
    this.fail(Math.min(i + 2, this.text.length), mismatchedCharacter(next, LF));
  }
}

/** Tokenizes `text`, reporting whether the generated lexer would have raised a recognition error. */
export function tokenizeWithDiagnostics(text: string): LexResult {
  return new Scanner(text).run();
}

/** Tokens of `text` (hidden tokens included, no EOF token); concatenating their texts yields `text`. */
export function tokenize(text: string): GraphvizDotToken[] {
  return tokenizeWithDiagnostics(text).tokens;
}
