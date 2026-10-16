// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { EList } from '../../emf/common/util/EList.js';
import type { IValueConverterService } from '../conversion/IValueConverterService.js';
import { ValueConverterException } from '../conversion/ValueConverterException.js';
import { ValueConverterWithValueException } from '../conversion/ValueConverterWithValueException.js';
import type { INode } from '../nodemodel/INode.js';
import type { Assignment } from './Assignment.js';
import { ConversionNode } from './ConversionNode.js';
import type { GroupMember } from './GroupMember.js';
import type { ParseDiagnostic } from './ParseDiagnostic.js';
import type { LineSource } from './LineSource.js';
import { ParseRecords } from './ParseRecords.js';
import type { SessionVocabulary } from './SessionVocabulary.js';
import type { Span } from './Span.js';
import { TokenCursor } from './TokenCursor.js';
import type { Token } from './Token.js';

const NPE_MESSAGE =
  'A NullPointerException occured. This indicates a missing value converter or a bug in its implementation.';

/**
 * Cursor, records, diagnostics and the value-conversion policy shared by the parser rule classes.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export class ParseSession<T extends Token = Token> {
  readonly cursor: TokenCursor<T>;
  readonly records = new ParseRecords();
  readonly diagnostics: ParseDiagnostic[] = [];
  readonly #services: IValueConverterService;
  readonly #vocabulary: SessionVocabulary;
  readonly #reported = new Set<INode>();

  constructor(
    tokens: readonly T[],
    services: IValueConverterService,
    vocabulary: SessionVocabulary,
    lines?: LineSource,
  ) {
    this.cursor = new TokenCursor<T>(tokens, lines);
    this.#services = services;
    this.#vocabulary = vocabulary;
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

  /** `assign` for a value that is one token: its line comes from the line source of the parse. */
  assignToken(a: Assignment, token: Token, apply: (value: unknown) => void): void {
    this.assign(a, { text: token.text, line: this.cursor.lineOf(token) }, apply);
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
    const token = this.cursor.expect(this.#vocabulary.idToken);
    this.assignToken({ owner, feature, rule: this.#vocabulary.idRule }, token, (v) => apply(v as string));
  }

  /**
   * `feature=Number`. A missing number that the grammar could continue after is the recovery of the generated
   * parser: the empty datatype is converted (and fails with the converter's message) and parsing goes on.
   */
  number(a: Omit<Assignment, 'rule' | 'primitive'>, follow: ReadonlySet<string>, apply: (value: number) => void): void {
    const next = this.cursor.peek();
    const assignment = { ...a, rule: this.#vocabulary.numberRule, primitive: true };
    // The Number converter yields a number; the primitive check excluded null.
    const set = (v: unknown): void => apply(v as number);
    if (next.type === this.#vocabulary.signedIntToken || next.type === this.#vocabulary.floatToken) {
      this.cursor.next();
      this.assignToken(assignment, next, set);
    } else if (follow.has(next.type)) {
      this.assign(assignment, { text: '', line: this.cursor.lineFrom(this.cursor.position()) }, set);
    } else {
      throw this.cursor.mismatch(this.#vocabulary.numberRule);
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
