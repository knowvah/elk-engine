// SPDX-License-Identifier: EPL-2.0
import type { LineSource } from '../../../../xtext/parser/LineSource.js';
import type { ParseDiagnostic } from '../../../../xtext/parser/ParseDiagnostic.js';
import { SyntaxFailure } from '../../../../xtext/parser/SyntaxFailure.js';
import type { Token } from '../../../../xtext/parser/Token.js';
import type { GraphvizDotToken } from './GraphvizDotLexer.js';
import { GraphvizDotTokenType, Tok } from './GraphvizDotTokenType.js';

/** `Token.EOR_TOKEN_TYPE`: in a follow set, the rule may end there. */
export const EOR = '<EOR>';

/** A generated `FOLLOW_n` bit set: the token types that may follow a rule or token reference. */
export type FollowSet = ReadonlySet<string>;

/** One diagnostic of the parse, at a node of Xtext's node model (`XtextSyntaxDiagnostic`). */
export interface DotParseDiagnostic extends ParseDiagnostic {
  /** UTF-16 offset of the node. */
  readonly offset: number;
  /** UTF-16 length of the node. */
  readonly length: number;
}

const EOF_DISPLAY = '<EOF>';
const EOF_NAME = 'EOF';
const EOF_TOKEN: Token = { type: Tok.EOF, text: EOF_DISPLAY, offset: -1, line: -1, hidden: false };
const DISPLAY_ESCAPES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\n/g, '\\n'],
  [/\r/g, '\\r'],
  [/\t/g, '\\t'],
];

/** `BaseRecognizer.getTokenErrorDisplay`. */
function display(token: Token): string {
  let text = token.type === Tok.EOF ? EOF_DISPLAY : token.text;
  for (const [pattern, escaped] of DISPLAY_ESCAPES) text = text.replace(pattern, escaped);
  return `'${text}'`;
}

/** The expected token's name in a message (`tokenNames[ttype]`, `EOF` for the end of input). */
function tokenName(type: string): string {
  return type === Tok.EOF ? EOF_NAME : type;
}

/**
 * The parts of the ANTLR 3 runtime and of Xtext's `AbstractInternalAntlrParser` that decide what a DOT parse
 * recovers and where its errors land: the token stream over all tokens with the parser's channel (`CommonTokenStream`:
 * `LT`, `LA`, `consume`, `index`), the follow stack, single-token deletion and insertion in `match`
 * (`recoverFromMismatchedToken`, Xtext's variant inserts nothing), `recover` with `consumeUntil` the combined follow
 * sets, and the `errorRecovery` flag. Xtext attaches a pending error to the next non-hidden leaf node it creates
 * (`newLeafNode`, `appendSkippedTokens`), else to the last leaf at the end; every `<invalid>` token's leaf carries the
 * lexer's message. Port-local substitute: ANTLR and Xtext have no class with this shape.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/AbstractInternalAntlrParser.java
 */
export class GraphvizDotRecognizer {
  readonly diagnostics: DotParseDiagnostic[] = [];
  readonly #tokens: readonly GraphvizDotToken[];
  readonly #lines: LineSource;
  readonly #textLength: number;
  readonly #following: FollowSet[] = [];
  #p: number;
  #errorRecovery = false;
  #lastErrorIndex = -1;
  #currentError: string | null = null;
  #lastConsumedIndex = -1;
  #lastLeaf: GraphvizDotToken | null = null;
  #lastLeafHasError = false;

  constructor(tokens: readonly GraphvizDotToken[], lines: LineSource, textLength: number) {
    this.#tokens = tokens;
    this.#lines = lines;
    this.#textLength = textLength;
    this.#p = this.#skipOffChannel(0);
  }

  // ---- CommonTokenStream ----

  #skipOffChannel(from: number): number {
    let i = from;
    while (i < this.#tokens.length && (this.#tokens[i] as GraphvizDotToken).hidden) i++;
    return i;
  }

