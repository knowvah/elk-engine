// SPDX-License-Identifier: EPL-2.0
import type { EReferenceInfo } from '../../../xtext/scoping/EReferenceInfo.js';
import type { ElkBendPoint } from '../../ElkBendPoint.js';
import type { ElkEdge } from '../../ElkEdge.js';
import type { ElkEdgeSection } from '../../ElkEdgeSection.js';
import type { ElkPropertyToValueMapEntryImpl } from '../../impl/ElkPropertyToValueMapEntryImpl.js';
import { ElkGraphRuleName } from '../conversion/ElkGraphValueConverterService.js';
import {
  ELK_EDGE_SECTION__INCOMING_SHAPE,
  ELK_EDGE_SECTION__OUTGOING_SECTIONS,
  ELK_EDGE_SECTION__OUTGOING_SHAPE,
} from '../linking/ElkGraphReferences.js';
import { ElkGraphGrammarAccess } from './ElkGraphGrammarAccess.js';
import {
  MULTI_SECTION_IDS,
  SINGLE_SECTION_IDS,
  type SectionIds,
  type ShapeReferenceIds,
} from './ElkGraphSectionGrammar.js';
import { ElkGraphSerializationError } from './ElkGraphSerializationError.js';
import { Kw } from './ElkGraphSyntacticSequencer.js';
import { ElkGraphTokenWriter, TerminalRuleName, type ReferenceIds } from './ElkGraphTokenWriter.js';
import { ElkFeature, ListTransient, type ElkGraphTransientValueService } from './ElkGraphTransientValueService.js';
import { groupMember, orderUnorderedGroup, type GroupMember } from './ElkGraphUnorderedGroup.js';

const A = ElkGraphGrammarAccess;

/** What the section sequencer needs from the semantic sequencer: the rules below a section. */
export interface SectionContentSequencer {
  sequence_Property(entry: ElkPropertyToValueMapEntryImpl): void;
  sequence_ElkBendPoint(bendPoint: ElkBendPoint): void;
}

/** The members of the unordered group of a section body. */
const SectionMember = { INCOMING: 'incoming', OUTGOING: 'outgoing', START: 'start', END: 'end' } as const;
type SectionMember = (typeof SectionMember)[keyof typeof SectionMember];

/**
 * The `EdgeLayout` fragment of an edge and the two section rules. They form one unit because both section rules
 * share their body (`incoming`/`outgoing`/`start`/`end` as an unordered group, then `bends`, then properties),
 * and the constraint of the edge decides between them: the single form for exactly one section without
 * identifier, the multi form for sections that all have one.
 *
 * @see org.eclipse.elk.graph.text/src-gen/org/eclipse/elk/graph/text/serializer/AbstractElkGraphSemanticSequencer.java:108-215
 */
export class ElkGraphSectionSequencer {
  constructor(
    private readonly transientValues: ElkGraphTransientValueService,
    private readonly tokens: ElkGraphTokenWriter,
    private readonly content: SectionContentSequencer,
  ) {}

  /** `EdgeLayout: 'layout' '[' (sections+=ElkSingleEdgeSection | sections+=ElkEdgeSection+) ']'`, if any section. */
  edgeLayout(edge: ElkEdge): void {
    const sections = [...edge.getSections()];
    if (sections.length === 0) return;
    const single = sections.length === 1 && sections[0]!.getIdentifier() === null;
    if (!single && sections.some((s) => s.getIdentifier() === null)) {
      throw new ElkGraphSerializationError(
        `Could not serialize ElkEdge via backtracking: ${sections.length} sections need an identifier each unless the edge has exactly one.`,
      );
    }
    this.tokens.keyword(A.edgeLayoutAccess.layoutKeyword_0, Kw.LAYOUT, edge);
    this.tokens.keyword(A.edgeLayoutAccess.leftSquareBracketKeyword_1, Kw.LEFT_SQUARE, edge);
    const ruleCall = single
      ? A.edgeLayoutAccess.sectionsElkSingleEdgeSectionParserRuleCall_2_0_0
      : A.edgeLayoutAccess.sectionsElkEdgeSectionParserRuleCall_2_1_0;
    this.tokens.contained(sections, ruleCall, (section) =>
      single ? this.sequence_ElkSingleEdgeSection(section) : this.sequence_ElkEdgeSection(section),
    );
    this.tokens.keyword(A.edgeLayoutAccess.rightSquareBracketKeyword_3, Kw.RIGHT_SQUARE, edge);
  }

  /**
   * Constraint: `(( (incomingShape | outgoingShape)? (startX startY)? (endX endY)? )+ (bendPoints
   * bendPoints*)? properties+=Property*)`. A single section has no identifier and no outgoing sections.
   */
  sequence_ElkSingleEdgeSection(section: ElkEdgeSection): void {
    if (this.has(section, ElkFeature.OUTGOING_SECTIONS)) {
      throw new ElkGraphSerializationError(
        'Could not serialize ElkSingleEdgeSection: outgoingSections need a section with identifier.',
      );
    }
    this.body(section, SINGLE_SECTION_IDS);
  }

