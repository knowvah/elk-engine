// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { EList } from '../../../emf/common/util/EList.js';
import type { IValueConverterService } from '../../../xtext/conversion/IValueConverterService.js';
import { ValueConverterException } from '../../../xtext/conversion/ValueConverterException.js';
import { ValueConverterWithValueException } from '../../../xtext/conversion/ValueConverterWithValueException.js';
import type { ICrossReferenceNode } from '../../../xtext/nodemodel/ICrossReferenceNode.js';
import type { INode } from '../../../xtext/nodemodel/INode.js';
import type { INodeModel } from '../../../xtext/nodemodel/INodeModel.js';
import type { EStructuralFeature } from '../../../xtext/validation/EStructuralFeature.js';
import type { ContainmentSlot, IssueLocator } from '../../../xtext/validation/IssueLocator.js';
import type { ElkNode } from '../../ElkNode.js';
import type { ElkGraphToken } from './ElkGraphLexer.js';
import { ElkGraphTokenType as T } from './ElkGraphTokenType.js';

/** Token types of the grammar under the names of their keyword literals. */
export const Tok = {
  ID: T.RULE_ID,
  STRING: T.RULE_STRING,
  SIGNED_INT: T.RULE_SIGNED_INT,
  FLOAT: T.RULE_FLOAT,
  INVALID: T.INVALID,
  EOF: '<EOF>',
  GRAPH: T.T__13,
  NODE: T.T__14,
  LBRACE: T.T__15,
  RBRACE: T.T__16,
  LABEL: T.T__17,
  COLON: T.T__18,
  PORT: T.T__19,
  LAYOUT: T.T__20,
  LBRACKET: T.T__21,
  POSITION: T.T__22,
  COMMA: T.T__23,
  SIZE: T.T__24,
  RBRACKET: T.T__25,
  EDGE: T.T__26,
  ARROW: T.T__27,
  INCOMING: T.T__28,
  OUTGOING: T.T__29,
  START: T.T__30,
  END: T.T__31,
  BENDS: T.T__32,
  BAR: T.T__33,
  SECTION: T.T__34,
  DOT: T.T__35,
  NULL: T.T__36,
  TRUE: T.T__37,
  FALSE: T.T__38,
} as const;

/** Rule names passed to the value converter service. */
export const RuleName = {
  ID: 'ID',
  STRING: 'STRING',
  NUMBER: 'Number',
  PROPERTY_KEY: 'PropertyKey',
  STRING_VALUE: 'StringValue',
  QUALIFIED_ID_VALUE: 'QualifiedIdValue',
  NUMBER_VALUE: 'NumberValue',
  BOOLEAN_VALUE: 'BooleanValue',
  QUALIFIED_ID: 'QualifiedId',
} as const;

export interface ParseDiagnostic {
  readonly kind: 'syntax' | 'conversion';
  readonly message: string;
  readonly line: number;
}

/** One cross-reference occurrence of the Phase 5 contract. */
export interface ReferenceRecord {
  readonly owner: EObject;
  readonly feature: string;
  readonly index: number;
  readonly ruleName: string;
  readonly text: string;
  readonly line: number;
}

/**
 * A recorded cross reference: both the record and the node-model view of it. `text` is
 * `NodeModelUtils.getTokenText`: the non-hidden tokens, one blank where hidden tokens separated them.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/nodemodel/util/NodeModelUtils.java (getTokenText)
 */
export class ReferenceNode implements ICrossReferenceNode, ReferenceRecord {
  readonly owner: EObject;
  readonly feature: string;
  readonly index: number;
  readonly ruleName: string;
  readonly text: string;
  readonly line: number;

  constructor(record: ReferenceRecord) {
    this.owner = record.owner;
    this.feature = record.feature;
    this.index = record.index;
    this.ruleName = record.ruleName;
    this.text = record.text;
    this.line = record.line;
  }

  getStartLine(): number {
    return this.line;
  }

  getText(): string {
    return this.text;
  }

  getSemanticElement(): EObject {
    return this.owner;
  }
}

export interface ParseResult {
  root: ElkNode | null;
  diagnostics: ParseDiagnostic[];
  references: ReferenceNode[];
  nodeModel: INodeModel;
  positions: IssueLocator;
}

