// SPDX-License-Identifier: EPL-2.0

/**
 * Identity of the grammar elements of `GraphvizDot.xtext` that the sequencers emit tokens for and the formatter
 * names: ids are opaque strings (the `FormattingToken.grammarElement` / `.assignment` of the writer and the
 * `regionFor.keywordElement(...)` argument of the formatter are the same constants). The object mirrors the nested
 * `*Elements` classes of the generated grammar access; each id is `<rule>.<accessor>`, the accessor with the name
 * Xtend sees (`getSubgraphKeyword_1_0` is `subgraphKeyword_1_0`). Only keywords, assignments and rule calls are
 * listed (the tokens of the writer); groups, alternatives, actions and the enum literal declarations are not
 * tokens, and `DotID` has no element the writer names.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/services/GraphvizDotGrammarAccess.java
 */
export const GraphvizDotGrammarAccess = {
  graphvizModelAccess: {
    graphsAssignment: 'GraphvizModel.graphsAssignment',
    graphsGraphParserRuleCall_0: 'GraphvizModel.graphsGraphParserRuleCall_0',
  },
  graphAccess: {
    strictAssignment_0: 'Graph.strictAssignment_0',
    strictStrictKeyword_0_0: 'Graph.strictStrictKeyword_0_0',
    typeAssignment_1: 'Graph.typeAssignment_1',
    typeGraphTypeEnumRuleCall_1_0: 'Graph.typeGraphTypeEnumRuleCall_1_0',
    nameAssignment_2: 'Graph.nameAssignment_2',
    nameDotIDParserRuleCall_2_0: 'Graph.nameDotIDParserRuleCall_2_0',
    leftCurlyBracketKeyword_3: 'Graph.leftCurlyBracketKeyword_3',
    statementsAssignment_4: 'Graph.statementsAssignment_4',
    statementsStatementParserRuleCall_4_0: 'Graph.statementsStatementParserRuleCall_4_0',
    rightCurlyBracketKeyword_5: 'Graph.rightCurlyBracketKeyword_5',
  },
  statementAccess: {
    semicolonKeyword_1: 'Statement.semicolonKeyword_1',
  },
  attributeAccess: {
    nameAssignment_0: 'Attribute.nameAssignment_0',
    nameDotIDParserRuleCall_0_0: 'Attribute.nameDotIDParserRuleCall_0_0',
    equalsSignKeyword_1: 'Attribute.equalsSignKeyword_1',
    valueAssignment_2: 'Attribute.valueAssignment_2',
    valueDotIDParserRuleCall_2_0: 'Attribute.valueDotIDParserRuleCall_2_0',
  },
  nodeStatementAccess: {
    nodeAssignment_0: 'NodeStatement.nodeAssignment_0',
    nodeNodeParserRuleCall_0_0: 'NodeStatement.nodeNodeParserRuleCall_0_0',
    leftSquareBracketKeyword_1_0: 'NodeStatement.leftSquareBracketKeyword_1_0',
    attributesAssignment_1_1_0: 'NodeStatement.attributesAssignment_1_1_0',
    attributesListAttributeParserRuleCall_1_1_0_0: 'NodeStatement.attributesListAttributeParserRuleCall_1_1_0_0',
    commaKeyword_1_1_1_0: 'NodeStatement.commaKeyword_1_1_1_0',
    attributesAssignment_1_1_1_1: 'NodeStatement.attributesAssignment_1_1_1_1',
    attributesListAttributeParserRuleCall_1_1_1_1_0: 'NodeStatement.attributesListAttributeParserRuleCall_1_1_1_1_0',
    rightSquareBracketKeyword_1_2: 'NodeStatement.rightSquareBracketKeyword_1_2',
  },
  nodeAccess: {
    nameAssignment_0: 'Node.nameAssignment_0',
    nameDotIDParserRuleCall_0_0: 'Node.nameDotIDParserRuleCall_0_0',
    colonKeyword_1_0: 'Node.colonKeyword_1_0',
    portAssignment_1_1: 'Node.portAssignment_1_1',
    portPortParserRuleCall_1_1_0: 'Node.portPortParserRuleCall_1_1_0',
  },
  edgeStatementAccess: {
    sourceNodeAssignment_0: 'EdgeStatement.sourceNodeAssignment_0',
    sourceNodeNodeParserRuleCall_0_0: 'EdgeStatement.sourceNodeNodeParserRuleCall_0_0',
    edgeTargetsAssignment_1: 'EdgeStatement.edgeTargetsAssignment_1',
    edgeTargetsEdgeTargetParserRuleCall_1_0: 'EdgeStatement.edgeTargetsEdgeTargetParserRuleCall_1_0',
    leftSquareBracketKeyword_2_0: 'EdgeStatement.leftSquareBracketKeyword_2_0',
    attributesAssignment_2_1_0: 'EdgeStatement.attributesAssignment_2_1_0',
    attributesListAttributeParserRuleCall_2_1_0_0: 'EdgeStatement.attributesListAttributeParserRuleCall_2_1_0_0',
    commaKeyword_2_1_1_0: 'EdgeStatement.commaKeyword_2_1_1_0',
    attributesAssignment_2_1_1_1: 'EdgeStatement.attributesAssignment_2_1_1_1',
    attributesListAttributeParserRuleCall_2_1_1_1_0: 'EdgeStatement.attributesListAttributeParserRuleCall_2_1_1_1_0',
    rightSquareBracketKeyword_2_2: 'EdgeStatement.rightSquareBracketKeyword_2_2',
  },
  edgeTargetAccess: {
    operatorAssignment_0: 'EdgeTarget.operatorAssignment_0',
    operatorEdgeOperatorEnumRuleCall_0_0: 'EdgeTarget.operatorEdgeOperatorEnumRuleCall_0_0',
    targetSubgraphAssignment_1_0: 'EdgeTarget.targetSubgraphAssignment_1_0',
    targetSubgraphSubgraphParserRuleCall_1_0_0: 'EdgeTarget.targetSubgraphSubgraphParserRuleCall_1_0_0',
    targetnodeAssignment_1_1: 'EdgeTarget.targetnodeAssignment_1_1',
    targetnodeNodeParserRuleCall_1_1_0: 'EdgeTarget.targetnodeNodeParserRuleCall_1_1_0',
  },
  attributeStatementAccess: {
    typeAssignment_0: 'AttributeStatement.typeAssignment_0',
    typeAttributeTypeEnumRuleCall_0_0: 'AttributeStatement.typeAttributeTypeEnumRuleCall_0_0',
    leftSquareBracketKeyword_1: 'AttributeStatement.leftSquareBracketKeyword_1',
    attributesAssignment_2_0: 'AttributeStatement.attributesAssignment_2_0',
    attributesListAttributeParserRuleCall_2_0_0: 'AttributeStatement.attributesListAttributeParserRuleCall_2_0_0',
    commaKeyword_2_1_0: 'AttributeStatement.commaKeyword_2_1_0',
    attributesAssignment_2_1_1: 'AttributeStatement.attributesAssignment_2_1_1',
    attributesListAttributeParserRuleCall_2_1_1_0: 'AttributeStatement.attributesListAttributeParserRuleCall_2_1_1_0',
    rightSquareBracketKeyword_3: 'AttributeStatement.rightSquareBracketKeyword_3',
  },
  subgraphAccess: {
    subgraphKeyword_1_0: 'Subgraph.subgraphKeyword_1_0',
    nameAssignment_1_1: 'Subgraph.nameAssignment_1_1',
    nameIDTerminalRuleCall_1_1_0: 'Subgraph.nameIDTerminalRuleCall_1_1_0',
    leftCurlyBracketKeyword_2: 'Subgraph.leftCurlyBracketKeyword_2',
    statementsAssignment_3: 'Subgraph.statementsAssignment_3',
    statementsStatementParserRuleCall_3_0: 'Subgraph.statementsStatementParserRuleCall_3_0',
    rightCurlyBracketKeyword_4: 'Subgraph.rightCurlyBracketKeyword_4',
  },
  listAttributeAccess: {
    nameAssignment_0: 'ListAttribute.nameAssignment_0',
    nameDotIDParserRuleCall_0_0: 'ListAttribute.nameDotIDParserRuleCall_0_0',
    equalsSignKeyword_1_0: 'ListAttribute.equalsSignKeyword_1_0',
    valueAssignment_1_1: 'ListAttribute.valueAssignment_1_1',
    valueDotIDParserRuleCall_1_1_0: 'ListAttribute.valueDotIDParserRuleCall_1_1_0',
  },
  portAccess: {
    nameAssignment_0: 'Port.nameAssignment_0',
    nameDotIDParserRuleCall_0_0: 'Port.nameDotIDParserRuleCall_0_0',
    colonKeyword_1_0: 'Port.colonKeyword_1_0',
    compass_ptAssignment_1_1: 'Port.compass_ptAssignment_1_1',
    compass_ptIDTerminalRuleCall_1_1_0: 'Port.compass_ptIDTerminalRuleCall_1_1_0',
  },
} as const;

/**
 * The names of the rules the writer converts values for (the second argument of `IValueConverterService.toString`,
 * `RuleNames.getQualifiedName` of the called rule; the grammar's service registers both forms): the datatype rule
 * `DotID` and the inherited terminal `ID`.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/GraphvizDot.xtext
 */
export const GraphvizDotRuleName = {
  DOT_ID: 'DotID',
  ID: 'ID',
} as const;
