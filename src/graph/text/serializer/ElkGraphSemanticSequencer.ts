// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import { ElkPropertyToValueMapEntryImpl } from '../../impl/ElkPropertyToValueMapEntryImpl.js';
import { isPropertyValueProxy } from '../../properties/IPropertyValueProxy.js';
import type { ElkBendPoint } from '../../ElkBendPoint.js';
import type { ElkConnectableShape } from '../../ElkConnectableShape.js';
import type { ElkEdge } from '../../ElkEdge.js';
import type { ElkEdgeSection } from '../../ElkEdgeSection.js';
import type { ElkLabel } from '../../ElkLabel.js';
import type { ElkNode } from '../../ElkNode.js';
import type { ElkPort } from '../../ElkPort.js';
import type { ElkShape } from '../../ElkShape.js';
import { ElkGraphRuleName } from '../conversion/ElkGraphValueConverterService.js';
import { ELK_EDGE__SOURCES, ELK_EDGE__TARGETS } from '../linking/ElkGraphReferences.js';
import { ElkGraphGrammarAccess } from './ElkGraphGrammarAccess.js';
import { ElkGraphSectionSequencer } from './ElkGraphSectionSequencer.js';
import { ElkGraphSerializationError } from './ElkGraphSerializationError.js';
import { Kw } from './ElkGraphSyntacticSequencer.js';
import { ElkGraphTokenWriter, TerminalRuleName, type ReferenceIds } from './ElkGraphTokenWriter.js';
import { ElkFeature, ElkGraphTransientValueService, ListTransient } from './ElkGraphTransientValueService.js';
import { groupMember, orderUnorderedGroup, type GroupMember } from './ElkGraphUnorderedGroup.js';
import { SHAPE_POSITION_IDS, SHAPE_SIZE_IDS } from './ElkGraphSectionGrammar.js';

const A = ElkGraphGrammarAccess;

/** Rule calls of the contained lists (`labels | ports | children | containedEdges`) of a node rule. */
interface NodeContentIds {
  readonly properties: string;
  readonly labels: string;
  readonly ports: string;
  readonly children: string;
  readonly containedEdges: string;
}

const ROOT_NODE_CONTENT: NodeContentIds = {
  properties: A.rootNodeAccess.propertiesPropertyParserRuleCall_3_0,
  labels: A.rootNodeAccess.labelsElkLabelParserRuleCall_4_0_0,
  ports: A.rootNodeAccess.portsElkPortParserRuleCall_4_1_0,
  children: A.rootNodeAccess.childrenElkNodeParserRuleCall_4_2_0,
  containedEdges: A.rootNodeAccess.containedEdgesElkEdgeParserRuleCall_4_3_0,
};

const ELK_NODE_CONTENT: NodeContentIds = {
  properties: A.elkNodeAccess.propertiesPropertyParserRuleCall_2_2_0,
  labels: A.elkNodeAccess.labelsElkLabelParserRuleCall_2_3_0_0,
  ports: A.elkNodeAccess.portsElkPortParserRuleCall_2_3_1_0,
  children: A.elkNodeAccess.childrenElkNodeParserRuleCall_2_3_2_0,
  containedEdges: A.elkNodeAccess.containedEdgesElkEdgeParserRuleCall_2_3_3_0,
};

/** The lists of an edge end: first value, then `, value` repeated. */
interface EndpointIds {
  readonly first: ReferenceIds;
  readonly comma: string;
  readonly next: ReferenceIds;
}

const SOURCE_IDS: EndpointIds = {
  first: {
    crossReference: A.elkEdgeAccess.sourcesElkConnectableShapeCrossReference_2_0,
    assignment: A.elkEdgeAccess.sourcesAssignment_2,
  },
  comma: A.elkEdgeAccess.commaKeyword_3_0,
  next: {
    crossReference: A.elkEdgeAccess.sourcesElkConnectableShapeCrossReference_3_1_0,
    assignment: A.elkEdgeAccess.sourcesAssignment_3_1,
  },
};

