// SPDX-License-Identifier: EPL-2.0
import * as JavaDouble from '../../../../java/lang/JavaDouble.js';
import * as JavaInteger from '../../../../java/lang/JavaInteger.js';
import { INTValueConverter } from '../../../../xtext/conversion/impl/INTValueConverter.js';
import { STRINGValueConverter } from '../../../../xtext/conversion/impl/STRINGValueConverter.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import { ValueConverterWithValueException } from '../../../../xtext/conversion/ValueConverterWithValueException.js';
import type { INode } from '../../../../xtext/nodemodel/INode.js';
import type { LineSource } from '../../../../xtext/parser/LineSource.js';
import type { Token } from '../../../../xtext/parser/Token.js';
import { EOF_TOKEN_TYPE, type TokenCursor } from '../../../../xtext/parser/TokenCursor.js';
import { DoubleQuantity } from '../gRandom/DoubleQuantity.js';
import { GRandomTokenType, keywordTokenType } from './GRandomTokenType.js';

/** One syntax or conversion problem; `offset` and `length` are UTF-16 code units. */
export interface GRandomDiagnostic {
  readonly message: string;
  readonly line: number;
  readonly offset: number;
  readonly length: number;
}

/** Token types of the grammar's keywords and terminals, under the names of their literals. */
export const Tok = {
  INT: GRandomTokenType.RULE_INT,
  STRING: GRandomTokenType.RULE_STRING,
  EOF: EOF_TOKEN_TYPE,
  GENERATE: keywordTokenType('generate'),
  LBRACE: keywordTokenType('{'),
  RBRACE: keywordTokenType('}'),
  EQUALS: keywordTokenType('='),
  DOT: keywordTokenType('.'),
  TO: keywordTokenType('to'),
  PM: keywordTokenType('+/-'),
  MAX_WIDTH: keywordTokenType('maxWidth'),
  MAX_DEGREE: keywordTokenType('maxDegree'),
  PARTITION_FRACTION: keywordTokenType('partitionFraction'),
  SEED: keywordTokenType('seed'),
  FORMAT: keywordTokenType('format'),
  FILENAME: keywordTokenType('filename'),
  HIERARCHY: keywordTokenType('hierarchy'),
  LEVELS: keywordTokenType('levels'),
  CROSS_HIERARCHY_EDGES: keywordTokenType('cross-hierarchy edges'),
  COMPOUND_NODES: keywordTokenType('compound nodes'),
  CROSS_HIERARCHY_RELATIVE_EDGES: keywordTokenType('cross-hierarchy relative edges'),
  EDGES: keywordTokenType('edges'),
  DENSITY: keywordTokenType('density'),
  TOTAL: keywordTokenType('total'),
  RELATIVE: keywordTokenType('relative'),
  OUTGOING_EDGES: keywordTokenType('outgoing'),
  INCOMING: keywordTokenType('incoming'),
  LABELS: keywordTokenType('labels'),
  SELF_LOOPS: keywordTokenType('self loops'),
  NODES: keywordTokenType('nodes'),
  REMOVE_ISOLATED: keywordTokenType('remove isolated'),
  SIZE: keywordTokenType('size'),
  HEIGHT: keywordTokenType('height'),
  WIDTH: keywordTokenType('width'),
  PORTS: keywordTokenType('ports'),
  RE_USE: keywordTokenType('re-use'),
  CONSTRAINT: keywordTokenType('constraint'),
} as const;

/** Converter rules of the grammar that the value rules apply. */
const Rule = { INT: 'INT', STRING: 'STRING', INTEGER: 'Integer', DOUBLE: 'Double' } as const;
type RuleName = (typeof Rule)[keyof typeof Rule];

const INT_CONVERTER = new INTValueConverter();
const STRING_CONVERTER = new STRINGValueConverter();

/**
 * `toValue` of each rule. `Integer` and `Double` are `EIntegerObject` and `EDoubleObject`: `Integer.valueOf` and
 * `Double.valueOf` of the text, whose `NumberFormatException` is the failure.
 */
const CONVERTERS: Readonly<Record<RuleName, (text: string, node: INode) => unknown>> = {
  [Rule.INT]: (text, node) => INT_CONVERTER.toValue(text, node),
  [Rule.STRING]: (text, node) => STRING_CONVERTER.toValue(text, node),
  [Rule.INTEGER]: (text) => JavaInteger.valueOf(text),
  [Rule.DOUBLE]: (text) => JavaDouble.parseDouble(text),
};

/** The node a converter sees: the source text of the rule call and its first line. */
class SpanNode implements INode {
  constructor(
    private readonly text: string,
    private readonly line: number,
  ) {}

  getStartLine(): number {
    return this.line;
  }

  getText(): string {
    return this.text;
  }

  getSemanticElement(): null {
    return null;
  }
}

/**
 * The message a conversion failure reports: that of its cause when it has one (`INTValueConverter` wraps the
 * `NumberFormatException`), else its own.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/AbstractInternalAntlrParser.java:477-485
 */