/** The first syntax error: parsing stops (G5, presence only). */
export class SyntaxFailure extends Error {
  readonly line: number;

  constructor(message: string, line: number) {
    super(message);
    this.name = 'SyntaxFailure';
    this.line = line;
  }
}

/** The minimal node handed to a value converter: owner, token text and first line. */
class ConversionNode implements INode {
  constructor(
    private readonly owner: EObject,
    private readonly text: string,
    private readonly line: number,
  ) {}

  getStartLine(): number {
    return this.line;
  }

  getText(): string {
    return this.text;
  }

  getSemanticElement(): EObject {
    return this.owner;
  }
}

/**
 * Positions and reference nodes of one parse: the port's stand-in for the node model.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/nodemodel/util/NodeModelUtils.java
 */
export class ParseRecords implements INodeModel, IssueLocator {
  readonly references: ReferenceNode[] = [];
  readonly #objectLines = new Map<EObject, number>();
  readonly #featureLines = new Map<EObject, Array<readonly [string, number]>>();
  readonly #referencesByOwner = new Map<EObject, ReferenceNode[]>();
  readonly #slots = new Map<EObject, ContainmentSlot>();
  readonly #features = new Map<string, EStructuralFeature>();

  markObject(obj: EObject, line: number): void {
    this.#objectLines.set(obj, line);
  }

  noteFeature(owner: EObject, feature: string, line: number): void {
    const entries = this.#featureLines.get(owner);
    if (entries === undefined) {
      this.#featureLines.set(owner, [[feature, line]]);
    } else {
      entries.push([feature, line]);
    }
  }

  noteContainment(owner: EObject, feature: string, child: EObject, index: number): void {
    this.#slots.set(child, { feature: this.#featureOf(feature), index });
    this.noteFeature(owner, feature, this.#objectLines.get(child) ?? 1);
  }

  addReference(record: ReferenceRecord): void {
    const node = new ReferenceNode(record);
    this.references.push(node);
    this.noteFeature(record.owner, record.feature, record.line);
    const owned = this.#referencesByOwner.get(record.owner);
    if (owned === undefined) {
      this.#referencesByOwner.set(record.owner, [node]);
    } else {
      owned.push(node);
    }
  }

  getCrossReferenceNodes(obj: EObject): readonly ICrossReferenceNode[] | null {
    if (!this.#objectLines.has(obj)) {
      return null;
    }
    return this.#referencesByOwner.get(obj) ?? [];
  }

  objectStartLine(obj: EObject): number | null {
    return this.#objectLines.get(obj) ?? null;
  }

  featureStartLines(obj: EObject, featureName: string): readonly number[] {
    const lines: number[] = [];
    for (const [name, line] of this.#featureLines.get(obj) ?? []) {
      if (name === featureName) {
        lines.push(line);
      }
    }
    return lines;
  }

  containingSlot(obj: EObject): ContainmentSlot {
    const slot = this.#slots.get(obj);
    if (slot === undefined) {
      throw new Error('The object was not contained by the parse that produced these positions.');
    }
    return slot;
  }

  /** Features are compared by reference where Java compares them: one instance per name. */
  #featureOf(name: string): EStructuralFeature {
    let feature = this.#features.get(name);
    if (feature === undefined) {
      feature = { getName: () => name };
      this.#features.set(name, feature);
    }
    return feature;
  }
}

/** Where a converted value goes: the owner, the assigned feature, the converter rule. */
export interface Assignment {
  readonly owner: EObject;
  readonly feature: string;
  readonly rule: string;
  /** The feature has a primitive type (`double`): a `null` conversion result is an error. */
  readonly primitive?: boolean;
}

/** Source text with the line of its first token. */
export interface Span {
  readonly text: string;
  readonly line: number;
}

const EOF_TOKEN_TEXT = '<EOF>';
const NPE_MESSAGE =
  'A NullPointerException occured. This indicates a missing value converter or a bug in its implementation.';

/** The token stream without hidden tokens, with Xtext's `la(k)` and the error-position helpers. */
export class TokenCursor {
  readonly #tokens: ElkGraphToken[];
  readonly #eof: ElkGraphToken;
  #pos = 0;