const TARGET_IDS: EndpointIds = {
  first: {
    crossReference: A.elkEdgeAccess.targetsElkConnectableShapeCrossReference_5_0,
    assignment: A.elkEdgeAccess.targetsAssignment_5,
  },
  comma: A.elkEdgeAccess.commaKeyword_6_0,
  next: {
    crossReference: A.elkEdgeAccess.targetsElkConnectableShapeCrossReference_6_1_0,
    assignment: A.elkEdgeAccess.targetsAssignment_6_1,
  },
};

const PROPERTY_VALUE_IDS = {
  string: {
    ruleCall: A.propertyAccess.valueStringValueParserRuleCall_2_0_0,
    assignment: A.propertyAccess.valueAssignment_2_0,
  },
  qualifiedId: {
    ruleCall: A.propertyAccess.valueQualifiedIdValueParserRuleCall_2_1_0,
    assignment: A.propertyAccess.valueAssignment_2_1,
  },
  number: {
    ruleCall: A.propertyAccess.valueNumberValueParserRuleCall_2_2_0,
    assignment: A.propertyAccess.valueAssignment_2_2,
  },
  boolean: {
    ruleCall: A.propertyAccess.valueBooleanValueParserRuleCall_2_3_0,
    assignment: A.propertyAccess.valueAssignment_2_3,
  },
} as const;

const SHAPE_POSITION = 'position';
const SHAPE_SIZE = 'size';

/**
 * The semantic sequencer of the ELK graph language: one method per grammar rule, each writing the assigned
 * values of its object in the order the rule's constraint fixes (G1: no port of the generic backtracking
 * sequencer). Constraint and grammar order come from the generated sequencer's comments
 * (`AbstractElkGraphSemanticSequencer.java:95-246`) and `ElkGraph.xtext`; the unordered groups
 * (`ShapeLayout`, the section body) follow {@link orderUnorderedGroup}. What the generic sequencer does with
 * the rest of a constraint, per rule:
 *
 * - a required single value (`identifier=ID`, `text=STRING`) that is unset is a serialisation error;
 * - an optional group (`( ... )?`) is written iff one of its values is set; the syntactic braces `{ }` of nodes,
 *   ports, labels and edges belong to such a group and are written iff the body is not empty;
 * - a many-valued feature (`*`) writes every element in order; features of a loop of alternatives
 *   (`(labels | ports | children | containedEdges)*`) are written feature by feature in declaration order,
 *   since the sorted followers always prefer the earliest feature that still has values;
 * - transient features (`incomingEdges`, `outgoingEdges`, `incomingSections`, containers, derived) are skipped.
 *
 * `sequence_Property` is ELK's own override. The Xtext context finder is reduced to the dispatch of
 * {@link createSequence}: an `ElkNode` without container is the `RootNode` context, a section without
 * identifier the `ElkSingleEdgeSection` context.
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/serializer/ElkGraphSemanticSequencer.xtend
 * @see org.eclipse.elk.graph.text/src-gen/org/eclipse/elk/graph/text/serializer/AbstractElkGraphSemanticSequencer.java
 */
export class ElkGraphSemanticSequencer {
  private readonly sections: ElkGraphSectionSequencer;

  constructor(
    private readonly transientValues: ElkGraphTransientValueService,
    private readonly tokens: ElkGraphTokenWriter,
  ) {
    this.sections = new ElkGraphSectionSequencer(transientValues, tokens, this);
  }

  /** `ISemanticSequencer.createSequence(context, root)` with the context finder's choice. */
  createSequence(root: ElkNode): void {
    if (root.eContainer() === null) this.sequence_RootNode_ShapeLayout(root);
    else this.sequence_ElkNode_ShapeLayout(root);
  }

  /**
   * Constraint: `(identifier=ID? ((x y) | (width height))* properties+=Property* (labels+=ElkLabel | ports+=ElkPort
   * | children+=ElkNode | containedEdges+=ElkEdge)*)`; `identifier` and the shape are optional.
   */
  sequence_RootNode_ShapeLayout(node: ElkNode): void {
    const identifier = node.getIdentifier();
    if (identifier !== null) {
      this.tokens.keyword(A.rootNodeAccess.graphKeyword_1_0, Kw.GRAPH, node);
      this.tokens.value(
        {
          ruleCall: A.rootNodeAccess.identifierIDTerminalRuleCall_1_1_0,
          assignment: A.rootNodeAccess.identifierAssignment_1_1,
        },
        TerminalRuleName.ID,
        identifier,
        node,
      );
    }
    this.shapeLayout(node);
    this.nodeContent(node, ROOT_NODE_CONTENT);
  }

