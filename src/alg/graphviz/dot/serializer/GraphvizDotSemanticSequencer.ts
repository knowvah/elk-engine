// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import type { Attribute } from '../dot/Attribute.js';
import type { AttributeStatement } from '../dot/AttributeStatement.js';
import { type DotEObject, DotPackage } from '../dot/DotPackage.js';
import type { EdgeStatement } from '../dot/EdgeStatement.js';
import type { EdgeTarget } from '../dot/EdgeTarget.js';
import type { Graph } from '../dot/Graph.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import type { Node } from '../dot/Node.js';
import type { NodeStatement } from '../dot/NodeStatement.js';
import type { Port } from '../dot/Port.js';
import type { Subgraph } from '../dot/Subgraph.js';
import { GraphvizDotGrammarAccess, GraphvizDotRuleName } from '../services/GraphvizDotGrammarAccess.js';
import {
  checkBounds,
  getValueCount,
  GraphvizDotConstraints,
  throwBacktrackingFailed,
} from './GraphvizDotConstraint.js';
import {
  createFeatureValueMissing,
  type DotSerializationContext,
  throwDiagnostic,
} from './GraphvizDotSerializationDiagnostic.js';
import { Kw } from './GraphvizDotSyntacticSequencer.js';
import type { AssignedIds, GraphvizDotTokenWriter } from './GraphvizDotTokenWriter.js';

const L = DotPackage.Literals;
const { DOT_ID, ID } = GraphvizDotRuleName;
const ga = GraphvizDotGrammarAccess;

/** The rules a child object is serialized by (`ISerializationContext.getParserRule()`). */
const Rule = {
  GRAPHVIZ_MODEL: 'GraphvizModel',
  GRAPH: 'Graph',
  STATEMENT: 'Statement',
  NODE: 'Node',
  EDGE_TARGET: 'EdgeTarget',
  SUBGRAPH: 'Subgraph',
  LIST_ATTRIBUTE: 'ListAttribute',
  PORT: 'Port',
} as const;

/** The context of the root object (`Serializer.getIContext(model)`). */
export const ROOT_CONTEXT: DotSerializationContext = { rule: Rule.GRAPHVIZ_MODEL };

/** `EdgeTarget_EdgeTarget`'s `IConstraint.toString()`, as the backtracking failure prints it. */
const EDGE_TARGET_CONSTRAINT =
  'EdgeTarget_EdgeTarget returns EdgeTarget: (operator=EdgeOperator (targetSubgraph=Subgraph | targetnode=Node));';

/** The grammar elements of one `'[' (attributes+=ListAttribute (','? attributes+=ListAttribute)*)? ']'`. */
interface AttributeListIds {
  readonly leftSquareBracket: string;
  readonly first: string;
  readonly next: string;
  readonly rightSquareBracket: string;
}

const NODE_STATEMENT_ATTRIBUTES: AttributeListIds = {
  leftSquareBracket: ga.nodeStatementAccess.leftSquareBracketKeyword_1_0,
  first: ga.nodeStatementAccess.attributesListAttributeParserRuleCall_1_1_0_0,
  next: ga.nodeStatementAccess.attributesListAttributeParserRuleCall_1_1_1_1_0,
  rightSquareBracket: ga.nodeStatementAccess.rightSquareBracketKeyword_1_2,
};
const EDGE_STATEMENT_ATTRIBUTES: AttributeListIds = {
  leftSquareBracket: ga.edgeStatementAccess.leftSquareBracketKeyword_2_0,
  first: ga.edgeStatementAccess.attributesListAttributeParserRuleCall_2_1_0_0,
  next: ga.edgeStatementAccess.attributesListAttributeParserRuleCall_2_1_1_1_0,
  rightSquareBracket: ga.edgeStatementAccess.rightSquareBracketKeyword_2_2,
};
const ATTRIBUTE_STATEMENT_ATTRIBUTES: AttributeListIds = {
  leftSquareBracket: ga.attributeStatementAccess.leftSquareBracketKeyword_1,
  first: ga.attributeStatementAccess.attributesListAttributeParserRuleCall_2_0_0,
  next: ga.attributeStatementAccess.attributesListAttributeParserRuleCall_2_1_1_0,
  rightSquareBracket: ga.attributeStatementAccess.rightSquareBracketKeyword_3,
};

const ids = (ruleCall: string, assignment: string): AssignedIds => ({ ruleCall, assignment });

