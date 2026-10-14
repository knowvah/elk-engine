// SPDX-License-Identifier: EPL-2.0
import { ElkGraphGrammarAccess } from './ElkGraphGrammarAccess.js';

/** Grammar element ids of one `x : a , b` pair of a section or shape (`position`, `size`, `start`, `end`). */
export interface PairIds {
  readonly keyword: string;
  readonly colon: string;
  readonly firstAssignment: string;
  readonly firstRuleCall: string;
  readonly comma: string;
  readonly secondAssignment: string;
  readonly secondRuleCall: string;
}

/** Grammar element ids of a `incoming : ref` / `outgoing : ref` member of a section. */
export interface ShapeReferenceIds {
  readonly keyword: string;
  readonly colon: string;
  readonly assignment: string;
  readonly crossReference: string;
}

/**
 * The body of a section, which `ElkSingleEdgeSection` and `ElkEdgeSection` spell out twice in the grammar with
 * different element numbers. Both rules have the same shape, so the sequencer works on this table.
 */
export interface SectionIds {
  readonly rule: string;
  readonly incoming: ShapeReferenceIds;
  readonly outgoing: ShapeReferenceIds;
  readonly start: PairIds;
  readonly end: PairIds;
  readonly bendsKeyword: string;
  readonly bendsColon: string;
  readonly firstBend: { readonly assignment: string; readonly ruleCall: string };
  readonly bar: string;
  readonly nextBend: { readonly assignment: string; readonly ruleCall: string };
  readonly properties: string;
}

const S = ElkGraphGrammarAccess.elkSingleEdgeSectionAccess;
const M = ElkGraphGrammarAccess.elkEdgeSectionAccess;

/** `ElkSingleEdgeSection`: the section of an edge layout without identifier. */
export const SINGLE_SECTION_IDS: SectionIds = {
  rule: 'ElkSingleEdgeSection',
  incoming: {
    keyword: S.incomingKeyword_1_0_0_0,
    colon: S.colonKeyword_1_0_0_1,
    assignment: S.incomingShapeAssignment_1_0_0_2,
    crossReference: S.incomingShapeElkConnectableShapeCrossReference_1_0_0_2_0,
  },
  outgoing: {
    keyword: S.outgoingKeyword_1_0_1_0,
    colon: S.colonKeyword_1_0_1_1,
    assignment: S.outgoingShapeAssignment_1_0_1_2,
    crossReference: S.outgoingShapeElkConnectableShapeCrossReference_1_0_1_2_0,
  },
  start: {
    keyword: S.startKeyword_1_0_2_0,
    colon: S.colonKeyword_1_0_2_1,
    firstAssignment: S.startXAssignment_1_0_2_2,
    firstRuleCall: S.startXNumberParserRuleCall_1_0_2_2_0,
    comma: S.commaKeyword_1_0_2_3,
    secondAssignment: S.startYAssignment_1_0_2_4,
    secondRuleCall: S.startYNumberParserRuleCall_1_0_2_4_0,
  },
  end: {
    keyword: S.endKeyword_1_0_3_0,
    colon: S.colonKeyword_1_0_3_1,
    firstAssignment: S.endXAssignment_1_0_3_2,
    firstRuleCall: S.endXNumberParserRuleCall_1_0_3_2_0,
    comma: S.commaKeyword_1_0_3_3,
    secondAssignment: S.endYAssignment_1_0_3_4,
    secondRuleCall: S.endYNumberParserRuleCall_1_0_3_4_0,
  },
  bendsKeyword: S.bendsKeyword_1_1_0,
  bendsColon: S.colonKeyword_1_1_1,
  firstBend: {
    assignment: S.bendPointsAssignment_1_1_2,
    ruleCall: S.bendPointsElkBendPointParserRuleCall_1_1_2_0,
  },
  bar: S.verticalLineKeyword_1_1_3_0,
  nextBend: {
    assignment: S.bendPointsAssignment_1_1_3_1,
    ruleCall: S.bendPointsElkBendPointParserRuleCall_1_1_3_1_0,
  },
  properties: S.propertiesPropertyParserRuleCall_1_2_0,
};

