// SPDX-License-Identifier: EPL-2.0
import type { IValueConverterService } from '../../../xtext/conversion/IValueConverterService.js';
import type { EMapPropertyHolder } from '../../EMapPropertyHolder.js';
import type { ElkGraphElement } from '../../ElkGraphElement.js';
import { ElkGraphFactory } from '../../ElkGraphFactory.js';
import type { ElkLabel } from '../../ElkLabel.js';
import type { ElkNode } from '../../ElkNode.js';
import type { ElkPort } from '../../ElkPort.js';
import type { ElkShape } from '../../ElkShape.js';
import '../../impl/ElkGraphFactoryImpl.js';
import { ElkPropertyToValueMapEntryImpl } from '../../impl/ElkPropertyToValueMapEntryImpl.js';
import type { IProperty } from '../../properties/IProperty.js';
import { tokenizeWithDiagnostics } from './ElkGraphLexer.js';
import { ElkEdgeRules, readQualifiedId } from './ElkGraphParserEdges.js';
import { nodeModelLineSource } from '../../../xtext/parser/LineSource.js';
import { ParseSession } from '../../../xtext/parser/ParseSession.js';
import type { GroupMember } from '../../../xtext/parser/GroupMember.js';
import type { Span } from '../../../xtext/parser/Span.js';
import { SyntaxFailure } from '../../../xtext/parser/SyntaxFailure.js';
import { ELK_GRAPH_VOCABULARY, type ParseResult, RuleName, Tok } from './ParseRecords.js';

export type { ParseDiagnostic } from '../../../xtext/parser/ParseDiagnostic.js';
export type { ParseResult } from './ParseRecords.js';

const AFTER_COORDINATE = new Set<string>([Tok.COMMA]);
const AFTER_LAYOUT: readonly string[] = [Tok.RBRACKET];
const LEXER_ERROR_MESSAGE = 'The lexer could not tokenize the input.';

/** The converter rule of each property value that is a single token. */
const VALUE_RULES: ReadonlyMap<string, string> = new Map([
  [Tok.STRING, RuleName.STRING_VALUE],
  [Tok.SIGNED_INT, RuleName.NUMBER_VALUE],
  [Tok.FLOAT, RuleName.NUMBER_VALUE],
  [Tok.TRUE, RuleName.BOOLEAN_VALUE],
  [Tok.FALSE, RuleName.BOOLEAN_VALUE],
]);

/**
 * Hand-written recursive-descent parser for `ElkGraph.xtext`, one method per grammar rule with Xtext's LL
 * decisions (D8). Objects are created through the ElkGraph factory and appended in source order, as
 * `DefaultEcoreElementFactory` does; cross references are recorded as nodes and left unset.
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraph.xtext
 * @see org.eclipse.xtext/src/org/eclipse/xtext/parser/DefaultEcoreElementFactory.java
 */
export class ElkGraphParser {
  /** The root node as far as it has been built (set by {@link parseRootNode}). */
  root: ElkNode | null = null;
  readonly #session: ParseSession;
  readonly #edges: ElkEdgeRules;