  /**
   * Constraint: `(identifier=ID ((x y) | (width height))* properties+=Property* (labels | ports | children |
   * containedEdges)*)`; everything after the identifier is the optional `{ ... }` body.
   */
  sequence_ElkNode_ShapeLayout(node: ElkNode): void {
    this.tokens.keyword(A.elkNodeAccess.nodeKeyword_0, Kw.NODE, node);
    this.tokens.value(
      {
        ruleCall: A.elkNodeAccess.identifierIDTerminalRuleCall_1_0,
        assignment: A.elkNodeAccess.identifierAssignment_1,
      },
      TerminalRuleName.ID,
      this.requiredIdentifier(node, 'ElkNode'),
      node,
    );
    const hasBody =
      this.shapeOrder(node).length > 0 ||
      this.hasValues(node, ElkFeature.PROPERTIES, ElkFeature.LABELS, ElkFeature.PORTS) ||
      this.hasValues(node, ElkFeature.CHILDREN, ElkFeature.CONTAINED_EDGES);
    if (!hasBody) return;
    this.tokens.keyword(A.elkNodeAccess.leftCurlyBracketKeyword_2_0, Kw.LEFT_CURLY, node);
    this.shapeLayout(node);
    this.nodeContent(node, ELK_NODE_CONTENT);
    this.tokens.keyword(A.elkNodeAccess.rightCurlyBracketKeyword_2_4, Kw.RIGHT_CURLY, node);
  }

  /** Constraint: `(identifier=ID ((x y) | (width height))* properties+=Property* labels+=ElkLabel*)`. */
  sequence_ElkPort_ShapeLayout(port: ElkPort): void {
    this.tokens.keyword(A.elkPortAccess.portKeyword_0, Kw.PORT, port);
    this.tokens.value(
      {
        ruleCall: A.elkPortAccess.identifierIDTerminalRuleCall_1_0,
        assignment: A.elkPortAccess.identifierAssignment_1,
      },
      TerminalRuleName.ID,
      this.requiredIdentifier(port, 'ElkPort'),
      port,
    );
    if (!this.hasBody(port)) return;
    this.tokens.keyword(A.elkPortAccess.leftCurlyBracketKeyword_2_0, Kw.LEFT_CURLY, port);
    this.shapeLayout(port);
    this.tokens.properties(port, A.elkPortAccess.propertiesPropertyParserRuleCall_2_2_0, (e) =>
      this.sequence_Property(e),
    );
    this.tokens.contained(port.getLabels(), A.elkPortAccess.labelsElkLabelParserRuleCall_2_3_0, (l) =>
      this.sequence_ElkLabel_ShapeLayout(l),
    );
    this.tokens.keyword(A.elkPortAccess.rightCurlyBracketKeyword_2_4, Kw.RIGHT_CURLY, port);
  }

  /**
   * Constraint: `(identifier=ID? text=STRING ((x y) | (width height))* properties+=Property* labels+=ElkLabel*)`.
   * `text` defaults to the empty string, a serialisable default: an unset text is written as `""`.
   */
  sequence_ElkLabel_ShapeLayout(label: ElkLabel): void {
    const text = label.getText();
    if (text === null) throw this.missing(label, 'ElkLabel', ElkFeature.TEXT);
    this.tokens.keyword(A.elkLabelAccess.labelKeyword_0, Kw.LABEL, label);
    this.labelIdentifier(label);
    this.tokens.value(
      {
        ruleCall: A.elkLabelAccess.textSTRINGTerminalRuleCall_2_0,
        assignment: A.elkLabelAccess.textAssignment_2,
      },
      TerminalRuleName.STRING,
      text,
      label,
    );
    if (this.hasBody(label)) this.labelBody(label);
  }

