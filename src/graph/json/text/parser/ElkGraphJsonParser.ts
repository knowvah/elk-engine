// SPDX-License-Identifier: EPL-2.0
import type { IValueConverterService } from '../../../../xtext/conversion/IValueConverterService.js';
import { nodeModelLineSource } from '../../../../xtext/parser/LineSource.js';
import { ParseSession } from '../../../../xtext/parser/ParseSession.js';
import { SyntaxFailure } from '../../../../xtext/parser/SyntaxFailure.js';
import type { ElkEdge } from '../../../ElkEdge.js';
import type { ElkGraphElement } from '../../../ElkGraphElement.js';
import { ElkGraphFactory } from '../../../ElkGraphFactory.js';
import type { ElkLabel } from '../../../ElkLabel.js';
import type { ElkNode } from '../../../ElkNode.js';
import type { ElkPort } from '../../../ElkPort.js';
import type { ElkShape } from '../../../ElkShape.js';
import '../../../impl/ElkGraphFactoryImpl.js';
import { tokenizeWithDiagnostics } from './ElkGraphJsonLexer.js';
import { ElkGraphJsonElementRules } from './ElkGraphJsonParserElements.js';
import {
  ELK_GRAPH_JSON_VOCABULARY,
  JsonKey,
  type JsonKeyRule,
  KEY_OF_TOKEN,
  type ParseResult,
  Tok,
} from './ElkGraphJsonRecords.js';
import { ElkGraphJsonTokenType } from './ElkGraphJsonTokenType.js';

export type { ParseDiagnostic } from '../../../../xtext/parser/ParseDiagnostic.js';
export type { ParseResult } from './ElkGraphJsonRecords.js';

const LEXER_ERROR_MESSAGE = 'The lexer could not tokenize the input.';

/** The alternative of an element fragment that a key keyword selects; the key and its `:` are consumed. */
type Handler<T> = (rules: ElkGraphJsonElementRules, owner: T) => void;
type Handlers<T> = ReadonlyMap<JsonKeyRule, Handler<T>>;

const labelsOf: Handler<ElkGraphElement> = (r, o) => r.parseLabels(o);
const propertiesOf: Handler<ElkGraphElement> = (r, o) => r.parseProperties(o);
const idOf: Handler<ElkGraphElement> = (r, o) => r.parseId(o);

/** `ShapeElement` (ElkGraphJson.xtext:109-114): the four numeric members of a shape. */
function shapeHandlers<T extends ElkShape>(): Array<[JsonKeyRule, Handler<T>]> {
  return [
    [JsonKey.X, (r, o) => r.parseCoordinate(o, 'x', (v) => o.setX(v))],
    [JsonKey.Y, (r, o) => r.parseCoordinate(o, 'y', (v) => o.setY(v))],
    [JsonKey.WIDTH, (r, o) => r.parseCoordinate(o, 'width', (v) => o.setWidth(v))],
    [JsonKey.HEIGHT, (r, o) => r.parseCoordinate(o, 'height', (v) => o.setHeight(v))],
  ];
}

/** `NodeElement` alternatives (ElkGraphJson.xtext:25-34), besides `JsonMember`. */
const NODE_ELEMENTS: Handlers<ElkNode> = new Map<JsonKeyRule, Handler<ElkNode>>([
  [JsonKey.ID, idOf],
  ...shapeHandlers<ElkNode>(),
  [JsonKey.CHILDREN, (r, o) => r.parseChildren(o)],
  [JsonKey.PORTS, (r, o) => r.parsePorts(o)],
  [JsonKey.LABELS, labelsOf],
  [JsonKey.EDGES, (r, o) => r.parseEdges(o)],
  [JsonKey.LAYOUT_OPTIONS, propertiesOf],
]);

/** `PortElement` alternatives (41-47). */
const PORT_ELEMENTS: Handlers<ElkPort> = new Map<JsonKeyRule, Handler<ElkPort>>([
  [JsonKey.ID, idOf],
  ...shapeHandlers<ElkPort>(),
  [JsonKey.LABELS, labelsOf],
  [JsonKey.LAYOUT_OPTIONS, propertiesOf],
]);

/** `LabelElement` alternatives (54-61). */
const LABEL_ELEMENTS: Handlers<ElkLabel> = new Map<JsonKeyRule, Handler<ElkLabel>>([
  [JsonKey.ID, idOf],
  ...shapeHandlers<ElkLabel>(),
  [JsonKey.TEXT, (r, o) => r.parseText(o)],
  [JsonKey.LABELS, labelsOf],
  [JsonKey.LAYOUT_OPTIONS, propertiesOf],
]);

/** `EdgeElement` alternatives (68-76). */
const EDGE_ELEMENTS: Handlers<ElkEdge> = new Map<JsonKeyRule, Handler<ElkEdge>>([
  [JsonKey.ID, idOf],
  [JsonKey.SOURCES, (r, o) => r.parseSources(o)],
  [JsonKey.TARGETS, (r, o) => r.parseTargets(o)],
  [JsonKey.LABELS, labelsOf],
  [JsonKey.LAYOUT_OPTIONS, propertiesOf],
]);