  constructor(all: readonly ElkGraphToken[]) {
    this.#tokens = all.filter((t) => !t.hidden);
    const last = all[all.length - 1];
    this.#eof =
      last === undefined
        ? { type: Tok.EOF, text: EOF_TOKEN_TEXT, offset: 0, line: 1, hidden: false }
        : {
            type: Tok.EOF,
            text: EOF_TOKEN_TEXT,
            offset: last.offset + last.text.length,
            line: endLine(last),
            hidden: false,
          };
  }

  /** The `k`-th next non-hidden token (1-based), or the EOF token. */
  peek(k = 1): ElkGraphToken {
    return this.#tokens[this.#pos + k - 1] ?? this.#eof;
  }

  type(k = 1): string {
    return this.peek(k).type;
  }

  next(): ElkGraphToken {
    const token = this.peek();
    if (this.#pos < this.#tokens.length) {
      this.#pos++;
    }
    return token;
  }

  position(): number {
    return this.#pos;
  }

  /** Whether the `k`-th next token starts exactly where its predecessor ended (no hidden token between). */
  adjacent(k = 1): boolean {
    const previous = this.#tokens[this.#pos + k - 2];
    return previous !== undefined && this.peek(k).offset === previous.offset + previous.text.length;
  }

  /**
   * Line of the offset a node starting at token index `start` has: its first token, or, for a node without any
   * token, the end of the previous token (`CompositeNode.getTotalOffset` of an empty composite; line 1 at file
   * start).
   */
  lineFrom(start: number): number {
    const first = this.#tokens[start];
    if (this.#pos > start && first !== undefined) {
      return first.line;
    }
    const previous = this.#tokens[start - 1];
    return previous === undefined ? 1 : endLine(previous);
  }

  /** The syntax error for an unexpected next token. */
  mismatch(expected: string): SyntaxFailure {
    const found = this.peek();
    return new SyntaxFailure(`mismatched input '${found.text}' expecting ${expected}`, found.line);
  }

  expect(type: string): ElkGraphToken {
    if (this.type() !== type) {
      throw this.mismatch(type);
    }
    return this.next();
  }

  accept(type: string): ElkGraphToken | null {
    return this.type() === type ? this.next() : null;
  }
}

function endLine(token: ElkGraphToken): number {
  let line = token.line;
  for (let i = token.text.indexOf('\n'); i !== -1; i = token.text.indexOf('\n', i + 1)) {
    line++;
  }
  return line;
}

/** One member of an unordered group: the token that starts it and the parse of the rest. */
export interface GroupMember {
  readonly start: string;
  /** `follow` = token types that may legitimately follow the member (for a missing trailing number). */
  parse(follow: ReadonlySet<string>): void;
}

/** Cursor, records, diagnostics and the value-conversion policy shared by the parser rule classes. */
export class ParseSession {
  readonly cursor: TokenCursor;
  readonly records = new ParseRecords();
  readonly diagnostics: ParseDiagnostic[] = [];
  readonly #services: IValueConverterService;
  readonly #reported = new Set<INode>();

  constructor(tokens: readonly ElkGraphToken[], services: IValueConverterService) {
    this.cursor = new TokenCursor(tokens);
    this.#services = services;
  }

  /**
   * One converted assignment (`DefaultEcoreElementFactory.set`): the value is converted, checked for primitive
   * features and applied; a converter failure becomes at most one diagnostic per node and parsing goes on.
   *
   * @see org.eclipse.xtext/src/org/eclipse/xtext/parser/DefaultEcoreElementFactory.java:64-90
   */
  assign(a: Assignment, span: Span, apply: (value: unknown) => void): void {
    this.records.noteFeature(a.owner, a.feature, span.line);
    const node = new ConversionNode(a.owner, span.text, span.line);
    try {
      this.#convertAndApply(a, node, apply);
    } catch (e) {
      this.#report(wrapConverterFailure(e, node), node);
    }
  }