  /** `(identifier=ID ':')?` of a label. */
  private labelIdentifier(label: ElkLabel): void {
    const identifier = label.getIdentifier();
    if (identifier === null) return;
    const ids = A.elkLabelAccess;
    this.tokens.value(
      { ruleCall: ids.identifierIDTerminalRuleCall_1_0_0, assignment: ids.identifierAssignment_1_0 },
      TerminalRuleName.ID,
      identifier,
      label,
    );
    this.tokens.keyword(ids.colonKeyword_1_1, Kw.COLON, label);
  }

  private labelBody(label: ElkLabel): void {
    const ids = A.elkLabelAccess;
    this.tokens.keyword(ids.leftCurlyBracketKeyword_3_0, Kw.LEFT_CURLY, label);
    this.shapeLayout(label);
    this.tokens.properties(label, ids.propertiesPropertyParserRuleCall_3_2_0, (e) => this.sequence_Property(e));
    this.tokens.contained(label.getLabels(), ids.labelsElkLabelParserRuleCall_3_3_0, (l) =>
      this.sequence_ElkLabel_ShapeLayout(l),
    );
    this.tokens.keyword(ids.rightCurlyBracketKeyword_3_4, Kw.RIGHT_CURLY, label);
  }

  /**
   * Constraint: `(identifier=ID? sources+=... sources+=...* targets+=... targets+=...* (sections+=
   * ElkSingleEdgeSection | sections+=ElkEdgeSection+)? properties+=Property* labels+=ElkLabel*)`. At least one
   * source and one target are required; the single section must be the only section and have no identifier,
   * otherwise every section needs one.
   */
  sequence_EdgeLayout_ElkEdge(edge: ElkEdge): void {
    this.tokens.keyword(A.elkEdgeAccess.edgeKeyword_0, Kw.EDGE, edge);
    this.edgeIdentifier(edge);
    this.endpoints(edge, ElkFeature.SOURCES, SOURCE_IDS);
    this.tokens.keyword(A.elkEdgeAccess.hyphenMinusGreaterThanSignKeyword_4, Kw.ARROW, edge);
    this.endpoints(edge, ElkFeature.TARGETS, TARGET_IDS);
    if (!this.hasValues(edge, ElkFeature.SECTIONS, ElkFeature.PROPERTIES, ElkFeature.LABELS)) {
      this.tokens.out.emit_ElkEdge___LeftCurlyBracketKeyword_7_0_RightCurlyBracketKeyword_7_4__q(edge, []);
      return;
    }
    this.edgeBody(edge);
  }

  /** `(identifier=ID ':')?` of an edge. */
  private edgeIdentifier(edge: ElkEdge): void {
    const identifier = edge.getIdentifier();
    if (identifier === null) return;
    const ids = A.elkEdgeAccess;
    this.tokens.value(
      { ruleCall: ids.identifierIDTerminalRuleCall_1_0_0, assignment: ids.identifierAssignment_1_0 },
      TerminalRuleName.ID,
      identifier,
      edge,
    );
    this.tokens.keyword(ids.colonKeyword_1_1, Kw.COLON, edge);
  }

  /** `'{' EdgeLayout? properties+=Property* labels+=ElkLabel* '}'`. */
  private edgeBody(edge: ElkEdge): void {
    const ids = A.elkEdgeAccess;
    this.tokens.keyword(ids.leftCurlyBracketKeyword_7_0, Kw.LEFT_CURLY, edge);
    this.sections.edgeLayout(edge);
    this.tokens.properties(edge, ids.propertiesPropertyParserRuleCall_7_2_0, (e) => this.sequence_Property(e));
    this.tokens.contained(edge.getLabels(), ids.labelsElkLabelParserRuleCall_7_3_0, (l) =>
      this.sequence_ElkLabel_ShapeLayout(l),
    );
    this.tokens.keyword(ids.rightCurlyBracketKeyword_7_4, Kw.RIGHT_CURLY, edge);
  }

  /** `sequence_ElkEdgeSection`: the section with identifier. @see {@link ElkGraphSectionSequencer} */
  sequence_ElkEdgeSection(section: ElkEdgeSection): void {
    this.sections.sequence_ElkEdgeSection(section);
  }

  /** `sequence_ElkSingleEdgeSection`: the section without identifier. @see {@link ElkGraphSectionSequencer} */
  sequence_ElkSingleEdgeSection(section: ElkEdgeSection): void {
    this.sections.sequence_ElkSingleEdgeSection(section);
  }

