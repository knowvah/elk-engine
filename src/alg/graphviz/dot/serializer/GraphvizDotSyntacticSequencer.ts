// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import type { FormattingToken } from '../../../../xtext/formatting2/regionaccess/FormattingToken.js';
import type { StringBasedRegionAccess } from '../../../../xtext/formatting2/regionaccess/internal/StringBasedRegionAccess.js';
import { TextRegionAccessBuilder } from '../../../../xtext/formatting2/regionaccess/TextRegionAccessBuilder.js';
import type { DotEObject } from '../dot/DotPackage.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import { GraphvizDotGrammarAccess } from '../services/GraphvizDotGrammarAccess.js';

const grammarAccess = GraphvizDotGrammarAccess;

/** The id of the rule the root object is serialized by (`ISerializationContext.getActionOrRule()` of the root). */
export const ROOT_RULE = 'GraphvizModel';

/** The keywords the syntactic sequencer writes, by token text. */
export const Kw = {
  STRICT: 'strict',
  SUBGRAPH: 'subgraph',
  LEFT_CURLY: '{',
  RIGHT_CURLY: '}',
  LEFT_SQUARE: '[',
  RIGHT_SQUARE: ']',
  SEMICOLON: ';',
  EQUALS: '=',
  COMMA: ',',
  COLON: ':',
} as const;

/**
 * The contexts that have a syntactic PDA (`syntacticSequencerPDAs`), for the rules called by an assignment: per
 * rule, the classes it returns. A child entered in any other context has none (`Statement returns Statement`, a
 * bare `Statement`).
 */
const PDA_CONTEXTS: Readonly<Record<string, ReadonlySet<string>>> = {
  Graph: new Set(['Graph']),
  Statement: new Set(['NodeStatement', 'EdgeStatement', 'AttributeStatement', 'Attribute', 'Subgraph']),
  Node: new Set(['Node']),
  EdgeTarget: new Set(['EdgeTarget']),
  Subgraph: new Set(['Subgraph']),
  ListAttribute: new Set(['Attribute']),
  Port: new Set(['Port']),
};

/** The nodes an ambiguity emitter receives (`List<INode>`): always empty, the writer's input has no node model. */
type NodesOfSyntax = readonly never[];
const NO_NODES: NodesOfSyntax = [];

/**
 * The syntactic sequencer of the DOT language: it receives the assigned values from the semantic sequencer, adds
 * the keywords the grammar puts between them, and hands every token to the {@link TextRegionAccessBuilder}
 * (Xtext's `HiddenTokenSequencer` + `TextRegionAccessBuildingSequencer` stage). `GraphvizDotSyntacticSequencer`
 * overrides five ambiguity emitters of its generated parent, each writing its keyword where the generated code
 * would write only what the node model holds; the parent's two other ambiguities (`('[' ']')?` after a node or the
 * last edge target) keep the generated `acceptNodes`, which writes nothing without a node model.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/serializer/GraphvizDotSyntacticSequencer.java
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/serializer/AbstractGraphvizDotSyntacticSequencer.java
 */
export class GraphvizDotSyntacticSequencer {
  private readonly builder: TextRegionAccessBuilder;

  constructor(root: GraphvizModel) {
    this.builder = new TextRegionAccessBuilder(root, ROOT_RULE);
  }

  /**
   * `enterAssignedParserRuleCall`: the child object `child`, called by the rule call `grammarElement` of the rule
   * `rule`. A context without a syntactic PDA throws `IllegalStateException` without a message.
   *
   * @see org.eclipse.xtext/src/org/eclipse/xtext/serializer/sequencer/AbstractSyntacticSequencer.java:346-359
   */
  enterAssignedParserRuleCall(grammarElement: string, rule: string, child: DotEObject): void {
    if (PDA_CONTEXTS[rule]?.has(child.eClass().getName()) !== true) {
      throw new IllegalStateException();
    }
    this.builder.enterObject(grammarElement, child);
  }

  /** `leaveAssignedParserRuleCall`. */
  leaveAssignedParserRuleCall(): void {
    this.builder.leaveObject();
  }

