// SPDX-License-Identifier: EPL-2.0
import type { EMapPropertyHolder } from '../../../EMapPropertyHolder.js';
import type { ElkEdge } from '../../../ElkEdge.js';
import type { ElkGraphElement } from '../../../ElkGraphElement.js';
import type { ElkLabel } from '../../../ElkLabel.js';
import type { ElkNode } from '../../../ElkNode.js';
import type { ElkShape } from '../../../ElkShape.js';
import { ElkPropertyToValueMapEntryImpl } from '../../../impl/ElkPropertyToValueMapEntryImpl.js';
import type { IProperty } from '../../../properties/IProperty.js';
import type { Token } from '../../../../xtext/parser/Token.js';
import type { ParseSession } from '../../../../xtext/parser/ParseSession.js';
import { RuleName, Tok } from './ElkGraphJsonRecords.js';

/** The object rules (`ElkNode`, `ElkPort`, `ElkLabel`, `ElkEdge`) that the list fragments call back into. */
export interface ElementHost {
  /** `children+=ElkNode` */
  parseNode(parent: ElkNode): void;
  /** `ports+=ElkPort` */
  parsePort(parent: ElkNode): void;
  /** `labels+=ElkLabel` */
  parseLabel(parent: ElkGraphElement): void;
  /** `containedEdges+=ElkEdge` */
  parseEdge(parent: ElkNode): void;
}

/** What may follow a `Number` inside an element: the next element or the end of the object. */
const AFTER_NUMBER = new Set<string>([Tok.COMMA, Tok.RBRACE]);

/** The converter rule of each property value, which is a single token. */
const VALUE_RULES: ReadonlyMap<string, string> = new Map([
  [Tok.STRING, RuleName.STRING_VALUE],
  [Tok.SIGNED_INT, RuleName.NUMBER_VALUE],
  [Tok.FLOAT, RuleName.NUMBER_VALUE],
  [Tok.TRUE, RuleName.BOOLEAN_VALUE],
  [Tok.FALSE, RuleName.BOOLEAN_VALUE],
]);

/** The tokens `JsonValue` consumes alone: `STRING | Number | BooleanValue | 'null'`. */
const SCALAR_VALUES: ReadonlySet<string> = new Set([
  Tok.STRING,
  Tok.SIGNED_INT,
  Tok.FLOAT,
  Tok.TRUE,
  Tok.FALSE,
  Tok.NULL,
]);

type ReferenceFeature = 'sources' | 'targets';

const JSON_VALUE_RULE = 'JsonValue';

/**
 * The fragments and value rules of `ElkGraphJson.xtext` below the object rules: ids, shapes, the list fragments,
 * `Property` and the arbitrary JSON rules. The key keyword of a fragment has been consumed by the caller.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/ElkGraphJson.xtext
 */
export class ElkGraphJsonElementRules {
  readonly #session: ParseSession;
  readonly #host: ElementHost;
  /** References recorded so far per edge and feature: `sources+=` appends even when the key repeats. */
  readonly #referenceCounts = new WeakMap<ElkEdge, Record<ReferenceFeature, number>>();

  constructor(session: ParseSession, host: ElementHost) {
    this.#session = session;
    this.#host = host;
  }

  /**
   * `open (item (',' item)*)? ','? close`, or without the optional group when `allowEmpty` is false (object
   * rules `ElkPort`, `ElkLabel`, `ElkEdge`). The decision after a `,` looks at the next token: the close token
   * ends the list, anything else must start an item.
   */
  list(open: string, close: string, allowEmpty: boolean, item: () => void): void {
    const { cursor } = this.#session;
    cursor.expect(open);
    if (allowEmpty && (cursor.type() === close || cursor.type() === Tok.COMMA)) {
      cursor.accept(Tok.COMMA);
      cursor.expect(close);
      return;
    }
    item();
    while (cursor.accept(Tok.COMMA) !== null) {
      if (cursor.type() === close) {
        break;
      }
      item();
    }
    cursor.expect(close);
  }