/**
 * The semantic sequencer of the DOT language. `GraphvizDotSemanticSequencer` adds nothing to its generated parent,
 * which writes `Attribute` itself and sends every other rule to Xtext's generic backtracking sequencer. That
 * sequencer is not ported (D2): each `sequence_<Rule>` writes the values of its constraint in grammar order, as the
 * backtracking finds the one path of this grammar's constraints. It first checks the value counts against the
 * constraint (the backtracking fails exactly when a count is out of bounds, or, for `EdgeTarget`, when not exactly
 * one target is set), then writes the values; a contained object is entered and sequenced in place (the master
 * sequencer), and the ambiguity emitters of the syntactic sequencer write the optional keywords.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/serializer/GraphvizDotSemanticSequencer.java
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/serializer/AbstractGraphvizDotSemanticSequencer.java
 */
export class GraphvizDotSemanticSequencer {
  constructor(private readonly feeder: GraphvizDotTokenWriter) {}

  /** `ISemanticSequencer.createSequence(context, semanticObject)`. */
  createSequence(context: DotSerializationContext, semanticObject: DotEObject): void {
    this.sequence(context, semanticObject);
  }

  /**
   * The generated dispatch on the classifier id. `Attribute` goes to `sequence_ListAttribute` in the
   * `ListAttribute` context, to `sequence_Attribute` otherwise. The generated fallback (an invalid context or type
   * diagnostic) is unreachable: the only object without a constraint, a bare `Statement`, is rejected by the
   * syntactic sequencer before its sequence starts (`AbstractSyntacticSequencer.enterAssignedParserRuleCall`).
   *
   * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/serializer/AbstractGraphvizDotSemanticSequencer.java:39-89
   */
  sequence(context: DotSerializationContext, semanticObject: DotEObject): void {
    switch (semanticObject.eClass().getClassifierID()) {
      case DotPackage.ATTRIBUTE:
        if (context.rule === Rule.LIST_ATTRIBUTE) this.sequence_ListAttribute(context, semanticObject as Attribute);
        else this.sequence_Attribute(context, semanticObject as Attribute);
        return;
      case DotPackage.ATTRIBUTE_STATEMENT:
        return this.sequence_AttributeStatement(context, semanticObject as AttributeStatement);
      case DotPackage.EDGE_STATEMENT:
        return this.sequence_EdgeStatement(context, semanticObject as EdgeStatement);
      case DotPackage.EDGE_TARGET:
        return this.sequence_EdgeTarget(context, semanticObject as EdgeTarget);
      case DotPackage.GRAPH:
        return this.sequence_Graph(context, semanticObject as Graph);
      case DotPackage.GRAPHVIZ_MODEL:
        return this.sequence_GraphvizModel(context, semanticObject as GraphvizModel);
      default:
        return this.sequenceRest(context, semanticObject);
    }
  }

  /** The second half of the generated `switch` (split for the complexity limit; same order). */
  private sequenceRest(context: DotSerializationContext, semanticObject: DotEObject): void {
    switch (semanticObject.eClass().getClassifierID()) {
      case DotPackage.NODE:
        return this.sequence_Node(context, semanticObject as Node);
      case DotPackage.NODE_STATEMENT:
        return this.sequence_NodeStatement(context, semanticObject as NodeStatement);
      case DotPackage.PORT:
        return this.sequence_Port(context, semanticObject as Port);
      case DotPackage.SUBGRAPH:
        return this.sequence_Subgraph(context, semanticObject as Subgraph);
    }
    throw new IllegalStateException(`Invalid context: ${context.rule} returns ${semanticObject.eClass().getName()}`);
  }

  /** Constraint: `(type=AttributeType (attributes+=ListAttribute attributes+=ListAttribute*)?)`. */
  protected sequence_AttributeStatement(context: DotSerializationContext, semanticObject: AttributeStatement): void {
    checkBounds(semanticObject, context, GraphvizDotConstraints.AttributeStatement!);
    const access = ga.attributeStatementAccess;
    const type = semanticObject.getType();
    this.feeder.enumLiteral(
      ids(access.typeAttributeTypeEnumRuleCall_0_0, access.typeAssignment_0),
      L.ATTRIBUTE_STATEMENT__TYPE,
      type.getLiteral(),
      semanticObject,
    );
    this.feeder.keyword(access.leftSquareBracketKeyword_1, Kw.LEFT_SQUARE, semanticObject);
    this.listAttributes(semanticObject.getAttributes(), ATTRIBUTE_STATEMENT_ATTRIBUTES, () =>
      this.feeder.out.emit_AttributeStatement_CommaKeyword_2_1_0_q(semanticObject),
    );
    this.feeder.keyword(access.rightSquareBracketKeyword_3, Kw.RIGHT_SQUARE, semanticObject);
    this.statementEnd(context, semanticObject);
  }

