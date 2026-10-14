// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import { TextRegionAccessBuilder } from '../../../xtext/formatting2/regionaccess/TextRegionAccessBuilder.js';
import type { FormattingToken, SemanticKind } from '../../../xtext/formatting2/regionaccess/FormattingToken.js';
import type { StringBasedRegionAccess } from '../../../xtext/formatting2/regionaccess/internal/StringBasedRegionAccess.js';
import type { ElkNode } from '../../ElkNode.js';

/** The id of the rule the root object is serialised by (`ISerializationContext.getActionOrRule()` of `RootNode`). */
export const ROOT_RULE = 'RootNode';

/** The keywords and punctuation of `ElkGraph.xtext`, by the text a keyword token carries. */
export const Kw = {
  GRAPH: 'graph',
  NODE: 'node',
  LABEL: 'label',
  PORT: 'port',
  EDGE: 'edge',
  SECTION: 'section',
  LAYOUT: 'layout',
  POSITION: 'position',
  SIZE: 'size',
  INCOMING: 'incoming',
  OUTGOING: 'outgoing',
  START: 'start',
  END: 'end',
  BENDS: 'bends',
  NULL: 'null',
  ARROW: '->',
  LEFT_CURLY: '{',
  RIGHT_CURLY: '}',
  LEFT_SQUARE: '[',
  RIGHT_SQUARE: ']',
  COLON: ':',
  COMMA: ',',
  BAR: '|',
} as const;

/** What the semantic sequencer produced: the region access the formatter works on and its tokens in order. */
export interface SequenceStream {
  readonly regionAccess: StringBasedRegionAccess;
  readonly tokens: readonly FormattingToken[];
}

/** The nodes the ambiguous-syntax hook receives; always empty here (see below). */
type NodesOfSyntax = readonly never[];

/**
 * The syntactic sequencer of the ELK graph language: it receives the assigned values from the semantic sequencer,
 * adds the keywords the grammar puts between them, and hands every token to the {@link TextRegionAccessBuilder}
 * (Xtext's `HiddenTokenSequencer` + `TextRegionAccessBuildingSequencer` stage). The Xtend class
 * `ElkGraphSyntacticSequencer` is empty; everything it does comes from the generated base class, whose one
 * ambiguity is {@link emit_ElkEdge___LeftCurlyBracketKeyword_7_0_RightCurlyBracketKeyword_7_4__q}.
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/serializer/ElkGraphSyntacticSequencer.xtend:18-19
 * @see org.eclipse.elk.graph.text/src-gen/org/eclipse/elk/graph/text/serializer/AbstractElkGraphSyntacticSequencer.java
 */
export class ElkGraphSyntacticSequencer {
  private readonly builder: TextRegionAccessBuilder;
  private readonly emitted: FormattingToken[] = [];

  constructor(root: ElkNode) {
    this.builder = new TextRegionAccessBuilder(root, ROOT_RULE);
  }

  /** `enterAssignedParserRuleCall` for the child object `child`, called by the rule call `grammarElement`. */
  enterObject(grammarElement: string, child: EObject): void {
    this.builder.enterObject(grammarElement, child);
  }

  leaveObject(): void {
    this.builder.leaveObject();
  }

  /** A keyword the grammar writes between assigned values; `owner` is the object whose rule contains it. */
  keyword(grammarElement: string, text: string, owner: EObject): void {
    this.token({ kind: 'keyword', grammarElement, assignment: null, text, owner });
  }

  /**
   * A value of `assignment`: `kind` `'assignment'` for the value converter's text (`grammarElement` is the rule
   * call), `'crossref'` for the name of the cross reference target (`grammarElement` is the cross reference).
   */
  assigned(
    kind: Exclude<SemanticKind, 'keyword'>,
    grammarElement: string,
    assignment: string,
    text: string,
    owner: EObject,
  ): void {
    this.token({ kind, grammarElement, assignment, text, owner });
  }

  /**
   * Ambiguous syntax `('{' '}')?` at the end of `ElkEdge` after the last target. The generated code resolves it by
   * `acceptNodes(transition, nodes)`: it writes the keywords the node model holds for the ambiguity. The writer's
   * input has no node model (G2), so `nodes` is empty and nothing is written: an edge with neither layout, nor
   * properties, nor labels has no braces. When something does follow the last target, the braces are not
   * ambiguous (the path through the group is forced) and the semantic sequencer writes them as plain keywords.
   *
   * @see org.eclipse.elk.graph.text/src-gen/org/eclipse/elk/graph/text/serializer/AbstractElkGraphSyntacticSequencer.java:48-72
   */
  emit_ElkEdge___LeftCurlyBracketKeyword_7_0_RightCurlyBracketKeyword_7_4__q(
    _semanticObject: EObject,
    _nodes: NodesOfSyntax,
  ): void {
    // acceptNodes(transition, []) writes nothing
  }

  finish(): SequenceStream {
    return { regionAccess: this.builder.build(), tokens: this.emitted };
  }

  private token(token: FormattingToken): void {
    this.emitted.push(token);
    this.builder.token(token);
  }
}