/**
 * Hand-written recursive-descent parser for `ElkGraphJson.xtext`, one method per object rule or fragment with
 * Xtext's LL decisions (D8): a fragment alternative is selected by its first token (a key keyword, or `STRING` /
 * `ID` for `JsonMember`). Objects are created through the ElkGraph factory and appended in source order, as
 * `DefaultEcoreElementFactory` does; cross references are recorded as nodes and left unset.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/ElkGraphJson.xtext
 * @see org.eclipse.xtext/src/org/eclipse/xtext/parser/DefaultEcoreElementFactory.java
 */
export class ElkGraphJsonParser {
  /** The root node as far as it has been built (set by {@link parseRootNode}). */
  root: ElkNode | null = null;
  readonly #session: ParseSession;
  readonly #rules: ElkGraphJsonElementRules;

  constructor(session: ParseSession) {
    this.#session = session;
    this.#rules = new ElkGraphJsonElementRules(session, {
      parseNode: (parent) => this.parseElkNode(parent),
      parsePort: (parent) => this.parsePort(parent),
      parseLabel: (parent) => this.parseLabel(parent),
      parseEdge: (parent) => this.parseEdge(parent),
    });
  }

  /** The entry rule `ElkNode` (ElkGraphJson.xtext:21-23), followed by the end of the file. */
  parseRootNode(): ElkNode {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    const root = ElkGraphFactory.eINSTANCE.createElkNode();
    this.root = root;
    this.#parseNodeObject(root);
    records.markObject(root, cursor.lineFrom(start));
    cursor.expect(Tok.EOF);
    return root;
  }

  /** `ElkNode` (21-23), appended to `parent.children`. */
  parseElkNode(parent: ElkNode): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    const node = ElkGraphFactory.eINSTANCE.createElkNode();
    this.#parseNodeObject(node);
    records.markObject(node, cursor.lineFrom(start));
    this.#session.contain(parent, 'children', parent.getChildren(), node);
  }

  /** `'{' (NodeElement (',' NodeElement)*)? ','? '}'`: the only object rule that may be empty. */
  #parseNodeObject(node: ElkNode): void {
    this.#rules.list(Tok.LBRACE, Tok.RBRACE, true, () => this.#parseElement(node, NODE_ELEMENTS));
  }

  /** `ElkPort` (37-39), appended to `parent.ports`. */
  parsePort(parent: ElkNode): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    const port = ElkGraphFactory.eINSTANCE.createElkPort();
    this.#rules.list(Tok.LBRACE, Tok.RBRACE, false, () => this.#parseElement(port, PORT_ELEMENTS));
    records.markObject(port, cursor.lineFrom(start));
    this.#session.contain(parent, 'ports', parent.getPorts(), port);
  }

  /** `ElkLabel` (50-52), appended to `parent.labels`. */
  parseLabel(parent: ElkGraphElement): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    const label = ElkGraphFactory.eINSTANCE.createElkLabel();
    this.#rules.list(Tok.LBRACE, Tok.RBRACE, false, () => this.#parseElement(label, LABEL_ELEMENTS));
    records.markObject(label, cursor.lineFrom(start));
    this.#session.contain(parent, 'labels', parent.getLabels(), label);
  }

  /** `ElkEdge` (64-66), appended to `parent.containedEdges`. */
  parseEdge(parent: ElkNode): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    const edge = ElkGraphFactory.eINSTANCE.createElkEdge();
    this.#rules.list(Tok.LBRACE, Tok.RBRACE, false, () => this.#parseElement(edge, EDGE_ELEMENTS));
    records.markObject(edge, cursor.lineFrom(start));
    this.#session.contain(parent, 'containedEdges', parent.getContainedEdges(), edge);
  }

  /**
   * One element fragment: the key keyword selects its alternative; a token that is no key of this object falls
   * through to `JsonMember` (`STRING` or `ID`), and a key of another object is a syntax error.
   */
  #parseElement<T>(owner: T, handlers: Handlers<T>): void {
    const { cursor } = this.#session;
    const key = KEY_OF_TOKEN.get(cursor.type());
    if (key === undefined) {
      this.#rules.parseJsonMember();
      return;
    }
    const handler = handlers.get(key);
    if (handler === undefined) {
      throw cursor.mismatch(key);
    }
    cursor.next();
    cursor.expect(Tok.COLON);
    handler(this.#rules, owner);
  }
}

/**
 * Parses `text` without linking: the model with its cross references unset, the recorded reference nodes,
 * positions and the parse-time diagnostics (the first syntax error stops parsing; D6: presence only).
 *
 * @param text the `.elkj` source
 * @param services value converters of the language
 * @returns the parse result
 */
export function parse(text: string, services: IValueConverterService): ParseResult {
  const lexed = tokenizeWithDiagnostics(text);
  const lines = nodeModelLineSource(text);
  const session = new ParseSession(lexed.tokens, services, ELK_GRAPH_JSON_VOCABULARY, lines);
  const parser = new ElkGraphJsonParser(session);
  try {
    parser.parseRootNode();
  } catch (e) {
    if (!(e instanceof SyntaxFailure)) {
      throw e;
    }
    session.diagnostics.push({ kind: 'syntax', message: e.message, line: e.line });
  }
  if (lexed.lexError && !session.diagnostics.some((d) => d.kind === 'syntax')) {
    const invalid = lexed.tokens.find((t) => t.type === ElkGraphJsonTokenType.INVALID);
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
