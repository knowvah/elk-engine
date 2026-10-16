// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import type { FormattingToken, SemanticKind } from '../../../../xtext/formatting2/regionaccess/FormattingToken.js';
import { TextRegionAccessBuilder } from '../../../../xtext/formatting2/regionaccess/TextRegionAccessBuilder.js';
import type { StringBasedRegionAccess } from '../../../../xtext/formatting2/regionaccess/internal/StringBasedRegionAccess.js';
import type { ElkNode } from '../../../ElkNode.js';

/** The id of the rule the root object is serialised by (`ISerializationContext.getActionOrRule()` of the root). */
export const ROOT_RULE = 'ElkNode';

/** The punctuation of `ElkGraphJson.xtext`, by the text a keyword token carries. */
export const Kw = {
  LEFT_CURLY: '{',
  RIGHT_CURLY: '}',
  LEFT_SQUARE: '[',
  RIGHT_SQUARE: ']',
  COLON: ':',
  COMMA: ',',
} as const;

/**
 * The spellings the generated syntactic sequencer picks for the key rules (`getKeyChildrenToken` and its
 * siblings return the double-quoted alternative when no node model offers the original text), and for the
 * `JsonMember` rule it writes when a mandatory element has nothing else to say (`getJsonMemberToken`).
 *
 * @see org.eclipse.elk.graph.json.text/src-gen/org/eclipse/elk/graph/json/text/serializer/AbstractElkGraphJsonSyntacticSequencer.java:126-250
 */
export const KeyToken = {
  CHILDREN: '"children"',
  PORTS: '"ports"',
  LABELS: '"labels"',
  EDGES: '"edges"',
  LAYOUT_OPTIONS: '"layoutOptions"',
  ID: '"id"',
  X: '"x"',
  Y: '"y"',
  WIDTH: '"width"',
  HEIGHT: '"height"',
  SOURCES: '"sources"',
  TARGETS: '"targets"',
  TEXT: '"text"',
  JSON_MEMBER: '"" :',
} as const;

/** What the semantic sequencer produced: the region access the formatter works on and its tokens in order. */
export interface SequenceStream {
  readonly regionAccess: StringBasedRegionAccess;
  readonly tokens: readonly FormattingToken[];
}

/**
 * The syntactic sequencer of the ELK graph JSON language: it receives the assigned values from the semantic
 * sequencer, adds the tokens the grammar puts between them, and hands every token to the
 * {@link TextRegionAccessBuilder} (Xtext's `HiddenTokenSequencer` + `TextRegionAccessBuildingSequencer` stage). The
 * Xtend class `ElkGraphJsonSyntacticSequencer` is empty; everything it does comes from the generated base class:
 * the key spellings in {@link KeyToken}, and twenty-five `emit_*` hooks for ambiguous optional commas and for repeated
 * empty containers, every one of which only calls `acceptNodes(transition, nodes)`. The writer's input has no node
 * model (D3), so `nodes` is always empty and every hook writes nothing: they are not ported, and the optional
 * `','?` before a closing bracket is never written.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/serializer/ElkGraphJsonSyntacticSequencer.xtend
 * @see org.eclipse.elk.graph.json.text/src-gen/org/eclipse/elk/graph/json/text/serializer/AbstractElkGraphJsonSyntacticSequencer.java
 */
export class ElkGraphJsonSyntacticSequencer {
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

  /** An unassigned call of a datatype rule (a key rule, `JsonMember`): the text the generated sequencer returns. */
  unassignedRuleCall(grammarElement: string, text: string, owner: EObject): void {
    this.token({ kind: 'assignment', grammarElement, assignment: null, text, owner });
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

  finish(): SequenceStream {
    return { regionAccess: this.builder.build(), tokens: this.emitted };
  }

  private token(token: FormattingToken): void {
    this.emitted.push(token);
    this.builder.token(token);
  }
}