/** `ElkEdgeSection`: the section with identifier, inside `section <id> ... [ ... ]`. */
export const MULTI_SECTION_IDS: SectionIds = {
  rule: 'ElkEdgeSection',
  incoming: {
    keyword: M.incomingKeyword_4_0_0_0,
    colon: M.colonKeyword_4_0_0_1,
    assignment: M.incomingShapeAssignment_4_0_0_2,
    crossReference: M.incomingShapeElkConnectableShapeCrossReference_4_0_0_2_0,
  },
  outgoing: {
    keyword: M.outgoingKeyword_4_0_1_0,
    colon: M.colonKeyword_4_0_1_1,
    assignment: M.outgoingShapeAssignment_4_0_1_2,
    crossReference: M.outgoingShapeElkConnectableShapeCrossReference_4_0_1_2_0,
  },
  start: {
    keyword: M.startKeyword_4_0_2_0,
    colon: M.colonKeyword_4_0_2_1,
    firstAssignment: M.startXAssignment_4_0_2_2,
    firstRuleCall: M.startXNumberParserRuleCall_4_0_2_2_0,
    comma: M.commaKeyword_4_0_2_3,
    secondAssignment: M.startYAssignment_4_0_2_4,
    secondRuleCall: M.startYNumberParserRuleCall_4_0_2_4_0,
  },
  end: {
    keyword: M.endKeyword_4_0_3_0,
    colon: M.colonKeyword_4_0_3_1,
    firstAssignment: M.endXAssignment_4_0_3_2,
    firstRuleCall: M.endXNumberParserRuleCall_4_0_3_2_0,
    comma: M.commaKeyword_4_0_3_3,
    secondAssignment: M.endYAssignment_4_0_3_4,
    secondRuleCall: M.endYNumberParserRuleCall_4_0_3_4_0,
  },
  bendsKeyword: M.bendsKeyword_4_1_0,
  bendsColon: M.colonKeyword_4_1_1,
  firstBend: {
    assignment: M.bendPointsAssignment_4_1_2,
    ruleCall: M.bendPointsElkBendPointParserRuleCall_4_1_2_0,
  },
  bar: M.verticalLineKeyword_4_1_3_0,
  nextBend: {
    assignment: M.bendPointsAssignment_4_1_3_1,
    ruleCall: M.bendPointsElkBendPointParserRuleCall_4_1_3_1_0,
  },
  properties: M.propertiesPropertyParserRuleCall_4_2_0,
};

const L = ElkGraphGrammarAccess.shapeLayoutAccess;

/** `ShapeLayout`: `position : x , y` and `size : width , height`. */
export const SHAPE_POSITION_IDS: PairIds = {
  keyword: L.positionKeyword_2_0_0,
  colon: L.colonKeyword_2_0_1,
  firstAssignment: L.XAssignment_2_0_2,
  firstRuleCall: L.XNumberParserRuleCall_2_0_2_0,
  comma: L.commaKeyword_2_0_3,
  secondAssignment: L.YAssignment_2_0_4,
  secondRuleCall: L.YNumberParserRuleCall_2_0_4_0,
};

export const SHAPE_SIZE_IDS: PairIds = {
  keyword: L.sizeKeyword_2_1_0,
  colon: L.colonKeyword_2_1_1,
  firstAssignment: L.widthAssignment_2_1_2,
  firstRuleCall: L.widthNumberParserRuleCall_2_1_2_0,
  comma: L.commaKeyword_2_1_3,
  secondAssignment: L.heightAssignment_2_1_4,
  secondRuleCall: L.heightNumberParserRuleCall_2_1_4_0,
};