  #convertAndApply(a: Assignment, node: INode, apply: (value: unknown) => void): void {
    try {
      const value = this.#services.toValue(node.getText(), a.rule, node);
      checkNullForPrimitive(a, value, node);
      apply(value);
    } catch (e) {
      if (e instanceof ValueConverterWithValueException) {
        const value = e.getValue();
        checkNullForPrimitive(a, value, node);
        apply(value);
      }
      throw e;
    }
  }

  /** @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/AbstractInternalAntlrParser.java:487-501 */
  #report(failure: ValueConverterException, fallbackNode: INode): void {
    const node = failure.getNode() ?? fallbackNode;
    if (this.#reported.has(node)) {
      return;
    }
    this.#reported.add(node);
    this.diagnostics.push({ kind: 'conversion', message: converterMessage(failure), line: node.getStartLine() });
  }

  /** `feature=ID`. */
  identifier(owner: EObject, feature: string, apply: (value: string) => void): void {
    const token = this.cursor.expect(Tok.ID);
    this.assign({ owner, feature, rule: RuleName.ID }, token, (v) => apply(v as string));
  }

  /**
   * `feature=Number`. A missing number that the grammar could continue after is the recovery of the generated
   * parser: the empty datatype is converted (and fails with the converter's message) and parsing goes on.
   */
  number(a: Omit<Assignment, 'rule' | 'primitive'>, follow: ReadonlySet<string>, apply: (value: number) => void): void {
    const next = this.cursor.peek();
    const assignment = { ...a, rule: RuleName.NUMBER, primitive: true };
    // The Number converter yields a number; the primitive check excluded null.
    const set = (v: unknown): void => apply(v as number);
    if (next.type === Tok.SIGNED_INT || next.type === Tok.FLOAT) {
      this.cursor.next();
      this.assign(assignment, next, set);
    } else if (follow.has(next.type)) {
      this.assign(assignment, { text: '', line: this.cursor.lineFrom(this.cursor.position()) }, set);
    } else {
      throw this.cursor.mismatch(RuleName.NUMBER);
    }
  }

  /** Appends `child` to a containment list (`EList.addUnique`, order kept) and records its slot. */
  contain<E extends EObject>(owner: EObject, feature: string, list: EList<E>, child: E): void {
    addUnique(list, child);
    this.records.noteContainment(owner, feature, child, list.size() - 1);
  }

  /**
   * An unordered group (`a? & b? & ...`): each member at most once, in any order. A member repeated, or a token
   * that starts none, ends the group; the caller's next expectation then reports the error.
   */
  unorderedGroup(members: readonly GroupMember[], tail: readonly string[]): void {
    const remaining = new Map(members.map((m) => [m.start, m] as const));
    for (
      let member = remaining.get(this.cursor.type());
      member !== undefined;
      member = remaining.get(this.cursor.type())
    ) {
      remaining.delete(member.start);
      this.cursor.next();
      member.parse(new Set([...remaining.keys(), ...tail]));
    }
  }
}

function addUnique<E>(list: EList<E>, child: E): void {
  const unique = list as EList<E> & { addUnique?: (e: E) => void };
  if (typeof unique.addUnique === 'function') {
    unique.addUnique(child);
  } else {
    list.add(child);
  }
}

function checkNullForPrimitive(a: Assignment, value: unknown, node: INode): void {
  if (value === null && a.primitive === true) {
    throw new ValueConverterException(`ValueConverter returned null for primitive feature ${a.feature}`, node, null);
  }
}

function wrapConverterFailure(e: unknown, node: INode): ValueConverterException {
  if (e instanceof ValueConverterException) {
    return e;
  }
  if (e instanceof TypeError) {
    return new ValueConverterException(NPE_MESSAGE, node, e);
  }
  return new ValueConverterException(null, node, e instanceof Error ? e : new Error(String(e)));
}

/** @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/AbstractInternalAntlrParser.java:477-485 */
function converterMessage(vce: ValueConverterException): string {
  const cause = vce.cause instanceof Error ? vce.cause : null;
  // Java messages are null where a JS Error carries '': an absent message and an empty one are the same here.
  const own = nonEmpty(vce.getMessage());
  const result = cause === null ? own : (nonEmpty(cause.message) ?? own);
  return result ?? (cause ?? vce).constructor.name;
}

function nonEmpty(message: string | null): string | null {
  return message === '' ? null : message;
}