  /**
   * Constraint: `(name=DotID value=DotID)`. The generated method itself: a transient (unset) name or value is a
   * missing-value diagnostic, the name's first.
   *
   * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/serializer/AbstractGraphvizDotSemanticSequencer.java:103-114
   */
  protected sequence_Attribute(context: DotSerializationContext, semanticObject: Attribute): void {
    if (getValueCount(semanticObject, L.ATTRIBUTE__NAME) === 0) {
      throwDiagnostic(createFeatureValueMissing(semanticObject, L.ATTRIBUTE__NAME));
    }
    if (getValueCount(semanticObject, L.ATTRIBUTE__VALUE) === 0) {
      throwDiagnostic(createFeatureValueMissing(semanticObject, L.ATTRIBUTE__VALUE));
    }
    const access = ga.attributeAccess;
    this.feeder.value(
      ids(access.nameDotIDParserRuleCall_0_0, access.nameAssignment_0),
      L.ATTRIBUTE__NAME,
      DOT_ID,
      semanticObject.getName(),
      semanticObject,
    );
    this.feeder.keyword(access.equalsSignKeyword_1, Kw.EQUALS, semanticObject);
    this.feeder.value(
      ids(access.valueDotIDParserRuleCall_2_0, access.valueAssignment_2),
      L.ATTRIBUTE__VALUE,
      DOT_ID,
      semanticObject.getValue(),
      semanticObject,
    );
    this.statementEnd(context, semanticObject);
  }

  /** Constraint: `(sourceNode=Node edgeTargets+=EdgeTarget+ (attributes+=ListAttribute attributes+=ListAttribute*)?)`. */
  protected sequence_EdgeStatement(context: DotSerializationContext, semanticObject: EdgeStatement): void {
    checkBounds(semanticObject, context, GraphvizDotConstraints.EdgeStatement!);
    const access = ga.edgeStatementAccess;
    this.feeder.contained(access.sourceNodeNodeParserRuleCall_0_0, Rule.NODE, semanticObject.getSourceNode()!, (node) =>
      this.sequence({ rule: Rule.NODE }, node),
    );
    for (const target of semanticObject.getEdgeTargets()) {
      this.feeder.contained(access.edgeTargetsEdgeTargetParserRuleCall_1_0, Rule.EDGE_TARGET, target, (t) =>
        this.sequence({ rule: Rule.EDGE_TARGET }, t),
      );
    }
    if (semanticObject.getAttributes().size() > 0) {
      this.attributeList(semanticObject, semanticObject.getAttributes(), EDGE_STATEMENT_ATTRIBUTES, () =>
        this.feeder.out.emit_EdgeStatement_CommaKeyword_2_1_1_0_q(semanticObject),
      );
    } else {
      this.feeder.out.emit_EdgeStatement___LeftSquareBracketKeyword_2_0_RightSquareBracketKeyword_2_2__q(
        semanticObject,
      );
    }
    this.statementEnd(context, semanticObject);
  }

  /**
   * Constraint: `(operator=EdgeOperator (targetSubgraph=Subgraph | targetnode=Node))`. With the counts in bounds,
   * the backtracking still fails when neither or both targets are set (the alternative takes exactly one).
   */
  protected sequence_EdgeTarget(context: DotSerializationContext, semanticObject: EdgeTarget): void {
    const constraint = GraphvizDotConstraints.EdgeTarget!;
    checkBounds(semanticObject, context, constraint);
    const subgraph = semanticObject.getTargetSubgraph();
    const node = semanticObject.getTargetnode();
    if ((subgraph === null) === (node === null)) {
      throwBacktrackingFailed(semanticObject, context, constraint, EDGE_TARGET_CONSTRAINT);
    }
    const access = ga.edgeTargetAccess;
    this.feeder.enumLiteral(
      ids(access.operatorEdgeOperatorEnumRuleCall_0_0, access.operatorAssignment_0),
      L.EDGE_TARGET__OPERATOR,
      semanticObject.getOperator().getLiteral(),
      semanticObject,
    );
    if (subgraph !== null) {
      this.feeder.contained(access.targetSubgraphSubgraphParserRuleCall_1_0_0, Rule.SUBGRAPH, subgraph, (s) =>
        this.sequence({ rule: Rule.SUBGRAPH }, s),
      );
    } else {
      this.feeder.contained(access.targetnodeNodeParserRuleCall_1_1_0, Rule.NODE, node!, (n) =>
        this.sequence({ rule: Rule.NODE }, n),
      );
    }
  }