  /** `ElkId: KeyId ':' identifier=STRING` (ElkGraphJson.xtext:89-91). */
  parseId(owner: ElkGraphElement): void {
    const token = this.#session.cursor.expect(Tok.STRING);
    this.#session.assignToken({ owner, feature: 'identifier', rule: RuleName.STRING }, token, (v) =>
      owner.setIdentifier(v as string),
    );
  }

  /** `KeyText ':' text=STRING` (ElkGraphJson.xtext:57). */
  parseText(label: ElkLabel): void {
    const token = this.#session.cursor.expect(Tok.STRING);
    this.#session.assignToken({ owner: label, feature: 'text', rule: RuleName.STRING }, token, (v) =>
      label.setText(v as string),
    );
  }

  /** `ShapeElement` (ElkGraphJson.xtext:109-114): one `Number` into the given feature. */
  parseCoordinate(shape: ElkShape, feature: string, set: (value: number) => void): void {
    this.#session.number({ owner: shape, feature }, AFTER_NUMBER, set);
  }

  /** `ElkNodeChildren` (ElkGraphJson.xtext:92-94). */
  parseChildren(parent: ElkNode): void {
    this.list(Tok.LBRACKET, Tok.RBRACKET, true, () => this.#host.parseNode(parent));
  }

  /** `ElkNodePorts` (95-97). */
  parsePorts(parent: ElkNode): void {
    this.list(Tok.LBRACKET, Tok.RBRACKET, true, () => this.#host.parsePort(parent));
  }

  /** `ElkNodeEdges` (98-100). */
  parseEdges(parent: ElkNode): void {
    this.list(Tok.LBRACKET, Tok.RBRACKET, true, () => this.#host.parseEdge(parent));
  }

  /** `ElkGraphElementLabels` (101-103). */
  parseLabels(parent: ElkGraphElement): void {
    this.list(Tok.LBRACKET, Tok.RBRACKET, true, () => this.#host.parseLabel(parent));
  }

  /** `ElkGraphElementProperties` (104-106). */
  parseProperties(holder: EMapPropertyHolder): void {
    this.list(Tok.LBRACE, Tok.RBRACE, true, () => this.parseProperty(holder));
  }

  /** `ElkEdgeSources` (ElkGraphJson.xtext:79-81). */
  parseSources(edge: ElkEdge): void {
    this.#parseReferences(edge, 'sources');
  }

  /** `ElkEdgeTargets` (84-86). */
  parseTargets(edge: ElkEdge): void {
    this.#parseReferences(edge, 'targets');
  }

  /** `feature+=[ElkConnectableShape|STRING]` list; references are recorded and left unset. */
  #parseReferences(edge: ElkEdge, feature: ReferenceFeature): void {
    const counts = this.#countsOf(edge);
    this.list(Tok.LBRACKET, Tok.RBRACKET, true, () => {
      const token = this.#session.cursor.expect(Tok.STRING);
      this.#session.records.addReference({
        owner: edge,
        feature,
        index: counts[feature]++,
        ruleName: RuleName.STRING,
        text: token.text,
        line: this.#session.cursor.lineOf(token),
      });
    });
  }

  #countsOf(edge: ElkEdge): Record<ReferenceFeature, number> {
    let counts = this.#referenceCounts.get(edge);
    if (counts === undefined) {
      counts = { sources: 0, targets: 0 };
      this.#referenceCounts.set(edge, counts);
    }
    return counts;
  }

  /** `Property` (ElkGraphJson.xtext:116-118): the entry gets its key before its value, and joins `properties` when complete. */
  parseProperty(holder: EMapPropertyHolder): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    const entry = new ElkPropertyToValueMapEntryImpl();
    const key = this.#parsePropertyKey();
    this.#session.assignToken({ owner: entry, feature: 'key', rule: RuleName.PROPERTY_KEY }, key, (v) =>
      entry.setTypedKey(v as IProperty<unknown>),
    );
    cursor.expect(Tok.COLON);
    this.#parsePropertyValue(entry);
    records.markObject(entry, cursor.lineFrom(start));
    this.#session.contain(holder, 'properties', holder.getProperties().entryList(), entry);
  }

  /** `PropertyKey hidden(): STRING | ID` (ElkGraphJson.xtext:120-122): a single token. */
  #parsePropertyKey(): Token {
    const { cursor } = this.#session;
    if (cursor.type() !== Tok.STRING && cursor.type() !== Tok.ID) {
      throw cursor.mismatch(RuleName.PROPERTY_KEY);
    }
    return cursor.next();
  }

  /** `value=StringValue | value=NumberValue | value=BooleanValue`, chosen by token type (`null` is an error). */
  #parsePropertyValue(entry: ElkPropertyToValueMapEntryImpl): void {
    const { cursor } = this.#session;
    const rule = VALUE_RULES.get(cursor.type());
    if (rule === undefined) {
      throw cursor.mismatch('a property value');
    }
    this.#session.assignToken({ owner: entry, feature: 'value', rule }, cursor.next(), (v) => entry.setTypedValue(v));
  }

  /** `JsonObject` (ElkGraphJson.xtext:148): parsed and discarded. */
  parseJsonObject(): void {
    this.list(Tok.LBRACE, Tok.RBRACE, true, () => this.parseJsonMember());
  }

  /** `JsonArray` (149): parsed and discarded. */
  parseJsonArray(): void {
    this.list(Tok.LBRACKET, Tok.RBRACKET, true, () => this.parseJsonValue());
  }

  /** `JsonMember: (STRING | ID) ':' JsonValue` (150): parsed and discarded, never converted. */
  parseJsonMember(): void {
    const { cursor } = this.#session;
    if (cursor.type() !== Tok.STRING && cursor.type() !== Tok.ID) {
      throw cursor.mismatch('a member');
    }
    cursor.next();
    cursor.expect(Tok.COLON);
    this.parseJsonValue();
  }

  /** `JsonValue: STRING | Number | JsonObject | JsonArray | BooleanValue | 'null'` (151). */
  parseJsonValue(): void {
    const { cursor } = this.#session;
    const type = cursor.type();
    if (SCALAR_VALUES.has(type)) {
      cursor.next();
    } else if (type === Tok.LBRACE) {
      this.parseJsonObject();
    } else if (type === Tok.LBRACKET) {
      this.parseJsonArray();
    } else {
      throw cursor.mismatch(JSON_VALUE_RULE);
    }
  }
}