  constructor(session: ParseSession) {
    this.#session = session;
    this.#edges = new ElkEdgeRules(session, {
      parseProperties: (holder) => this.parseProperties(holder),
      parseLabels: (parent) => this.parseLabels(parent),
    });
  }

  /** `RootNode` (ElkGraph.xtext:20-24). */
  parseRootNode(): ElkNode {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    const root = ElkGraphFactory.eINSTANCE.createElkNode();
    this.root = root;
    if (cursor.accept(Tok.GRAPH) !== null) {
      this.#session.identifier(root, 'identifier', (id) => root.setIdentifier(id));
    }
    this.#parseNodeContent(root);
    records.markObject(root, cursor.lineFrom(start));
    cursor.expect(Tok.EOF);
    return root;
  }

  /** `ElkNode` (26-31), appended to `parent.children`. */
  parseElkNode(parent: ElkNode): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    cursor.expect(Tok.NODE);
    const node = ElkGraphFactory.eINSTANCE.createElkNode();
    this.#session.identifier(node, 'identifier', (id) => node.setIdentifier(id));
    if (cursor.accept(Tok.LBRACE) !== null) {
      this.#parseNodeContent(node);
      cursor.expect(Tok.RBRACE);
    }
    records.markObject(node, cursor.lineFrom(start));
    this.#session.contain(parent, 'children', parent.getChildren(), node);
  }

  /** `ShapeLayout? properties+=Property* (labels | ports | children | containedEdges)*` */
  #parseNodeContent(node: ElkNode): void {
    const { cursor } = this.#session;
    this.parseShapeLayout(node);
    this.parseProperties(node);
    for (;;) {
      switch (cursor.type()) {
        case Tok.LABEL:
          this.parseLabel(node);
          break;
        case Tok.PORT:
          this.parsePort(node);
          break;
        case Tok.NODE:
          this.parseElkNode(node);
          break;
        case Tok.EDGE:
          this.#edges.parseEdge(node);
          break;
        default:
          return;
      }
    }
  }

  /** `labels+=ElkLabel*` */
  parseLabels(parent: ElkGraphElement): void {
    while (this.#session.cursor.type() === Tok.LABEL) {
      this.parseLabel(parent);
    }
  }

  /** `ElkLabel` (33-38), appended to `parent.labels`. */
  parseLabel(parent: ElkGraphElement): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    cursor.expect(Tok.LABEL);
    const label = ElkGraphFactory.eINSTANCE.createElkLabel();
    if (cursor.type() === Tok.ID) {
      this.#session.identifier(label, 'identifier', (id) => label.setIdentifier(id));
      cursor.expect(Tok.COLON);
    }
    const text = cursor.expect(Tok.STRING);
    this.#session.assign({ owner: label, feature: 'text', rule: RuleName.STRING }, text, (v) =>
      label.setText(v as string),
    );
    if (cursor.accept(Tok.LBRACE) !== null) {
      this.#parseShapeBody(label);
    }
    records.markObject(label, cursor.lineFrom(start));
    this.#session.contain(parent, 'labels', parent.getLabels(), label);
  }

  /** `'{' ShapeLayout? properties+=Property* labels+=ElkLabel* '}'`, shared by labels and ports. */
  #parseShapeBody(shape: ElkLabel | ElkPort): void {
    this.parseShapeLayout(shape);
    this.parseProperties(shape);
    this.parseLabels(shape);
    this.#session.cursor.expect(Tok.RBRACE);
  }

  /** `ElkPort` (40-45), appended to `parent.ports`. */
  parsePort(parent: ElkNode): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    cursor.expect(Tok.PORT);
    const port = ElkGraphFactory.eINSTANCE.createElkPort();
    this.#session.identifier(port, 'identifier', (id) => port.setIdentifier(id));
    if (cursor.accept(Tok.LBRACE) !== null) {
      this.#parseShapeBody(port);
    }
    records.markObject(port, cursor.lineFrom(start));
    this.#session.contain(parent, 'ports', parent.getPorts(), port);
  }

  /** `ShapeLayout` fragment (47-51): an unordered group of `position` and `size`. */
  parseShapeLayout(shape: ElkShape): void {
    const { cursor } = this.#session;
    if (cursor.accept(Tok.LAYOUT) === null) {
      return;
    }
    cursor.expect(Tok.LBRACKET);
    this.#session.unorderedGroup(
      [
        this.#coordinates(Tok.POSITION, shape, ['x', 'y'], [(v) => shape.setX(v), (v) => shape.setY(v)]),
        this.#coordinates(Tok.SIZE, shape, ['width', 'height'], [(v) => shape.setWidth(v), (v) => shape.setHeight(v)]),
      ],
      AFTER_LAYOUT,
    );
    cursor.expect(Tok.RBRACKET);
  }

  /** `keyword ':' a=Number ',' b=Number` */
  #coordinates(
    keyword: string,
    shape: ElkShape,
    features: readonly [string, string],
    setters: readonly [(v: number) => void, (v: number) => void],
  ): GroupMember {
    return {
      start: keyword,
      parse: (follow) => {
        const { cursor } = this.#session;
        cursor.expect(Tok.COLON);
        this.#session.number({ owner: shape, feature: features[0] }, AFTER_COORDINATE, setters[0]);
        cursor.expect(Tok.COMMA);
        this.#session.number({ owner: shape, feature: features[1] }, follow, setters[1]);
      },
    };
  }

  /** `properties+=Property*` */
  parseProperties(holder: EMapPropertyHolder): void {
    while (this.#session.cursor.type() === Tok.ID) {
      this.parseProperty(holder);
    }
  }

  /** `Property` (98-99): the entry gets its key before its value, and joins `properties` when complete. */
  parseProperty(holder: EMapPropertyHolder): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    const entry = new ElkPropertyToValueMapEntryImpl();
    this.#session.assign({ owner: entry, feature: 'key', rule: RuleName.PROPERTY_KEY }, this.#parsePropertyKey(), (v) =>
      entry.setTypedKey(v as IProperty<unknown>),
    );
    cursor.expect(Tok.COLON);
    this.#parsePropertyValue(entry);
    records.markObject(entry, cursor.lineFrom(start));
    this.#session.contain(holder, 'properties', holder.getProperties().entryList(), entry);
  }

  /** `PropertyKey hidden()` (101-102): a dot belongs to the key only if no hidden token touches it. */
  #parsePropertyKey(): Span {
    const { cursor } = this.#session;
    const first = cursor.expect(Tok.ID);
    let text = first.text;
    while (cursor.type() === Tok.DOT && cursor.adjacent() && cursor.type(2) === Tok.ID && cursor.adjacent(2)) {
      cursor.next();
      text += `.${cursor.next().text}`;
    }
    return { text, line: first.line };
  }

  /** `value=StringValue | QualifiedIdValue | NumberValue | BooleanValue | 'null'`, chosen by token type. */
  #parsePropertyValue(entry: ElkPropertyToValueMapEntryImpl): void {
    const { cursor } = this.#session;
    const type = cursor.type();
    if (type === Tok.NULL) {
      cursor.next();
      return;
    }
    if (type === Tok.ID) {
      const id = readQualifiedId(cursor);
      this.#assignValue(entry, RuleName.QUALIFIED_ID_VALUE, { text: id.joined, line: id.line });
      return;
    }
    const rule = VALUE_RULES.get(type);
    if (rule === undefined) {
      throw cursor.mismatch('a property value');
    }
    this.#assignValue(entry, rule, cursor.next());
  }

  #assignValue(entry: ElkPropertyToValueMapEntryImpl, rule: string, span: Span): void {
    this.#session.assign({ owner: entry, feature: 'value', rule }, span, (v) => entry.setTypedValue(v));
  }
}