  /** Constraint: `(strict?='strict'? type=GraphType name=DotID? statements+=Statement*)`. */
  protected sequence_Graph(context: DotSerializationContext, semanticObject: Graph): void {
    checkBounds(semanticObject, context, GraphvizDotConstraints.Graph!);
    const access = ga.graphAccess;
    if (semanticObject.isStrict()) {
      this.feeder.assignedKeyword(
        { keyword: access.strictStrictKeyword_0_0, assignment: access.strictAssignment_0 },
        L.GRAPH__STRICT,
        Kw.STRICT,
        semanticObject,
      );
    }
    this.feeder.enumLiteral(
      ids(access.typeGraphTypeEnumRuleCall_1_0, access.typeAssignment_1),
      L.GRAPH__TYPE,
      semanticObject.getType().getLiteral(),
      semanticObject,
    );
    if (semanticObject.getName() !== null) {
      this.feeder.value(
        ids(access.nameDotIDParserRuleCall_2_0, access.nameAssignment_2),
        L.GRAPH__NAME,
        DOT_ID,
        semanticObject.getName(),
        semanticObject,
      );
    }
    this.block(semanticObject, semanticObject.getStatements(), access.leftCurlyBracketKeyword_3);
    this.feeder.keyword(access.rightCurlyBracketKeyword_5, Kw.RIGHT_CURLY, semanticObject);
  }

  /** Constraint: `graphs+=Graph+`. */
  protected sequence_GraphvizModel(context: DotSerializationContext, semanticObject: GraphvizModel): void {
    checkBounds(semanticObject, context, GraphvizDotConstraints.GraphvizModel!);
    for (const graph of semanticObject.getGraphs()) {
      this.feeder.contained(ga.graphvizModelAccess.graphsGraphParserRuleCall_0, Rule.GRAPH, graph, (g) =>
        this.sequence({ rule: Rule.GRAPH }, g),
      );
    }
  }

  /** Constraint: `(name=DotID value=DotID?)`. */
  protected sequence_ListAttribute(context: DotSerializationContext, semanticObject: Attribute): void {
    checkBounds(semanticObject, context, GraphvizDotConstraints.ListAttribute!);
    const access = ga.listAttributeAccess;
    this.feeder.value(
      ids(access.nameDotIDParserRuleCall_0_0, access.nameAssignment_0),
      L.ATTRIBUTE__NAME,
      DOT_ID,
      semanticObject.getName(),
      semanticObject,
    );
    if (semanticObject.getValue() !== null) {
      this.feeder.keyword(access.equalsSignKeyword_1_0, Kw.EQUALS, semanticObject);
      this.feeder.value(
        ids(access.valueDotIDParserRuleCall_1_1_0, access.valueAssignment_1_1),
        L.ATTRIBUTE__VALUE,
        DOT_ID,
        semanticObject.getValue(),
        semanticObject,
      );
    }
  }

  /** Constraint: `(node=Node (attributes+=ListAttribute attributes+=ListAttribute*)?)`. */
  protected sequence_NodeStatement(context: DotSerializationContext, semanticObject: NodeStatement): void {
    checkBounds(semanticObject, context, GraphvizDotConstraints.NodeStatement!);
    const access = ga.nodeStatementAccess;
    this.feeder.contained(access.nodeNodeParserRuleCall_0_0, Rule.NODE, semanticObject.getNode()!, (node) =>
      this.sequence({ rule: Rule.NODE }, node),
    );
    if (semanticObject.getAttributes().size() > 0) {
      this.attributeList(semanticObject, semanticObject.getAttributes(), NODE_STATEMENT_ATTRIBUTES, () =>
        this.feeder.out.emit_NodeStatement_CommaKeyword_1_1_1_0_q(semanticObject),
      );
    } else {
      this.feeder.out.emit_NodeStatement___LeftSquareBracketKeyword_1_0_RightSquareBracketKeyword_1_2__q(
        semanticObject,
      );
    }
    this.statementEnd(context, semanticObject);
  }

  /** Constraint: `(name=DotID port=Port?)`. */
  protected sequence_Node(context: DotSerializationContext, semanticObject: Node): void {
    checkBounds(semanticObject, context, GraphvizDotConstraints.Node!);
    const access = ga.nodeAccess;
    this.feeder.value(
      ids(access.nameDotIDParserRuleCall_0_0, access.nameAssignment_0),
      L.NODE__NAME,
      DOT_ID,
      semanticObject.getName(),
      semanticObject,
    );
    const port = semanticObject.getPort();
    if (port !== null) {
      this.feeder.keyword(access.colonKeyword_1_0, Kw.COLON, semanticObject);
      this.feeder.contained(access.portPortParserRuleCall_1_1_0, Rule.PORT, port, (p) =>
        this.sequence({ rule: Rule.PORT }, p),
      );
    }
  }

