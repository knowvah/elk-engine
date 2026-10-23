// SPDX-License-Identifier: EPL-2.0

import { GRANDOM_KEYWORDS, GRandomTokenType, HIDDEN_TOKEN_TYPES, keywordTokenType } from './GRandomTokenType.js';

/**
 * One lexer token; `offset` is the UTF-16 index of its first code unit, `line` the 1-based line there (LF-only, as
 * ANTLR counts). Structurally the parse runtime's `Token` (`src/xtext/parser/Token.ts`).
 */
export interface GRandomToken {
  readonly type: string;
  readonly text: string;
  readonly offset: number;
  readonly line: number;
  readonly hidden: boolean;
}

export interface GRandomLexResult {
  readonly tokens: GRandomToken[];
  /** True when the generated lexer's `reportError` fired (presence only). */
  readonly lexError: boolean;
}

const TAB = 0x09;
const LF = 0x0a;
const CR = 0x0d;
const SPACE = 0x20;
const DOUBLE_QUOTE = 0x22;
const SINGLE_QUOTE = 0x27;
const SLASH = 0x2f;
const ZERO = 0x30;
const NINE = 0x39;
const UPPER_A = 0x41;
const UPPER_Z = 0x5a;
const CARET = 0x5e;
const UNDERSCORE = 0x5f;
const LOWER_A = 0x61;
const LOWER_Z = 0x7a;
const BACKSLASH = 0x5c;
const ASTERISK = 0x2a;

const { RULE_ID, RULE_STRING, RULE_INT, RULE_WS, RULE_ANY_OTHER, INVALID } = GRandomTokenType;
const { RULE_ML_COMMENT, RULE_SL_COMMENT } = GRandomTokenType;

const ML_COMMENT_CLOSE = '*/';
const WORD_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Keywords spelled like an ID: a keyword only when the whole ID is exactly one. */
const WORD_KEYWORDS: ReadonlySet<string> = new Set(GRANDOM_KEYWORDS.filter((k) => WORD_PATTERN.test(k)));
/** One-character keywords (`{`, `}`, `=`, `.`), keyed by code unit. */
const PUNCTUATION_TYPES: ReadonlyMap<number, string> = new Map(
  GRANDOM_KEYWORDS.filter((k) => k.length === 1 && !WORD_PATTERN.test(k)).map((k) => [
    k.charCodeAt(0),
    keywordTokenType(k),
  ]),
);
/** Multi-character keywords that are not an ID: those with a space, `-` or `+/` in them. */
const COMPOUND_KEYWORDS: readonly string[] = GRANDOM_KEYWORDS.filter((k) => k.length > 1 && !WORD_PATTERN.test(k));
const COMPOUND_FIRST_CODES: ReadonlySet<number> = new Set(COMPOUND_KEYWORDS.map((k) => k.charCodeAt(0)));

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

/**
 * Single pass over the input reproducing the token decisions of the generated ANTLR lexer. A rule that fails
 * after being predicted yields a hidden `<invalid>` token over the text the rule consumed (Xtext's lexer) and
 * raises the error flag. The scan methods set `type`/`end`/`failed` for the token starting at `start`.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/parser/antlr/internal/InternalGRandomLexer.java
 */
class Scanner {
  private type: string = RULE_ANY_OTHER;
  private end = 0;
  private failed = false;
  private hasError = false;

  constructor(private readonly text: string) {}

  run(): GRandomLexResult {
    const tokens: GRandomToken[] = [];
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
        hidden: this.failed || HIDDEN_TOKEN_TYPES.has(type),
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
    if (COMPOUND_FIRST_CODES.has(code) && this.scanCompound(start)) return;
    if (isWhitespace(code)) return this.scanWhitespace(start);
    if (isIdStart(code)) return this.scanIdentifier(start, start);
    if (isDigit(code)) return this.scanInteger(start);
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
    const word = this.text.slice(start, i);
    const isKeyword = start === nameStart && WORD_KEYWORDS.has(word);
    this.finish(isKeyword ? keywordTokenType(word) : RULE_ID, i);
  }

  private scanInteger(start: number): void {
    let i = start + 1;
    while (isDigit(this.text.charCodeAt(i))) i++;
    this.finish(RULE_INT, i);
  }

  /**
   * Walks the prefix of the compound keywords the way the tokens DFA does. While the ID rule (or, for the first
   * character, ANY_OTHER) is still a rival, a character that continues a keyword is looked at: a keyword's space,
   * `-` or `/` wins the conflict, an ID character keeps both alive, anything else ends the walk in favour of the
   * rival (returns false). Once no rival is left, the sole remaining keyword is predicted and matched
   * character by character; with several left, a character that continues none has no viable alternative and the
   * lexer throws out the first character alone.
   */
  private scanCompound(start: number): boolean {
    let candidates = COMPOUND_KEYWORDS;
    let matched = 0;
    let onlyIdChars = true;
    for (;;) {
      const rival = onlyIdChars || matched <= 1;
      if (!rival && candidates.length === 1) return this.matchKeyword(start, candidates[0]!, matched);
      const ch = this.text.charAt(start + matched);
      const index = matched;
      candidates = ch === '' ? [] : candidates.filter((k) => k[index] === ch);
      if (candidates.length === 0) return this.noViableAlternative(start, rival);
      onlyIdChars &&= isIdPart(ch.charCodeAt(0));
      matched++;
    }
  }

  /** No keyword continues: the rival rule takes the token (false), or without one the first character is thrown out. */
  private noViableAlternative(start: number, rival: boolean): boolean {
    if (rival) return false;
    this.fail(start + 1);
    return true;
  }

  /** `match("keyword")` from character `matched` on: a mismatch consumes one more character (`recover`). */
  private matchKeyword(start: number, keyword: string, matched: number): boolean {
    for (let i = matched; i < keyword.length; i++) {
      if (this.text[start + i] !== keyword[i]) {
        this.fail(Math.min(start + i + 1, this.text.length));
        return true;
      }
    }
    this.finish(keywordTokenType(keyword), start + keyword.length);
    return true;
  }

  /** A quote that ends the input is ANY_OTHER; otherwise the STRING rule is predicted. */
  private scanQuote(start: number, quote: number): void {
    if (start + 1 >= this.text.length) return this.finish(RULE_ANY_OTHER, start + 1);
    this.scanString(start, quote);
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
export function tokenizeWithDiagnostics(text: string): GRandomLexResult {
  return new Scanner(text).run();
}

/** Tokens of `text` (hidden tokens included, no EOF token); concatenating their texts yields `text`. */
export function tokenize(text: string): GRandomToken[] {
  return tokenizeWithDiagnostics(text).tokens;
}