/**
 * Parses `text` without linking: the model with its cross references unset, the recorded reference nodes,
 * positions and the parse-time diagnostics (the first syntax error stops parsing; G5: presence only).
 *
 * @param text the `.elkt` source
 * @param services value converters of the language
 * @returns the parse result
 */
export function parse(text: string, services: IValueConverterService): ParseResult {
  const lexed = tokenizeWithDiagnostics(text);
  const session = new ParseSession(lexed.tokens, services, ELK_GRAPH_VOCABULARY, nodeModelLineSource(text));
  const parser = new ElkGraphParser(session);
  try {
    parser.parseRootNode();
  } catch (e) {
    if (!(e instanceof SyntaxFailure)) {
      throw e;
    }
    session.diagnostics.push({ kind: 'syntax', message: e.message, line: e.line });
  }
  if (lexed.lexError && !session.diagnostics.some((d) => d.kind === 'syntax')) {
    const invalid = lexed.tokens.find((t) => t.type === Tok.INVALID);
    session.diagnostics.push({
      kind: 'syntax',
      message: LEXER_ERROR_MESSAGE,
      line: invalid === undefined ? 1 : session.cursor.lineOf(invalid),
    });
  }
  return {
    root: parser.root,
    diagnostics: session.diagnostics,
    references: session.records.references,
    nodeModel: session.records,
    positions: session.records,
  };
}