  /** Constraint: `(x=Number y=Number)`; both are doubles with a serialisable default, never required. */
  sequence_ElkBendPoint(bendPoint: ElkBendPoint): void {
    const ids = A.elkBendPointAccess;
    this.tokens.number(
      { ruleCall: ids.XNumberParserRuleCall_0_0, assignment: ids.XAssignment_0 },
      bendPoint.getX(),
      bendPoint,
    );
    this.tokens.keyword(ids.commaKeyword_1, Kw.COMMA, bendPoint);
    this.tokens.number(
      { ruleCall: ids.YNumberParserRuleCall_2_0, assignment: ids.YAssignment_2 },
      bendPoint.getY(),
      bendPoint,
    );
  }

  /**
   * ELK's override: resolves a {@link IPropertyValueProxy} value in place (mutating the entry: callers
   * serialise a copy), requires the key, and chooses the value rule by the runtime type: `Boolean` ->
   * `BooleanValue`, `Number` -> `NumberValue`, `null` -> the keyword `null` (the syntactic sequencer's pick when
   * no value is assigned), anything else -> `QualifiedIdValue`, because {@link isQuotingNecessary} never says
   * yes (G1 quirk). The Xtend `else` arm for entries that are not `ElkPropertyToValueMapEntryImpl`
   * (`super.sequence_Property`) is unreachable: the property map of every ElkGraph object creates that class.
   *
   * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/serializer/ElkGraphSemanticSequencer.xtend:34-65
   */
  sequence_Property(entry: ElkPropertyToValueMapEntryImpl): void {
    const key = entry.getTypedKey();
    this.resolveProxy(entry);
    if (key === null) throw this.missing(entry, 'ElkPropertyToValueMapEntry', ElkFeature.KEY);
    this.tokens.value(
      { ruleCall: A.propertyAccess.keyPropertyKeyParserRuleCall_0_0, assignment: A.propertyAccess.keyAssignment_0 },
      ElkGraphRuleName.PROPERTY_KEY,
      key,
      entry,
    );
    this.tokens.keyword(A.propertyAccess.colonKeyword_1, Kw.COLON, entry);
    this.propertyValue(entry);
  }

  /**
   * ELK's `isQuotingNecessary` always returns `false` (G1 quirk): the `map` over the `Strings.split` parts is
   * unused, so the Xtend compiler drops the call on the never-injected `idValueConverter` and the method ends in
   * `return false` (`ElkGraphSemanticSequencer.xtend:32,67-74`; compiled `xtend-gen/.../ElkGraphSemanticSequencer.java:80-94`).
   * Every string value therefore travels `QualifiedIdValue`, whose converter quotes unescaped on its own
   * (`../decisions.md#g1--writer-architecture`).
   */
  protected isQuotingNecessary(_s: string): boolean {
    return false;
  }

  private resolveProxy(entry: ElkPropertyToValueMapEntryImpl): void {
    const key = entry.getTypedKey();
    const value = entry.getValue();
    if (key === null || !isPropertyValueProxy(value)) return;
    const resolved = value.resolveValue(key);
    if (resolved !== null) entry.setValue(resolved);
  }

  private propertyValue(entry: ElkPropertyToValueMapEntryImpl): void {
    const value = entry.getValue();
    if (typeof value === 'boolean') {
      this.tokens.value(PROPERTY_VALUE_IDS.boolean, ElkGraphRuleName.BOOLEAN_VALUE, value, entry);
    } else if (typeof value === 'number' || typeof value === 'bigint') {
      this.tokens.value(PROPERTY_VALUE_IDS.number, ElkGraphRuleName.NUMBER_VALUE, value, entry);
    } else if (value === null) {
      this.tokens.keyword(A.propertyAccess.nullKeyword_2_4, Kw.NULL, entry);
    } else if (this.isQuotingNecessary(String(value))) {
      this.tokens.value(PROPERTY_VALUE_IDS.string, ElkGraphRuleName.STRING_VALUE, value, entry);
    } else {
      this.tokens.value(PROPERTY_VALUE_IDS.qualifiedId, ElkGraphRuleName.QUALIFIED_ID_VALUE, value, entry);
    }
  }