function failureMessage(e: unknown): string {
  if (e instanceof ValueConverterException) {
    const cause = e.cause instanceof Error && e.cause.message !== '' ? e.cause.message : null;
    return cause ?? e.getMessage() ?? e.constructor.name;
  }
  return e instanceof Error ? e.message : String(e);
}

/**
 * The value rules of `GRandom.xtext` (`Double`, `Integer`, `DoubleQuantity` and the terminals `INT` and `STRING`)
 * and the unordered group, over one token cursor. A conversion failure becomes a diagnostic on the node
 * (the whole rule call, inner hidden text included) and parsing goes on with the feature unset, as
 * `DefaultEcoreElementFactory.set` does.
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/GRandom.xtext
 * @see org.eclipse.xtext/src/org/eclipse/xtext/parser/DefaultEcoreElementFactory.java:64-90
 */
export class GRandomValueRules {
  readonly #text: string;
  readonly #cursor: TokenCursor;
  readonly #lines: LineSource;
  readonly conversionErrors: GRandomDiagnostic[] = [];

  constructor(text: string, cursor: TokenCursor, lines: LineSource) {
    this.#text = text;
    this.#cursor = cursor;
    this.#lines = lines;
  }

  /** `feature=INT`. */
  intTerminal(apply: (value: number) => void): void {
    const token = this.#cursor.expect(Tok.INT);
    this.#convert(Rule.INT, token, token, (v) => apply(v as number));
  }

  /** `feature=STRING`. */
  stringTerminal(apply: (value: string) => void): void {
    const token = this.#cursor.expect(Tok.STRING);
    this.#convert(Rule.STRING, token, token, (v) => apply(v as string));
  }

  /** `feature=Integer`: a fractional or out-of-range value is a conversion failure and leaves the feature unset. */
  integer(apply: (value: number) => void): void {
    const span = this.#numberSpan();
    this.#convert(Rule.INTEGER, span[0], span[1], (v) => apply(v as number));
  }

  /**
   * `DoubleQuantity`: `quant=Double | min=Double minMax?='to' max=Double | mean=Double gaussian?=Pm stddv=Double`.
   * The alternative is predicted by the token after the first number.
   */
  doubleQuantity(): DoubleQuantity {
    const quantity = new DoubleQuantity();
    const first = this.#numberSpan();
    if (this.#cursor.type() === Tok.TO) {
      this.#double(first, (v) => quantity.setMin(v));
      this.#cursor.next();
      quantity.setMinMax(true);
      this.#double(this.#numberSpan(), (v) => quantity.setMax(v));
    } else if (this.#cursor.type() === Tok.PM) {
      this.#double(first, (v) => quantity.setMean(v));
      this.#cursor.next();
      quantity.setGaussian(true);
      this.#double(this.#numberSpan(), (v) => quantity.setStddv(v));
    } else {
      this.#double(first, (v) => quantity.setQuant(v));
    }
    return quantity;
  }

  /** The keyword token that maps to an enum literal; a mismatch is a syntax error naming `expected`. */
  enumLiteral<E>(get: (literal: string) => E | null, expected: string): E {
    const token = this.#cursor.peek();
    const value = token.type === keywordTokenType(token.text) ? get(token.text) : null;
    if (value === null) {
      throw this.#cursor.mismatch(expected);
    }
    this.#cursor.next();
    return value;
  }

  /**
   * `INT ('.' INT)?` of the data-type rules: the first and last token of the call.
   *
   * @returns the span's first and last token
   */
  #numberSpan(): readonly [Token, Token] {
    const first = this.#cursor.expect(Tok.INT);
    const last = this.#cursor.accept(Tok.DOT) === null ? first : this.#cursor.expect(Tok.INT);
    return [first, last];
  }

  #double(span: readonly [Token, Token], apply: (value: number) => void): void {
    this.#convert(Rule.DOUBLE, span[0], span[1], (v) => apply(v as number));
  }

  #convert(rule: RuleName, first: Token, last: Token, apply: (value: unknown) => void): void {
    const end = last.offset + last.text.length;
    const node = new SpanNode(this.#text.slice(first.offset, end), this.#lines.startLine(first));
    try {
      apply(CONVERTERS[rule](node.getText(), node));
    } catch (e) {
      if (e instanceof ValueConverterWithValueException) {
        apply(e.getValue());
      }
      this.conversionErrors.push({
        message: failureMessage(e),
        line: node.getStartLine(),
        offset: first.offset,
        length: end - first.offset,
      });
    }
  }
}

/** One member of an unordered group: the tokens that start it, and its parse (start token still next). */
export interface GroupMember {
  readonly starts: readonly string[];
  parse(): void;
}

/**
 * An unordered group (`a? & b? & ...`): each member at most once, in any order. A member repeated, or a token
 * that starts none, ends the group; the caller's next expectation then reports the error. A member that is an
 * iteration (`flow+=Flow)*`) consumes all its repetitions in one visit, so they must be contiguous.
 */
export function unorderedGroup(cursor: TokenCursor, members: readonly GroupMember[]): void {
  const open = new Set(members);
  const pick = (): GroupMember | undefined => [...open].find((m) => m.starts.includes(cursor.type()));
  for (let member = pick(); member !== undefined; member = pick()) {
    open.delete(member);
    member.parse();
  }
}
