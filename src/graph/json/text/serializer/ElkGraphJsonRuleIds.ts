// SPDX-License-Identifier: EPL-2.0
import { ElkGraphJsonGrammarAccess } from './ElkGraphJsonGrammarAccess.js';
import { KeyToken, Kw } from './ElkGraphJsonSyntacticSequencer.js';
import type { AssignedIds } from './ElkGraphJsonTokenWriter.js';

const A = ElkGraphJsonGrammarAccess;

/** The braces and separators of one object rule (`ElkNode`, `ElkPort`, `ElkLabel`, `ElkEdge`). */
export interface ObjectIds {
  readonly open: string;
  /** The comma between two elements. */
  readonly comma: string;
  readonly close: string;
  /** The `JsonMember` call of the element rule: the only unassigned way to fill a mandatory element. */
  readonly member: string | null;
}

/** The ids of one `Key ':' '[' item ']'` (or `'{' item '}'`) block of an element rule. */
export interface BlockIds {
  readonly key: string;
  readonly keyText: string;
  readonly colon: string;
  readonly open: string;
  readonly close: string;
  /** The text of the opening and closing bracket: square for a list, curly for the properties. */
  readonly openText: string;
  readonly closeText: string;
  /** The rule call (containment) that enters the item, or the cross reference (reference) that names it. */
  readonly item: string;
  /** The assignment of a cross reference item. */
  readonly assignment: string;
}

export const OBJECT_IDS = {
  node: {
    open: A.elkNodeAccess.leftCurlyBracketKeyword_1,
    comma: A.elkNodeAccess.commaKeyword_2_1_0,
    close: A.elkNodeAccess.rightCurlyBracketKeyword_4,
    member: null,
  },
  port: {
    open: A.elkPortAccess.leftCurlyBracketKeyword_0,
    comma: A.elkPortAccess.commaKeyword_2_0,
    close: A.elkPortAccess.rightCurlyBracketKeyword_4,
    member: A.portElementAccess.jsonMemberParserRuleCall_4,
  },
  label: {
    open: A.elkLabelAccess.leftCurlyBracketKeyword_0,
    comma: A.elkLabelAccess.commaKeyword_2_0,
    close: A.elkLabelAccess.rightCurlyBracketKeyword_4,
    member: A.labelElementAccess.jsonMemberParserRuleCall_5,
  },
  edge: {
    open: A.elkEdgeAccess.leftCurlyBracketKeyword_0,
    comma: A.elkEdgeAccess.commaKeyword_2_0,
    close: A.elkEdgeAccess.rightCurlyBracketKeyword_4,
    member: A.edgeElementAccess.jsonMemberParserRuleCall_5,
  },
} as const satisfies Record<string, ObjectIds>;

const SQUARE = { openText: Kw.LEFT_SQUARE, closeText: Kw.RIGHT_SQUARE } as const;
const CURLY = { openText: Kw.LEFT_CURLY, closeText: Kw.RIGHT_CURLY } as const;

function labelsBlock(key: string, colon: string): BlockIds {
  return {
    key,
    keyText: KeyToken.LABELS,
    ...SQUARE,
    colon,
    open: A.elkGraphElementLabelsAccess.leftSquareBracketKeyword_0,
    close: A.elkGraphElementLabelsAccess.rightSquareBracketKeyword_3,
    item: A.elkGraphElementLabelsAccess.labelsElkLabelParserRuleCall_1_0_0,
    assignment: A.elkGraphElementLabelsAccess.labelsAssignment_1_0,
  };
}

function propertiesBlock(key: string, colon: string): BlockIds {
  return {
    key,
    keyText: KeyToken.LAYOUT_OPTIONS,
    ...CURLY,
    colon,
    open: A.elkGraphElementPropertiesAccess.leftCurlyBracketKeyword_0,
    close: A.elkGraphElementPropertiesAccess.rightCurlyBracketKeyword_3,
    item: A.elkGraphElementPropertiesAccess.propertiesPropertyParserRuleCall_1_0_0,
    assignment: A.elkGraphElementPropertiesAccess.propertiesAssignment_1_0,
  };
}