  /** `ShapeLayout` (a fragment): `layout [ (position: x, y)? & (size: width, height)? ]`, omitted when empty. */
  private shapeLayout(shape: ElkShape): void {
    const order = this.shapeOrder(shape);
    if (order.length === 0) return;
    this.tokens.keyword(A.shapeLayoutAccess.layoutKeyword_0, Kw.LAYOUT, shape);
    this.tokens.keyword(A.shapeLayoutAccess.leftSquareBracketKeyword_1, Kw.LEFT_SQUARE, shape);
    for (const member of order) {
      if (member === SHAPE_POSITION) {
        this.tokens.pair(shape, SHAPE_POSITION_IDS, Kw.POSITION, shape.getX(), shape.getY());
      } else {
        this.tokens.pair(shape, SHAPE_SIZE_IDS, Kw.SIZE, shape.getWidth(), shape.getHeight());
      }
    }
    this.tokens.keyword(A.shapeLayoutAccess.rightSquareBracketKeyword_3, Kw.RIGHT_SQUARE, shape);
  }

  private shapeOrder(shape: ElkShape): string[] {
    return orderUnorderedGroup([
      this.member(shape, SHAPE_POSITION, ElkFeature.X, ElkFeature.Y),
      this.member(shape, SHAPE_SIZE, ElkFeature.WIDTH, ElkFeature.HEIGHT),
    ]);
  }

  private member(owner: EObject, key: string, first: ElkFeature, second: ElkFeature): GroupMember<string> {
    return groupMember(this.transientValues, owner, key, [first, second]);
  }

  private nodeContent(node: ElkNode, ids: NodeContentIds): void {
    this.tokens.properties(node, ids.properties, (e) => this.sequence_Property(e));
    this.tokens.contained(node.getLabels(), ids.labels, (l) => this.sequence_ElkLabel_ShapeLayout(l));
    this.tokens.contained(node.getPorts(), ids.ports, (p) => this.sequence_ElkPort_ShapeLayout(p));
    this.tokens.contained(node.getChildren(), ids.children, (c) => this.sequence_ElkNode_ShapeLayout(c));
    this.tokens.contained(node.getContainedEdges(), ids.containedEdges, (e) => this.sequence_EdgeLayout_ElkEdge(e));
  }

  private endpoints(edge: ElkEdge, feature: ElkFeature, ids: EndpointIds): void {
    const isSources = feature === ElkFeature.SOURCES;
    const targets: readonly ElkConnectableShape[] = [...(isSources ? edge.getSources() : edge.getTargets())];
    if (targets.length === 0) {
      throw new ElkGraphSerializationError(
        `ElkEdge.${feature} violates the lower bound: It holds 0 values, but at least 1 are required.`,
      );
    }
    const reference = isSources ? ELK_EDGE__SOURCES : ELK_EDGE__TARGETS;
    targets.forEach((target, i) => {
      if (i > 0) this.tokens.keyword(ids.comma, Kw.COMMA, edge);
      this.tokens.crossReference(
        i === 0 ? ids.first : ids.next,
        reference,
        ElkGraphRuleName.QUALIFIED_ID,
        edge,
        target,
      );
    });
  }

  private hasBody(owner: ElkPort | ElkLabel): boolean {
    return this.shapeOrder(owner).length > 0 || this.hasValues(owner, ElkFeature.PROPERTIES, ElkFeature.LABELS);
  }

  private hasValues(owner: EObject, ...features: ElkFeature[]): boolean {
    return features.some((f) => this.transientValues.isListTransient(owner, f) === ListTransient.NO);
  }

  private requiredIdentifier(owner: ElkNode | ElkPort, rule: string): string {
    const identifier = owner.getIdentifier();
    if (identifier === null) throw this.missing(owner, rule, ElkFeature.IDENTIFIER);
    return identifier;
  }

  private missing(_owner: EObject, rule: string, feature: ElkFeature): ElkGraphSerializationError {
    return new ElkGraphSerializationError(
      `Could not serialize ${rule}: '${feature}' is required to have a value, but it does not.`,
    );
  }
}
