// SPDX-License-Identifier: EPL-2.0
import type { EMapPropertyHolder } from '../../EMapPropertyHolder.js';
import type { ElkEdge } from '../../ElkEdge.js';
import type { ElkEdgeSection } from '../../ElkEdgeSection.js';
import { ElkGraphFactory } from '../../ElkGraphFactory.js';
import type { ElkGraphElement } from '../../ElkGraphElement.js';
import type { ElkNode } from '../../ElkNode.js';
import { type GroupMember, type ParseSession, RuleName, type TokenCursor, Tok } from './ParseRecords.js';

/** Converted text of a `QualifiedId`: concatenated, and as `NodeModelUtils.getTokenText` reads it. */
export interface QualifiedText {
  readonly joined: string;
  readonly spaced: string;
  readonly line: number;
}

/** The rules of the main parser that the edge rules call back into. */
export interface EdgeRuleHost {
  /** `properties+=Property*` */
  parseProperties(holder: EMapPropertyHolder): void;
  /** `labels+=ElkLabel*` */
  parseLabels(parent: ElkGraphElement): void;
}

/** Feature index of a single-valued reference (Xtext's `INSIGNIFICANT_INDEX`). */
const SINGLE_VALUED = -1;
const AFTER_COORDINATE = new Set<string>([Tok.COMMA]);
const AFTER_BEND_POINT = new Set<string>([Tok.BAR, Tok.ID, Tok.RBRACKET]);
/** What may follow the members of a section's unordered group, besides the members themselves. */
const SECTION_TAIL: readonly string[] = [Tok.BENDS, Tok.ID, Tok.RBRACKET];

/**
 * `QualifiedId: ID ('.' ID)*`, hidden tokens allowed between the tokens (ElkGraph.xtext:92-93).
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraph.xtext
 */
export function readQualifiedId(cursor: TokenCursor): QualifiedText {
  const first = cursor.expect(Tok.ID);
  let joined = first.text;
  let spaced = first.text;
  while (cursor.type() === Tok.DOT) {
    spaced += `${cursor.adjacent() ? '' : ' '}${cursor.next().text}`;
    const separator = cursor.adjacent() ? '' : ' ';
    const segment = cursor.expect(Tok.ID);
    spaced += `${separator}${segment.text}`;
    joined += `.${segment.text}`;
  }
  return { joined, spaced, line: first.line };
}

/** One numeric feature of a section and its setter. */
interface Coordinate {
  readonly feature: string;
  readonly set: (value: number) => void;
}

function startOf(s: ElkEdgeSection): readonly [Coordinate, Coordinate] {
  return [
    { feature: 'startX', set: (v) => s.setStartX(v) },
    { feature: 'startY', set: (v) => s.setStartY(v) },
  ];
}

function endOf(s: ElkEdgeSection): readonly [Coordinate, Coordinate] {
  return [
    { feature: 'endX', set: (v) => s.setEndX(v) },
    { feature: 'endY', set: (v) => s.setEndY(v) },
  ];
}

/**
 * The edge rules of `ElkGraph.xtext`: `ElkEdge`, `EdgeLayout`, `ElkSingleEdgeSection`, `ElkEdgeSection`,
 * `ElkBendPoint`. Cross references are recorded, never set (the eager linker does that).
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraph.xtext
 */
export class ElkEdgeRules {
  readonly #session: ParseSession;
  readonly #host: EdgeRuleHost;

  constructor(session: ParseSession, host: EdgeRuleHost) {
    this.#session = session;
    this.#host = host;
  }