/** The key, colon and fragment ids of the blocks of each element rule; the first slot of each list fragment. */
export const BLOCK_IDS = {
  children: {
    key: A.nodeElementAccess.keyChildrenParserRuleCall_2_0,
    keyText: KeyToken.CHILDREN,
    ...SQUARE,
    colon: A.nodeElementAccess.colonKeyword_2_1,
    open: A.elkNodeChildrenAccess.leftSquareBracketKeyword_0,
    close: A.elkNodeChildrenAccess.rightSquareBracketKeyword_3,
    item: A.elkNodeChildrenAccess.childrenElkNodeParserRuleCall_1_0_0,
    assignment: A.elkNodeChildrenAccess.childrenAssignment_1_0,
  },
  ports: {
    key: A.nodeElementAccess.keyPortsParserRuleCall_3_0,
    keyText: KeyToken.PORTS,
    ...SQUARE,
    colon: A.nodeElementAccess.colonKeyword_3_1,
    open: A.elkNodePortsAccess.leftSquareBracketKeyword_0,
    close: A.elkNodePortsAccess.rightSquareBracketKeyword_3,
    item: A.elkNodePortsAccess.portsElkPortParserRuleCall_1_0_0,
    assignment: A.elkNodePortsAccess.portsAssignment_1_0,
  },
  containedEdges: {
    key: A.nodeElementAccess.keyEdgesParserRuleCall_5_0,
    keyText: KeyToken.EDGES,
    ...SQUARE,
    colon: A.nodeElementAccess.colonKeyword_5_1,
    open: A.elkNodeEdgesAccess.leftSquareBracketKeyword_0,
    close: A.elkNodeEdgesAccess.rightSquareBracketKeyword_3,
    item: A.elkNodeEdgesAccess.containedEdgesElkEdgeParserRuleCall_1_0_0,
    assignment: A.elkNodeEdgesAccess.containedEdgesAssignment_1_0,
  },
  sources: {
    key: A.edgeElementAccess.keySourcesParserRuleCall_1_0,
    keyText: KeyToken.SOURCES,
    ...SQUARE,
    colon: A.edgeElementAccess.colonKeyword_1_1,
    open: A.elkEdgeSourcesAccess.leftSquareBracketKeyword_0,
    close: A.elkEdgeSourcesAccess.rightSquareBracketKeyword_3,
    item: A.elkEdgeSourcesAccess.sourcesElkConnectableShapeCrossReference_1_0_0,
    assignment: A.elkEdgeSourcesAccess.sourcesAssignment_1_0,
  },
  targets: {
    key: A.edgeElementAccess.keyTargetsParserRuleCall_2_0,
    keyText: KeyToken.TARGETS,
    ...SQUARE,
    colon: A.edgeElementAccess.colonKeyword_2_1,
    open: A.elkEdgeTargetsAccess.leftSquareBracketKeyword_0,
    close: A.elkEdgeTargetsAccess.rightSquareBracketKeyword_3,
    item: A.elkEdgeTargetsAccess.targetsElkConnectableShapeCrossReference_1_0_0,
    assignment: A.elkEdgeTargetsAccess.targetsAssignment_1_0,
  },
  nodeLabels: labelsBlock(A.nodeElementAccess.keyLabelsParserRuleCall_4_0, A.nodeElementAccess.colonKeyword_4_1),
  portLabels: labelsBlock(A.portElementAccess.keyLabelsParserRuleCall_2_0, A.portElementAccess.colonKeyword_2_1),
  labelLabels: labelsBlock(A.labelElementAccess.keyLabelsParserRuleCall_3_0, A.labelElementAccess.colonKeyword_3_1),
  edgeLabels: labelsBlock(A.edgeElementAccess.keyLabelsParserRuleCall_3_0, A.edgeElementAccess.colonKeyword_3_1),
  nodeProperties: propertiesBlock(
    A.nodeElementAccess.keyLayoutOptionsParserRuleCall_6_0,
    A.nodeElementAccess.colonKeyword_6_1,
  ),
  portProperties: propertiesBlock(
    A.portElementAccess.keyLayoutOptionsParserRuleCall_3_0,
    A.portElementAccess.colonKeyword_3_1,
  ),
  labelProperties: propertiesBlock(
    A.labelElementAccess.keyLayoutOptionsParserRuleCall_4_0,
    A.labelElementAccess.colonKeyword_4_1,
  ),
  edgeProperties: propertiesBlock(
    A.edgeElementAccess.keyLayoutOptionsParserRuleCall_4_0,
    A.edgeElementAccess.colonKeyword_4_1,
  ),
} as const satisfies Record<string, BlockIds>;