  /** The `k`-th next token on the parser's channel (1-based), or the EOF token. */
  LT(k: number): GraphvizDotToken | Token {
    let i = this.#p;
    for (let n = 1; n < k && i < this.#tokens.length; n++) i = this.#skipOffChannel(i + 1);
    return this.#tokens[i] ?? EOF_TOKEN;
  }

  LA(k: number): string {
    return this.LT(k).type;
  }

  /** `LT(-1)`: the last token consumed on the parser's channel. */
  #previous(): GraphvizDotToken | null {
    let i = this.#p - 1;
    while (i >= 0 && (this.#tokens[i] as GraphvizDotToken).hidden) i--;
    return this.#tokens[i] ?? null;
  }

  consume(): void {
    if (this.#p < this.#tokens.length) this.#p = this.#skipOffChannel(this.#p + 1);
  }

  // ---- follow stack (`pushFollow`, `state._fsp--`) ----

  /** Calls a rule with `follow` on the follow stack. */
  call<T>(follow: FollowSet, rule: () => T): T {
    this.#following.push(follow);
    try {
      return rule();
    } finally {
      this.#following.pop();
    }
  }

  /** `BaseRecognizer.combineFollows`: `exact` stops below the first rule whose follow set cannot end it. */
  #combineFollows(exact: boolean): Set<string> {
    const followSet = new Set<string>();
    for (let i = this.#following.length - 1; i >= 0; i--) {
      const local = this.#following[i] as FollowSet;
      for (const type of local) followSet.add(type);
      if (!exact) continue;
      if (!local.has(EOR)) break;
      if (i > 0) followSet.delete(EOR);
    }
    return followSet;
  }

  // ---- matching and recovery ----

  /** `BaseRecognizer.match`: the matched token, the token after a deleted one, or `null` for a missing one. */
  match(type: string, follow: FollowSet): GraphvizDotToken | Token | null {
    const token = this.LT(1);
    if (token.type === type) {
      this.consume();
      this.#errorRecovery = false;
      return token;
    }
    return this.#recoverFromMismatchedToken(type, follow);
  }

  /** @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/AbstractInternalAntlrParser.java:528-559 */
  #recoverFromMismatchedToken(type: string, follow: FollowSet): GraphvizDotToken | Token | null {
    if (this.LA(2) === type) {
      const unwanted = this.LT(1);
      this.consume();
      this.#reportError(`extraneous input ${display(unwanted)} expecting ${tokenName(type)}`);
      const matched = this.LT(1);
      this.consume();
      return matched;
    }
    if (this.#mismatchIsMissingToken(follow)) {
      this.#reportError(`missing ${tokenName(type)} at ${display(this.LT(1))}`);
      return null;
    }
    throw this.#failure(`mismatched input ${display(this.LT(1))} expecting ${tokenName(type)}`, this.LT(1));
  }

  /** `BaseRecognizer.mismatchIsMissingToken`. */
  #mismatchIsMissingToken(follow: FollowSet): boolean {
    let viable = follow;
    if (follow.has(EOR)) {
      const union = new Set([...follow, ...this.#combineFollows(true)]);
      if (this.#following.length > 0) union.delete(EOR);
      viable = union;
    }
    return viable.has(this.LA(1)) || viable.has(EOR);
  }

  /**
   * A recognition failure (ANTLR's `RecognitionException` family) at `token`, with the message Xtext's default
   * `SyntaxErrorMessageProvider` gives it. The port-local `SyntaxFailure` only carries the message to the catch
   * block of the rule; its line is informative (the error's line is the line of the leaf it attaches to).
   */
  #failure(message: string, token: Token): SyntaxFailure {
    return new SyntaxFailure(message, token.line);
  }

  /** A decision found no alternative (`NoViableAltException`) at the `k`-th token. */
  noViableAlt(k = 1): SyntaxFailure {
    return this.#failure(`no viable alternative at input ${display(this.LT(k))}`, this.LT(k));
  }

  /** A `(...)+` loop matched nothing (`EarlyExitException`). */
  earlyExit(): SyntaxFailure {
    return this.#failure(`required (...)+ loop did not match anything at input ${display(this.LT(1))}`, this.LT(1));
  }

  /** @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/AbstractInternalAntlrParser.java:517-526 */
  #reportError(message: string): void {
    if (this.#errorRecovery) return;
    this.#errorRecovery = true;
    this.#currentError ??= message;
  }

  /**
   * The catch block of every generated rule: `recover(input, re)` (Xtext keeps the first pending error; ANTLR's
   * `recover` consumes one token when it fails twice at the same index, then up to the combined follow sets) and
   * `appendSkippedTokens()`. Anything other than a recognition failure propagates.
   *
   * @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/AbstractInternalAntlrParser.java:470-475
   */
  recoverRule(e: unknown): void {
    if (!(e instanceof SyntaxFailure)) throw e;
    this.#currentError ??= e.message;
    if (this.#lastErrorIndex === this.#p) this.consume();
    this.#lastErrorIndex = this.#p;
    const followSet = this.#combineFollows(false);
    while (this.LA(1) !== Tok.EOF && !followSet.has(this.LA(1))) this.consume();
    this.appendSkippedTokens();
  }

  // ---- node model leaves ----

  /** `createLeafNode`: a non-hidden leaf takes the pending error; an `<invalid>` leaf carries the lexer's. */
  #createLeaf(index: number): void {
    const token = this.#tokens[index] as GraphvizDotToken;
    let error: string | null = null;
    if (!token.hidden && this.#currentError !== null) {
      error = this.#currentError;
      this.#currentError = null;
    }
    if (token.type === GraphvizDotTokenType.INVALID && error === null) error = token.lexerError;
    if (error !== null) this.#addSyntaxError(error, token.offset, token.text.length);
    this.#lastLeaf = token;
    this.#lastLeafHasError = error !== null;
  }

  #addSyntaxError(message: string, offset: number, length: number): void {
    const line = this.#lines.startLine({ type: '', text: '', offset, line: 0, hidden: false });
    this.diagnostics.push({ kind: 'syntax', message, line, offset, length });
  }

  /** `newLeafNode`: leaves for the tokens up to a matched one; nothing for a missing (`null`) one. */
  newLeafNode(token: GraphvizDotToken | Token | null): void {
    if (token === null || !('index' in token)) return;
    if (token.index <= this.#lastConsumedIndex) return;
    for (let x = this.#lastConsumedIndex + 1; x < token.index; x++) this.#createLeaf(x);
    this.#lastConsumedIndex = token.index;
    this.#createLeaf(token.index);
  }

  /** `appendSkippedTokens`: leaves for the tokens consumed since the last leaf, up to `LT(-1)`. */
  appendSkippedTokens(): void {
    const current = this.#previous();
    const currentIndex = current === null ? -1 : current.index;
    for (let x = this.#lastConsumedIndex + 1; x <= currentIndex; x++) {
      this.#createLeaf(x);
      this.#lastConsumedIndex = x;
    }
  }

  /**
   * The end of `AbstractInternalAntlrParser.parse`: `appendSkippedTokens`, `appendTrailingHiddenTokens` and
   * `appendAllTokens`, which attaches a still pending error to the last leaf unless that leaf has one already.
   *
   * @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/AbstractInternalAntlrParser.java:401-466
   */
  finish(): void {
    this.appendSkippedTokens();
    for (let x = this.#lastConsumedIndex + 1; x < this.#tokens.length; x++) {
      this.#createLeaf(x);
      this.#lastConsumedIndex = x;
    }
    if (this.#currentError === null) return;
    if (this.#lastLeaf === null) {
      // `getLastLeafNode` falls back to the root node, which spans the whole text
      this.#addSyntaxError(this.#currentError, 0, this.#textLength);
    } else if (!this.#lastLeafHasError) {
      this.#addSyntaxError(this.#currentError, this.#lastLeaf.offset, this.#lastLeaf.text.length);
    }
    this.#currentError = null;
  }

  /** A value-conversion diagnostic (`handleValueConverterException`) at the given node. */
  addConversionError(message: string, offset: number, length: number): void {
    const line = this.#lines.startLine({ type: '', text: '', offset, line: 0, hidden: false });
    this.diagnostics.push({ kind: 'conversion', message, line, offset, length });
  }
}