  /**
   * Constraint: `(identifier=ID (outgoingSections+=[ElkEdgeSection|ID] outgoingSections*)? (( ... )+ as above)
   * (bendPoints bendPoints*)? properties+=Property*)`; the brackets always appear, even for an empty body.
   */
  sequence_ElkEdgeSection(section: ElkEdgeSection): void {
    const identifier = section.getIdentifier();
    if (identifier === null) {
      throw new ElkGraphSerializationError(
        `Could not serialize ElkEdgeSection: '${ElkFeature.IDENTIFIER}' is required to have a value, but it does not.`,
      );
    }
    const ids = A.elkEdgeSectionAccess;
    this.tokens.keyword(ids.sectionKeyword_0, Kw.SECTION, section);
    this.tokens.value(
      { ruleCall: ids.identifierIDTerminalRuleCall_1_0, assignment: ids.identifierAssignment_1 },
      TerminalRuleName.ID,
      identifier,
      section,
    );
    this.outgoingSections(section);
    this.tokens.keyword(ids.leftSquareBracketKeyword_3, Kw.LEFT_SQUARE, section);
    this.body(section, MULTI_SECTION_IDS);
    this.tokens.keyword(ids.rightSquareBracketKeyword_5, Kw.RIGHT_SQUARE, section);
  }

  /** `('->' outgoingSections+=[ElkEdgeSection|ID] (',' outgoingSections+=[ElkEdgeSection|ID])*)?`. */
  private outgoingSections(section: ElkEdgeSection): void {
    const ids = A.elkEdgeSectionAccess;
    const targets = [...section.getOutgoingSections()];
    const first: ReferenceIds = {
      crossReference: ids.outgoingSectionsElkEdgeSectionCrossReference_2_1_0,
      assignment: ids.outgoingSectionsAssignment_2_1,
    };
    const next: ReferenceIds = {
      crossReference: ids.outgoingSectionsElkEdgeSectionCrossReference_2_2_1_0,
      assignment: ids.outgoingSectionsAssignment_2_2_1,
    };
    targets.forEach((target, i) => {
      const keyword = i === 0 ? ids.hyphenMinusGreaterThanSignKeyword_2_0 : ids.commaKeyword_2_2_0;
      this.tokens.keyword(keyword, i === 0 ? Kw.ARROW : Kw.COMMA, section);
      this.tokens.crossReference(
        i === 0 ? first : next,
        ELK_EDGE_SECTION__OUTGOING_SECTIONS,
        TerminalRuleName.ID,
        section,
        target,
      );
    });
  }

  /** The unordered group, `bends`, and the properties, with the element ids of the section rule `ids`. */
  private body(section: ElkEdgeSection, ids: SectionIds): void {
    for (const member of orderUnorderedGroup(this.members(section))) {
      this.sequenceMember(section, ids, member);
    }
    this.bendPoints(section, ids);
    this.tokens.properties(section, ids.properties, (e) => this.content.sequence_Property(e));
  }

  private members(section: ElkEdgeSection): GroupMember<SectionMember>[] {
    const member = (key: SectionMember, ...features: ElkFeature[]): GroupMember<SectionMember> =>
      groupMember(this.transientValues, section, key, features);
    return [
      member(SectionMember.INCOMING, ElkFeature.INCOMING_SHAPE),
      member(SectionMember.OUTGOING, ElkFeature.OUTGOING_SHAPE),
      member(SectionMember.START, ElkFeature.START_X, ElkFeature.START_Y),
      member(SectionMember.END, ElkFeature.END_X, ElkFeature.END_Y),
    ];
  }

  private sequenceMember(section: ElkEdgeSection, ids: SectionIds, member: SectionMember): void {
    switch (member) {
      case SectionMember.INCOMING:
        this.shapeReference(section, ids.incoming, Kw.INCOMING, ELK_EDGE_SECTION__INCOMING_SHAPE);
        break;
      case SectionMember.OUTGOING:
        this.shapeReference(section, ids.outgoing, Kw.OUTGOING, ELK_EDGE_SECTION__OUTGOING_SHAPE);
        break;
      case SectionMember.START:
        this.tokens.pair(section, ids.start, Kw.START, section.getStartX(), section.getStartY());
        break;
      case SectionMember.END:
        this.tokens.pair(section, ids.end, Kw.END, section.getEndX(), section.getEndY());
        break;
    }
  }

  private shapeReference(
    section: ElkEdgeSection,
    ids: ShapeReferenceIds,
    keyword: string,
    reference: EReferenceInfo,
  ): void {
    const target =
      reference === ELK_EDGE_SECTION__INCOMING_SHAPE ? section.getIncomingShape() : section.getOutgoingShape();
    if (target === null) return;
    this.tokens.keyword(ids.keyword, keyword, section);
    this.tokens.keyword(ids.colon, Kw.COLON, section);
    this.tokens.crossReference(ids, reference, ElkGraphRuleName.QUALIFIED_ID, section, target);
  }

  /** `('bends' ':' bendPoints+=ElkBendPoint ('|' bendPoints+=ElkBendPoint)*)?`. */
  private bendPoints(section: ElkEdgeSection, ids: SectionIds): void {
    const points = [...section.getBendPoints()];
    if (points.length === 0) return;
    this.tokens.keyword(ids.bendsKeyword, Kw.BENDS, section);
    this.tokens.keyword(ids.bendsColon, Kw.COLON, section);
    points.forEach((point, i) => {
      if (i > 0) this.tokens.keyword(ids.bar, Kw.BAR, section);
      this.tokens.contained([point], (i === 0 ? ids.firstBend : ids.nextBend).ruleCall, (p) =>
        this.content.sequence_ElkBendPoint(p),
      );
    });
  }

  private has(section: ElkEdgeSection, feature: ElkFeature): boolean {
    return this.transientValues.isListTransient(section, feature) === ListTransient.NO;
  }
}