  /** `ElkEdge`, appended to `parent.containedEdges` (ElkGraph.xtext:54-61). */
  parseEdge(parent: ElkNode): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    cursor.expect(Tok.EDGE);
    const edge = ElkGraphFactory.eINSTANCE.createElkEdge();
    if (cursor.type() === Tok.ID && cursor.type(2) === Tok.COLON) {
      this.#session.identifier(edge, 'identifier', (id) => edge.setIdentifier(id));
      cursor.next();
    }
    this.#parseEndpoints(edge, 'sources');
    cursor.expect(Tok.ARROW);
    this.#parseEndpoints(edge, 'targets');
    if (cursor.accept(Tok.LBRACE) !== null) {
      this.#parseEdgeBody(edge);
    }
    records.markObject(edge, cursor.lineFrom(start));
    this.#session.contain(parent, 'containedEdges', parent.getContainedEdges(), edge);
  }

  #parseEdgeBody(edge: ElkEdge): void {
    if (this.#session.cursor.type() === Tok.LAYOUT) {
      this.#parseEdgeLayout(edge);
    }
    this.#host.parseProperties(edge);
    this.#host.parseLabels(edge);
    this.#session.cursor.expect(Tok.RBRACE);
  }

  /** `feature+=[ElkConnectableShape|QualifiedId] (',' feature+=[...])*` */
  #parseEndpoints(edge: ElkEdge, feature: 'sources' | 'targets'): void {
    let index = 0;
    do {
      this.#reference(edge, feature, index++);
    } while (this.#session.cursor.accept(Tok.COMMA) !== null);
  }

  /** A `[ElkConnectableShape|QualifiedId]` reference at the cursor. */
  #reference(owner: ElkEdge | ElkEdgeSection, feature: string, index: number): void {
    const text = readQualifiedId(this.#session.cursor);
    this.#session.records.addReference({
      owner,
      feature,
      index,
      ruleName: RuleName.QUALIFIED_ID,
      text: text.spaced,
      line: text.line,
    });
  }

  /** `outgoingSections+=[ElkEdgeSection|ID]` */
  #idReference(owner: ElkEdgeSection, index: number): void {
    const token = this.#session.cursor.expect(Tok.ID);
    this.#session.records.addReference({
      owner,
      feature: 'outgoingSections',
      index,
      ruleName: RuleName.ID,
      text: token.text,
      line: token.line,
    });
  }

  /** `EdgeLayout`: a single section (also an empty one) unless the next token is `section` (63-66). */
  #parseEdgeLayout(edge: ElkEdge): void {
    const { cursor } = this.#session;
    cursor.expect(Tok.LAYOUT);
    cursor.expect(Tok.LBRACKET);
    if (cursor.type() === Tok.SECTION) {
      while (cursor.type() === Tok.SECTION) {
        this.#parseSection(edge);
      }
    } else {
      this.#parseSingleSection(edge);
    }
    cursor.expect(Tok.RBRACKET);
  }

  /** `ElkSingleEdgeSection`: the `{ElkEdgeSection}` action makes the object even if nothing follows. */
  #parseSingleSection(edge: ElkEdge): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    const section = ElkGraphFactory.eINSTANCE.createElkEdgeSection();
    this.#parseSectionBody(section);
    records.markObject(section, cursor.lineFrom(start));
    this.#session.contain(edge, 'sections', edge.getSections(), section);
  }

  /** `ElkEdgeSection` (79-87). */
  #parseSection(edge: ElkEdge): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    cursor.expect(Tok.SECTION);
    const section = ElkGraphFactory.eINSTANCE.createElkEdgeSection();
    this.#session.identifier(section, 'identifier', (id) => section.setIdentifier(id));
    if (cursor.accept(Tok.ARROW) !== null) {
      let index = 0;
      do {
        this.#idReference(section, index++);
      } while (cursor.accept(Tok.COMMA) !== null);
    }
    cursor.expect(Tok.LBRACKET);
    this.#parseSectionBody(section);
    cursor.expect(Tok.RBRACKET);
    records.markObject(section, cursor.lineFrom(start));
    this.#session.contain(edge, 'sections', edge.getSections(), section);
  }

  /** The shared body: the four-member unordered group, `bends`, then `properties+=Property*`. */
  #parseSectionBody(section: ElkEdgeSection): void {
    const { cursor } = this.#session;
    this.#session.unorderedGroup(this.#sectionMembers(section), SECTION_TAIL);
    if (cursor.accept(Tok.BENDS) !== null) {
      cursor.expect(Tok.COLON);
      this.#parseBendPoint(section);
      while (cursor.accept(Tok.BAR) !== null) {
        this.#parseBendPoint(section);
      }
    }
    this.#host.parseProperties(section);
  }

  #sectionMembers(section: ElkEdgeSection): GroupMember[] {
    return [
      {
        start: Tok.INCOMING,
        parse: () => {
          this.#session.cursor.expect(Tok.COLON);
          this.#reference(section, 'incomingShape', SINGLE_VALUED);
        },
      },
      {
        start: Tok.OUTGOING,
        parse: () => {
          this.#session.cursor.expect(Tok.COLON);
          this.#reference(section, 'outgoingShape', SINGLE_VALUED);
        },
      },
      this.#coordinates(Tok.START, section, startOf(section)),
      this.#coordinates(Tok.END, section, endOf(section)),
    ];
  }

  /** `keyword ':' x=Number ',' y=Number`, each coordinate set through its own feature. */
  #coordinates(keyword: string, section: ElkEdgeSection, pair: readonly [Coordinate, Coordinate]): GroupMember {
    return {
      start: keyword,
      parse: (follow) => {
        const { cursor } = this.#session;
        cursor.expect(Tok.COLON);
        const [x, y] = pair;
        this.#session.number({ owner: section, feature: x.feature }, AFTER_COORDINATE, x.set);
        cursor.expect(Tok.COMMA);
        this.#session.number({ owner: section, feature: y.feature }, follow, y.set);
      },
    };
  }

  /** `ElkBendPoint: x=Number ',' y=Number` (89-90). */
  #parseBendPoint(section: ElkEdgeSection): void {
    const { cursor, records } = this.#session;
    const start = cursor.position();
    const point = ElkGraphFactory.eINSTANCE.createElkBendPoint();
    this.#session.number({ owner: point, feature: 'x' }, AFTER_COORDINATE, (v) => point.setX(v));
    cursor.expect(Tok.COMMA);
    this.#session.number({ owner: point, feature: 'y' }, AFTER_BEND_POINT, (v) => point.setY(v));
    records.markObject(point, cursor.lineFrom(start));
    this.#session.contain(section, 'bendPoints', section.getBendPoints(), point);
  }
}