  /** Constraint: `(name=DotID compass_pt=ID?)`. */
  protected sequence_Port(context: DotSerializationContext, semanticObject: Port): void {
    checkBounds(semanticObject, context, GraphvizDotConstraints.Port!);
    const access = ga.portAccess;
    this.feeder.value(
      ids(access.nameDotIDParserRuleCall_0_0, access.nameAssignment_0),
      L.PORT__NAME,
      DOT_ID,
      semanticObject.getName(),
      semanticObject,
    );
    if (semanticObject.getCompass_pt() !== null) {
      this.feeder.keyword(access.colonKeyword_1_0, Kw.COLON, semanticObject);
      this.feeder.value(
        ids(access.compass_ptIDTerminalRuleCall_1_1_0, access.compass_ptAssignment_1_1),
        L.PORT__COMPASS_PT,
        ID,
        semanticObject.getCompass_pt(),
        semanticObject,
      );
    }
  }

  /**
   * Constraint: `(name=ID? statements+=Statement*)`. The `subgraph` keyword is ambiguous when no name follows; the
   * override writes it there, and the grammar requires it before a name.
   */
  protected sequence_Subgraph(context: DotSerializationContext, semanticObject: Subgraph): void {
    checkBounds(semanticObject, context, GraphvizDotConstraints.Subgraph!);
    const access = ga.subgraphAccess;
    if (semanticObject.getName() !== null) {
      this.feeder.keyword(access.subgraphKeyword_1_0, Kw.SUBGRAPH, semanticObject);
      this.feeder.value(
        ids(access.nameIDTerminalRuleCall_1_1_0, access.nameAssignment_1_1),
        L.SUBGRAPH__NAME,
        ID,
        semanticObject.getName(),
        semanticObject,
      );
    } else {
      this.feeder.out.emit_Subgraph_SubgraphKeyword_1_0_q(semanticObject);
    }
    this.block(semanticObject, semanticObject.getStatements(), access.leftCurlyBracketKeyword_2);
    this.feeder.keyword(access.rightCurlyBracketKeyword_4, Kw.RIGHT_CURLY, semanticObject);
    this.statementEnd(context, semanticObject);
  }

  /** `'{' (statements+=Statement)*` of `Graph` and `Subgraph`; the closing `'}'` is the caller's. */
  private block(owner: Graph | Subgraph, statements: Iterable<DotEObject>, leftCurlyBracket: string): void {
    this.feeder.keyword(leftCurlyBracket, Kw.LEFT_CURLY, owner);
    const ruleCall =
      owner.eClass() === L.GRAPH
        ? ga.graphAccess.statementsStatementParserRuleCall_4_0
        : ga.subgraphAccess.statementsStatementParserRuleCall_3_0;
    for (const statement of statements) {
      this.feeder.contained(ruleCall, Rule.STATEMENT, statement, (s) => this.sequence({ rule: Rule.STATEMENT }, s));
    }
  }

  /** `'[' attributes (','? attributes)* ']'` of a node or edge statement with attributes. */
  private attributeList(
    owner: DotEObject,
    attributes: Iterable<Attribute>,
    access: AttributeListIds,
    comma: () => void,
  ): void {
    this.feeder.keyword(access.leftSquareBracket, Kw.LEFT_SQUARE, owner);
    this.listAttributes(attributes, access, comma);
    this.feeder.keyword(access.rightSquareBracket, Kw.RIGHT_SQUARE, owner);
  }

  /**
   * The list attributes: the first through the rule call `first`, each further one after the ambiguous `','` (which
   * `comma` writes) through the rule call `next`.
   */
  private listAttributes(attributes: Iterable<Attribute>, access: AttributeListIds, comma: () => void): void {
    let first = true;
    for (const attribute of attributes) {
      if (!first) comma();
      this.feeder.contained(first ? access.first : access.next, Rule.LIST_ATTRIBUTE, attribute, (a) =>
        this.sequence({ rule: Rule.LIST_ATTRIBUTE }, a),
      );
      first = false;
    }
  }

  /** The end of a statement: the ambiguous `';'?` of the `Statement` rule, which the override writes. */
  private statementEnd(context: DotSerializationContext, semanticObject: DotEObject): void {
    if (context.rule === Rule.STATEMENT) this.feeder.out.emit_Statement_SemicolonKeyword_1_q(semanticObject);
  }
}
