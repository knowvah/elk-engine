// SPDX-License-Identifier: EPL-2.0
import { UnsupportedOperationException } from '../../lang/UnsupportedOperationException.js';
import { WORD_BOUNDARY_SOURCE } from './WordBoundary.js';

/** `Pattern.CASE_INSENSITIVE` (Javadoc constant value). */
const CASE_INSENSITIVE = 0x02;
/** `Pattern.DOTALL` (Javadoc constant value). */
const DOTALL = 0x20;

const QUOTE_START = '\\Q';
const QUOTE_END = '\\E';
/** What `Pattern.quote` emits for an embedded `\E`: end the quote, a literal `\` and `E`, restart it. */
const QUOTED_END_ESCAPE = '\\E\\\\E\\Q';
const WORD_ANCHOR = '\\b';
const BLANK_CLASS = '[\\h\\v]';
const STAR = '*';

/** `\h` = `[ \t\xA0 ᠎ -   　]`, `\v` = `[\n\x0B\f\r\x85  ]`. */
const BLANK_REPEATED =
  '[ \\t\\xA0\\u1680\\u180e\\u2000-\\u200a\\u202f\\u205f\\u3000\\n\\x0B\\f\\r\\x85\\u2028\\u2029]*';

const REGEXP_SPECIALS = /[\\^$.*+?()[\]{}|/-]/;
const ASCII_LETTER = /[A-Za-z]/;

/** The result of `Pattern.matcher`. */
export interface Matcher {
  /** `Matcher.find()`: true when some subsequence of the text matches the pattern. */
  find(): boolean;
}

function escapeLiteral(ch: string): string {
  return REGEXP_SPECIALS.test(ch) ? `\\${ch}` : ch;
}

function literalToSource(literal: string, caseInsensitive: boolean): string {
  let out = '';
  for (const ch of literal) {
    out += caseInsensitive && ASCII_LETTER.test(ch) ? `[${ch.toLowerCase()}${ch.toUpperCase()}]` : escapeLiteral(ch);
  }
  return out;
}

/** Reads the content of a quote opened just before `from`; returns the text and the index after `\E`. */
function readQuoted(regex: string, from: number): { text: string; next: number } {
  let text = '';
  let pos = from;
  for (;;) {
    const end = regex.indexOf(QUOTE_END, pos);
    if (end < 0) {
      return { text: text + regex.slice(pos), next: regex.length };
    }
    text += regex.slice(pos, end);
    if (regex.startsWith(QUOTED_END_ESCAPE, end)) {
      text += QUOTE_END;
      pos = end + QUOTED_END_ESCAPE.length;
    } else {
      return { text, next: end + QUOTE_END.length };
    }
  }
}

/** Translates the supported grammar into JS RegExp source; throws on anything else. */
function translate(regex: string, caseInsensitive: boolean): string {
  let source = '';
  let pos = 0;
  while (pos < regex.length) {
    if (regex.startsWith(QUOTE_START, pos)) {
      const quoted = readQuoted(regex, pos + QUOTE_START.length);
      source += literalToSource(quoted.text, caseInsensitive);
      pos = quoted.next;
    } else if (regex.startsWith(WORD_ANCHOR, pos)) {
      source += WORD_BOUNDARY_SOURCE;
      pos += WORD_ANCHOR.length;
    } else if (regex.startsWith(BLANK_CLASS + STAR, pos)) {
      source += BLANK_REPEATED;
      pos += BLANK_CLASS.length + STAR.length;
    } else {
      throw new UnsupportedOperationException(
        `Unsupported regex construct '${regex.slice(pos, pos + 2)}' at index ${pos} in: ${regex}`,
      );
    }
  }
  return source;
}

/**
 * Narrow `java.util.regex.Pattern`: supports `\b`, `\Q...\E` quotes, `[\h\v]*`, concatenation, and
 * the `DOTALL` / `CASE_INSENSITIVE` flags. Everything else throws `UnsupportedOperationException`.
 * `DOTALL` is accepted but has no observable effect, since the grammar has no `.`.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/regex/Pattern.html
 */
export class Pattern {
  static readonly CASE_INSENSITIVE: number = CASE_INSENSITIVE;
  static readonly DOTALL: number = DOTALL;

  private readonly compiled: RegExp;

  private constructor(
    private readonly regex: string,
    private readonly flagBits: number,
  ) {
    const unsupported = flagBits & ~(CASE_INSENSITIVE | DOTALL);
    if (unsupported !== 0) {
      throw new UnsupportedOperationException(`Unsupported regex flags: ${unsupported}`);
    }
    this.compiled = new RegExp(translate(regex, (flagBits & CASE_INSENSITIVE) !== 0));
  }

  /**
   * `Pattern.quote`: `\Q` + s + `\E`, with each embedded `\E` rewritten as `\E\\E\Q`.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/regex/Pattern.html#quote(java.lang.String)
   */
  static quote(s: string): string {
    return QUOTE_START + s.split(QUOTE_END).join(QUOTED_END_ESCAPE) + QUOTE_END;
  }

  static compile(regex: string, flags = 0): Pattern {
    return new Pattern(regex, flags);
  }

  pattern(): string {
    return this.regex;
  }

  flags(): number {
    return this.flagBits;
  }

  matcher(text: string): Matcher {
    const compiled = this.compiled;
    return { find: () => compiled.test(text) };
  }
}