  /** An unassigned keyword the grammar writes between values; `owner` is the object whose rule contains it. */
  acceptUnassignedKeyword(grammarElement: string, token: string, owner: EObject): void {
    this.token({ kind: 'keyword', grammarElement, assignment: null, text: token, owner, feature: null });
  }

  /** An assigned keyword (`strict?='strict'`) of the assignment `assignment` of the feature `feature`. */
  acceptAssignedKeyword(
    grammarElement: string,
    assignment: string,
    feature: string,
    token: string,
    owner: EObject,
  ): void {
    this.token({ kind: 'keyword', grammarElement, assignment, text: token, owner, feature });
  }

  /** The converted value of a rule call (datatype, terminal or enum rule) of the assignment of `feature`. */
  acceptAssigned(grammarElement: string, assignment: string, feature: string, token: string, owner: EObject): void {
    this.token({ kind: 'assignment', grammarElement, assignment, text: token, owner, feature });
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/serializer/GraphvizDotSyntacticSequencer.java:31-36 */
  emit_AttributeStatement_CommaKeyword_2_1_0_q(semanticObject: EObject, _nodes: NodesOfSyntax = NO_NODES): void {
    this.acceptUnassignedKeyword(grammarAccess.attributeStatementAccess.commaKeyword_2_1_0, Kw.COMMA, semanticObject);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/serializer/GraphvizDotSyntacticSequencer.java:38-43 */
  emit_EdgeStatement_CommaKeyword_2_1_1_0_q(semanticObject: EObject, _nodes: NodesOfSyntax = NO_NODES): void {
    this.acceptUnassignedKeyword(grammarAccess.edgeStatementAccess.commaKeyword_2_1_1_0, Kw.COMMA, semanticObject);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/serializer/GraphvizDotSyntacticSequencer.java:45-50 */
  emit_NodeStatement_CommaKeyword_1_1_1_0_q(semanticObject: EObject, _nodes: NodesOfSyntax = NO_NODES): void {
    this.acceptUnassignedKeyword(grammarAccess.nodeStatementAccess.commaKeyword_1_1_1_0, Kw.COMMA, semanticObject);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/serializer/GraphvizDotSyntacticSequencer.java:52-57 */
  emit_Statement_SemicolonKeyword_1_q(semanticObject: EObject, _nodes: NodesOfSyntax = NO_NODES): void {
    this.acceptUnassignedKeyword(grammarAccess.statementAccess.semicolonKeyword_1, Kw.SEMICOLON, semanticObject);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/serializer/GraphvizDotSyntacticSequencer.java:59-64 */
  emit_Subgraph_SubgraphKeyword_1_0_q(semanticObject: EObject, _nodes: NodesOfSyntax = NO_NODES): void {
    this.acceptUnassignedKeyword(grammarAccess.subgraphAccess.subgraphKeyword_1_0, Kw.SUBGRAPH, semanticObject);
  }

  /**
   * Ambiguous syntax `('[' ']')?` after the last edge target: the generated `acceptNodes(transition, nodes)` writes
   * the keywords the node model holds, and there is none, so an edge without attributes has no brackets.
   *
   * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/serializer/AbstractGraphvizDotSyntacticSequencer.java:93-103
   */
  emit_EdgeStatement___LeftSquareBracketKeyword_2_0_RightSquareBracketKeyword_2_2__q(
    _semanticObject: EObject,
    _nodes: NodesOfSyntax = NO_NODES,
  ): void {
    // acceptNodes(transition, []) writes nothing
  }

  /**
   * Ambiguous syntax `('[' ']')?` after the node of a node statement: as the edge statement's, nothing is written.
   *
   * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/serializer/AbstractGraphvizDotSyntacticSequencer.java:116-126
   */
  emit_NodeStatement___LeftSquareBracketKeyword_1_0_RightSquareBracketKeyword_1_2__q(
    _semanticObject: EObject,
    _nodes: NodesOfSyntax = NO_NODES,
  ): void {
    // acceptNodes(transition, []) writes nothing
  }

  /** `TextRegionAccessBuilder.create()`: the region access of the tokens written so far. */
  finish(): StringBasedRegionAccess {
    return this.builder.build();
  }

  private token(token: FormattingToken): void {
    this.builder.token(token);
  }
}