/** The ids of a `Key ':' value` element: the key rule call, the colon, and the assigned value. */
export interface MemberIds {
  readonly key: string;
  readonly keyText: string;
  readonly colon: string;
  readonly value: AssignedIds;
}

const shapeMember = (key: string, keyText: string, colon: string, value: AssignedIds): MemberIds => ({
  key,
  keyText,
  colon,
  value,
});

/** `ElkId`: `KeyId ':' identifier=STRING`. */
export const IDENTIFIER_IDS: MemberIds = shapeMember(
  A.elkIdAccess.keyIdParserRuleCall_0,
  KeyToken.ID,
  A.elkIdAccess.colonKeyword_1,
  { ruleCall: A.elkIdAccess.identifierSTRINGTerminalRuleCall_2_0, assignment: A.elkIdAccess.identifierAssignment_2 },
);

/** `LabelElement`: `KeyText ':' text=STRING`. */
export const TEXT_IDS: MemberIds = shapeMember(
  A.labelElementAccess.keyTextParserRuleCall_2_0,
  KeyToken.TEXT,
  A.labelElementAccess.colonKeyword_2_1,
  {
    ruleCall: A.labelElementAccess.textSTRINGTerminalRuleCall_2_2_0,
    assignment: A.labelElementAccess.textAssignment_2_2,
  },
);

/** `ShapeElement`: one `Key ':' Number` alternative per coordinate. */
export const SHAPE_IDS = {
  x: shapeMember(A.shapeElementAccess.keyXParserRuleCall_0_0, KeyToken.X, A.shapeElementAccess.colonKeyword_0_1, {
    ruleCall: A.shapeElementAccess.XNumberParserRuleCall_0_2_0,
    assignment: A.shapeElementAccess.XAssignment_0_2,
  }),
  y: shapeMember(A.shapeElementAccess.keyYParserRuleCall_1_0, KeyToken.Y, A.shapeElementAccess.colonKeyword_1_1, {
    ruleCall: A.shapeElementAccess.YNumberParserRuleCall_1_2_0,
    assignment: A.shapeElementAccess.YAssignment_1_2,
  }),
  width: shapeMember(
    A.shapeElementAccess.keyWidthParserRuleCall_2_0,
    KeyToken.WIDTH,
    A.shapeElementAccess.colonKeyword_2_1,
    {
      ruleCall: A.shapeElementAccess.widthNumberParserRuleCall_2_2_0,
      assignment: A.shapeElementAccess.widthAssignment_2_2,
    },
  ),
  height: shapeMember(
    A.shapeElementAccess.keyHeightParserRuleCall_3_0,
    KeyToken.HEIGHT,
    A.shapeElementAccess.colonKeyword_3_1,
    {
      ruleCall: A.shapeElementAccess.heightNumberParserRuleCall_3_2_0,
      assignment: A.shapeElementAccess.heightAssignment_3_2,
    },
  ),
} as const satisfies Record<string, MemberIds>;

/** `Property`: `key=PropertyKey ':' value`; the value always travels `StringValue`, the first alternative. */
export const PROPERTY_IDS = {
  key: { ruleCall: A.propertyAccess.keyPropertyKeyParserRuleCall_0_0, assignment: A.propertyAccess.keyAssignment_0 },
  colon: A.propertyAccess.colonKeyword_1,
  value: {
    ruleCall: A.propertyAccess.valueStringValueParserRuleCall_2_0_0,
    assignment: A.propertyAccess.valueAssignment_2_0,
  },
} as const;
