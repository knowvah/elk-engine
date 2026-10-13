// SPDX-License-Identifier: EPL-2.0
import { MelkSyntaxError } from './ast.js';

export type TokenKind = 'id' | 'string' | 'number' | 'punct' | 'eof';

export interface Token {
  readonly kind: TokenKind;
  /** Identifier name without `^`, string content with escapes resolved, number source, or punctuation. */
  readonly text: string;
  /** True for an identifier written with the `^` escape (never a keyword). */
  readonly escaped: boolean;
  readonly line: number;
  readonly column: number;
}

const PUNCTUATION = new Set([
  '{',
  '}',
  '(',
  ')',
  '[',
  ']',
  ',',
  '.',
  ':',
  '=',
  '#',
  '/',
  '-',
  '<',
  '>',
  '*',
  '|',
  '+',
  '!',
  '?',
  '&',
  ';',
  '%',
  '~',
]);
const ESCAPES: Readonly<Record<string, string>> = {
  b: '\b',
  t: '\t',
  n: '\n',
  f: '\f',
  r: '\r',
};
const UNICODE_ESCAPE_LENGTH = 4;
const NUMBER_SUFFIXES = 'lLdDfF';

const isDigit = (c: string): boolean => c >= '0' && c <= '9';
const isIdStart = (c: string): boolean => /[A-Za-z$_]/.test(c);
const isIdPart = (c: string): boolean => /[A-Za-z0-9$_]/.test(c);

/** Cursor over the source text with line/column tracking. */
class Scanner {
  pos = 0;
  line = 1;
  column = 1;

  constructor(
    readonly text: string,
    readonly fileName: string,
  ) {}

  get done(): boolean {
    return this.pos >= this.text.length;
  }

  peek(offset = 0): string {
    return this.text.charAt(this.pos + offset);
  }

  advance(): string {
    const c = this.text.charAt(this.pos++);
    if (c === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return c;
  }

  fail(message: string, line = this.line, column = this.column): never {
    throw new MelkSyntaxError(message, this.fileName, line, column);
  }

  takeWhile(predicate: (c: string) => boolean): string {
    let out = '';
    while (!this.done && predicate(this.peek())) out += this.advance();
    return out;
  }
}

function skipTrivia(s: Scanner): void {
  for (;;) {
    s.takeWhile((c) => c === ' ' || c === '\t' || c === '\r' || c === '\n');
    if (s.peek() === '/' && s.peek(1) === '/') {
      s.takeWhile((c) => c !== '\n');
    } else if (s.peek() === '/' && s.peek(1) === '*') {
      skipBlockComment(s);
    } else {
      return;
    }
  }
}

function skipBlockComment(s: Scanner): void {
  const { line, column } = s;
  s.advance();
  s.advance();
  while (!(s.peek() === '*' && s.peek(1) === '/')) {
    if (s.done) s.fail('unterminated comment', line, column);
    s.advance();
  }
  s.advance();
  s.advance();
}

function readEscape(s: Scanner): string {
  const { line, column } = s;
  s.advance();
  if (s.done) s.fail('unterminated string', line, column);
  const c = s.advance();
  if (c !== 'u') return ESCAPES[c] ?? c;
  let hex = '';
  while (hex.length < UNICODE_ESCAPE_LENGTH && /[0-9a-fA-F]/.test(s.peek())) hex += s.advance();
  if (hex.length < UNICODE_ESCAPE_LENGTH) s.fail('invalid unicode escape', line, column);
  return String.fromCharCode(Number.parseInt(hex, 16));
}

function readString(s: Scanner, line: number, column: number): Token {
  const quote = s.advance();
  let text = '';
  while (s.peek() !== quote) {
    if (s.done) s.fail('unterminated string', line, column);
    text += s.peek() === '\\' ? readEscape(s) : s.advance();
  }
  s.advance();
  return { kind: 'string', text, escaped: false, line, column };
}

function readIdentifier(s: Scanner, line: number, column: number): Token {
  const escaped = s.peek() === '^';
  if (escaped) s.advance();
  if (!isIdStart(s.peek())) s.fail('identifier expected after ^');
  const text = s.takeWhile(isIdPart);
  return { kind: 'id', text, escaped, line, column };
}

function readExponent(s: Scanner): string {
  const sign = s.peek(1) === '+' || s.peek(1) === '-' ? 1 : 0;
  if (!isDigit(s.peek(1 + sign))) return '';
  let out = s.advance();
  if (sign) out += s.advance();
  return out + s.takeWhile(isDigit);
}

function readNumber(s: Scanner, line: number, column: number): Token {
  let text = s.takeWhile((c) => isDigit(c) || c === '_');
  if (s.peek() === '.' && isDigit(s.peek(1))) {
    text += s.advance() + s.takeWhile(isDigit);
  }
  if (s.peek() === 'e' || s.peek() === 'E') text += readExponent(s);
  if (s.peek() !== '' && NUMBER_SUFFIXES.includes(s.peek())) text += s.advance();
  return { kind: 'number', text, escaped: false, line, column };
}

function readToken(s: Scanner): Token {
  const { line, column } = s;
  const c = s.peek();
  if (c === '"' || c === "'") return readString(s, line, column);
  if (c === '^' || isIdStart(c)) return readIdentifier(s, line, column);
  if (isDigit(c)) return readNumber(s, line, column);
  if (c === '=' && s.peek(1) === '=') {
    s.advance();
    s.advance();
    return { kind: 'punct', text: '==', escaped: false, line, column };
  }
  if (PUNCTUATION.has(c)) {
    s.advance();
    return { kind: 'punct', text: c, escaped: false, line, column };
  }
  return s.fail(`unexpected character '${c}'`);
}

/** Tokenizes `.melk` source text; the last token is always `eof`. */
export function lex(text: string, fileName: string): Token[] {
  const s = new Scanner(text, fileName);
  const tokens: Token[] = [];
  for (;;) {
    skipTrivia(s);
    if (s.done) break;
    tokens.push(readToken(s));
  }
  tokens.push({ kind: 'eof', text: '', escaped: false, line: s.line, column: s.column });
  return tokens;
}
