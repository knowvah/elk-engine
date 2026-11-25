// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import type { IValueConverterService } from '../../../../xtext/conversion/IValueConverterService.js';
import { nodeModelLineSource } from '../../../../xtext/parser/LineSource.js';
import type { Token } from '../../../../xtext/parser/Token.js';
import type { Attribute } from '../dot/Attribute.js';
import type { AttributeStatement } from '../dot/AttributeStatement.js';
import { AttributeType } from '../dot/AttributeType.js';
import { DotFactory } from '../dot/DotFactory.js';
import { EdgeOperator } from '../dot/EdgeOperator.js';
import type { EdgeStatement } from '../dot/EdgeStatement.js';
import type { EdgeTarget } from '../dot/EdgeTarget.js';
import type { Graph } from '../dot/Graph.js';
import { GraphType } from '../dot/GraphType.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import type { Node } from '../dot/Node.js';
import type { NodeStatement } from '../dot/NodeStatement.js';
import type { Port } from '../dot/Port.js';
import type { Statement } from '../dot/Statement.js';
import type { Subgraph } from '../dot/Subgraph.js';
import { convertAndSet } from './GraphvizDotAssignment.js';
import { tokenizeWithDiagnostics } from './GraphvizDotLexer.js';
import {
  DOT_ID_START,
  EDGE_OPERATOR,
  FOLLOW_1,
  FOLLOW_10,
  FOLLOW_11,
  FOLLOW_12,
  FOLLOW_13,
  FOLLOW_14,
  FOLLOW_15,
  FOLLOW_16,
  FOLLOW_17,
  FOLLOW_18,
  FOLLOW_19,
  FOLLOW_2,
  FOLLOW_20,
  FOLLOW_21,
  FOLLOW_3,
  FOLLOW_4,
  FOLLOW_5,
  FOLLOW_6,
  FOLLOW_7,
  FOLLOW_8,
  FOLLOW_9,
  GRAPH_START,
  STATEMENT_DFA,
  STATEMENT_START,
  StatementAlt,
  type StatementAltNumber,
} from './GraphvizDotParserTables.js';
import { type DotParseDiagnostic, GraphvizDotRecognizer } from './GraphvizDotRecognizer.js';
import { Tok } from './GraphvizDotTokenType.js';

export type { DotParseDiagnostic } from './GraphvizDotRecognizer.js';

/** The result of a parse: the root (`null` without contents) and the diagnostics in node order. */
export interface DotParseResult {
  readonly root: GraphvizModel | null;
  readonly diagnostics: readonly DotParseDiagnostic[];
}

/** The rule names the generated parser passes to the value converters. */
const DOT_ID_RULE = 'org.eclipse.elk.alg.graphviz.dot.GraphvizDot.DotID';
const ID_RULE = 'org.eclipse.elk.alg.graphviz.dot.GraphvizDot.ID';

const factory = (): DotFactory => DotFactory.eINSTANCE;

/**
 * Hand-written recursive-descent parser for `GraphvizDot.xtext` (D4), one method per grammar rule with the decisions,
 * follow sets and error recovery of the generated `InternalGraphvizDotParser`: every rule catches a recognition
 * failure, recovers and returns what it built, so partial models survive syntax errors as in Xtext. Objects are
 * created where the generated code calls `createModelElement` and filled as `DefaultEcoreElementFactory` does: a
 * `null` rule result is not assigned, a `DotID` value goes through the value converters.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/GraphvizDot.xtext
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/parser/antlr/internal/InternalGraphvizDotParser.java
 */
export class GraphvizDotParser {
  readonly #r: GraphvizDotRecognizer;
  readonly #services: IValueConverterService;

  constructor(recognizer: GraphvizDotRecognizer, services: IValueConverterService) {
    this.#r = recognizer;
    this.#services = services;
  }

  /** `entryRuleGraphvizModel`: the model, then the end of input. */
  entryRuleGraphvizModel(): GraphvizModel | null {
    let current: GraphvizModel | null = null;
    try {
      current = this.#r.call(FOLLOW_1, () => this.ruleGraphvizModel());
      this.#r.match(Tok.EOF, FOLLOW_2);
    } catch (e) {
      this.#r.recoverRule(e);
    }
    return current;
  }

  /** `GraphvizModel: (graphs+=Graph)*;` created with its first graph. */
  ruleGraphvizModel(): GraphvizModel | null {
    let current: GraphvizModel | null = null;
    try {
      while (GRAPH_START.has(this.#r.LA(1))) {
        const graph = this.#r.call(FOLLOW_3, () => this.ruleGraph());
        current ??= factory().createGraphvizModel();
        add(current.getGraphs(), graph);
      }
    } catch (e) {
      this.#r.recoverRule(e);
    }
    return current;
  }

  /** `Graph: (strict?="strict")? type=GraphType (name=DotID)? "{" (statements+=Statement)* "}";` */
  ruleGraph(): Graph | null {
    const r = this.#r;
    let current: Graph | null = null;
    try {
      if (r.LA(1) === Tok.STRICT) {
        r.newLeafNode(r.match(Tok.STRICT, FOLLOW_4));
        current ??= factory().createGraph();
        current.setStrict(true);
      }
      const type = r.call(FOLLOW_5, () => this.ruleGraphType());
      const graph = (current ??= factory().createGraph());
      if (type !== null) graph.setType(type);
      if (DOT_ID_START.has(r.LA(1))) {
        this.#setDotId(
          r.call(FOLLOW_6, () => this.ruleDotID()),
          (v) => graph.setName(v),
        );
      }
      r.newLeafNode(r.match(Tok.LBRACE, FOLLOW_7));
      this.#statements(graph.getStatements());
      r.newLeafNode(r.match(Tok.RBRACE, FOLLOW_2));
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /** `(statements+=Statement)*` of `Graph` and `Subgraph`. */
  #statements(statements: EList<Statement>): void {
    while (STATEMENT_START.has(this.#r.LA(1))) {
      add(
        statements,
        this.#r.call(FOLLOW_7, () => this.ruleStatement()),
      );
    }
  }

  /** `Statement: (NodeStatement | EdgeStatement | AttributeStatement | Attribute | Subgraph) ";"?;` */
  ruleStatement(): Statement | null {
    const r = this.#r;
    let current: Statement | null = null;
    try {
      const alt = this.#predictStatement();
      current = r.call(FOLLOW_8, () => this.#statementAlternative(alt));
      if (r.LA(1) === Tok.SEMICOLON) r.newLeafNode(r.match(Tok.SEMICOLON, FOLLOW_2));
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /** `dfa5.predict(input)`: walks the decoded DFA over the lookahead without consuming. */
  #predictStatement(): StatementAltNumber {
    let state = 0;
    for (let k = 1; ; k++) {
      const target = STATEMENT_DFA[state]?.get(this.#r.LA(k));
      if (target === undefined) throw this.#r.noViableAlt(k);
      if ('alt' in target) return target.alt;
      state = target.state;
    }
  }

  #statementAlternative(alt: StatementAltNumber): Statement | null {
    switch (alt) {
      case StatementAlt.NODE_STATEMENT:
        return this.ruleNodeStatement();
      case StatementAlt.EDGE_STATEMENT:
        return this.ruleEdgeStatement();
      case StatementAlt.ATTRIBUTE_STATEMENT:
        return this.ruleAttributeStatement();
      case StatementAlt.ATTRIBUTE:
        return this.ruleAttribute();
      case StatementAlt.SUBGRAPH:
        return this.ruleSubgraph();
    }
  }

  /** `Attribute: name=DotID "=" value=DotID;` */
  ruleAttribute(): Attribute | null {
    const r = this.#r;
    let current: Attribute | null = null;
    try {
      const name = r.call(FOLLOW_9, () => this.ruleDotID());
      const attribute = (current ??= factory().createAttribute());
      this.#setDotId(name, (v) => attribute.setName(v));
      r.newLeafNode(r.match(Tok.EQUALS, FOLLOW_10));
      this.#setDotId(
        r.call(FOLLOW_2, () => this.ruleDotID()),
        (v) => attribute.setValue(v),
      );
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /** `NodeStatement: node=Node ("[" (attributes+=ListAttribute (","? attributes+=ListAttribute)*)? "]")?;` */
  ruleNodeStatement(): NodeStatement | null {
    const r = this.#r;
    let current: NodeStatement | null = null;
    try {
      const node = r.call(FOLLOW_11, () => this.ruleNode());
      current ??= factory().createNodeStatement();
      if (node !== null) current.setNode(node);
      if (r.LA(1) === Tok.LBRACKET) {
        r.newLeafNode(r.match(Tok.LBRACKET, FOLLOW_12));
        this.#listAttributes(current.getAttributes());
      }
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /**
   * `(attributes+=ListAttribute (","? attributes+=ListAttribute)*)? "]"`, after the `"["`; the three statements share
   * this group with the same follow sets.
   */
  #listAttributes(attributes: EList<Attribute>): void {
    const r = this.#r;
    if (DOT_ID_START.has(r.LA(1))) {
      add(
        attributes,
        r.call(FOLLOW_13, () => this.ruleListAttribute()),
      );
      while (DOT_ID_START.has(r.LA(1)) || r.LA(1) === Tok.COMMA) {
        if (r.LA(1) === Tok.COMMA) r.newLeafNode(r.match(Tok.COMMA, FOLLOW_10));
        add(
          attributes,
          r.call(FOLLOW_13, () => this.ruleListAttribute()),
        );
      }
    }
    r.newLeafNode(r.match(Tok.RBRACKET, FOLLOW_2));
  }

  /** `Node: name=DotID (":" port=Port)?;` */
  ruleNode(): Node | null {
    const r = this.#r;
    let current: Node | null = null;
    try {
      const name = r.call(FOLLOW_14, () => this.ruleDotID());
      const node = (current ??= factory().createNode());
      this.#setDotId(name, (v) => node.setName(v));
      if (r.LA(1) === Tok.COLON) {
        r.newLeafNode(r.match(Tok.COLON, FOLLOW_10));
        const port = r.call(FOLLOW_2, () => this.rulePort());
        if (port !== null) node.setPort(port);
      }
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /** `EdgeStatement: sourceNode=Node (edgeTargets+=EdgeTarget)+ ("[" (attributes+=ListAttribute ...)? "]")?;` */
  ruleEdgeStatement(): EdgeStatement | null {
    const r = this.#r;
    let current: EdgeStatement | null = null;
    try {
      const source = r.call(FOLLOW_15, () => this.ruleNode());
      current ??= factory().createEdgeStatement();
      if (source !== null) current.setSourceNode(source);
      this.#edgeTargets(current.getEdgeTargets());
      if (r.LA(1) === Tok.LBRACKET) {
        r.newLeafNode(r.match(Tok.LBRACKET, FOLLOW_12));
        this.#listAttributes(current.getAttributes());
      }
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /** `(edgeTargets+=EdgeTarget)+`: loop12, an `EarlyExitException` without any target. */
  #edgeTargets(targets: EList<EdgeTarget>): void {
    for (let count = 0; ; count++) {
      if (!EDGE_OPERATOR.has(this.#r.LA(1))) {
        if (count >= 1) return;
        throw this.#r.earlyExit();
      }
      add(
        targets,
        this.#r.call(FOLLOW_16, () => this.ruleEdgeTarget()),
      );
    }
  }

  /** `EdgeTarget: operator=EdgeOperator (targetSubgraph=Subgraph | targetnode=Node);` */
  ruleEdgeTarget(): EdgeTarget | null {
    const r = this.#r;
    let current: EdgeTarget | null = null;
    try {
      const operator = r.call(FOLLOW_17, () => this.ruleEdgeOperator());
      const target = (current ??= factory().createEdgeTarget());
      if (operator !== null) target.setOperator(operator);
      const la = r.LA(1);
      if (la === Tok.LBRACE || la === Tok.SUBGRAPH) {
        const subgraph = r.call(FOLLOW_2, () => this.ruleSubgraph());
        if (subgraph !== null) target.setTargetSubgraph(subgraph);
      } else if (DOT_ID_START.has(la)) {
        const node = r.call(FOLLOW_2, () => this.ruleNode());
        if (node !== null) target.setTargetnode(node);
      } else {
        throw r.noViableAlt();
      }
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /** `AttributeStatement: type=AttributeType "[" (attributes+=ListAttribute ...)? "]";` */
  ruleAttributeStatement(): AttributeStatement | null {
    const r = this.#r;
    let current: AttributeStatement | null = null;
    try {
      const type = r.call(FOLLOW_18, () => this.ruleAttributeType());
      current ??= factory().createAttributeStatement();
      if (type !== null) current.setType(type);
      r.newLeafNode(r.match(Tok.LBRACKET, FOLLOW_12));
      this.#listAttributes(current.getAttributes());
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /** `Subgraph: {Subgraph} ("subgraph" (name=ID)?)? "{" (statements+=Statement)* "}";` */
  ruleSubgraph(): Subgraph | null {
    const r = this.#r;
    // the action `{Subgraph}` creates the object before anything is matched
    const current: Subgraph = factory().createSubgraph();
    try {
      if (r.LA(1) === Tok.SUBGRAPH) {
        r.newLeafNode(r.match(Tok.SUBGRAPH, FOLLOW_19));
        if (r.LA(1) === Tok.ID) {
          const name = r.match(Tok.ID, FOLLOW_6);
          r.newLeafNode(name);
          this.#setId(name, (v) => current.setName(v));
        }
      }
      r.newLeafNode(r.match(Tok.LBRACE, FOLLOW_7));
      this.#statements(current.getStatements());
      r.newLeafNode(r.match(Tok.RBRACE, FOLLOW_2));
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /** `ListAttribute returns Attribute: name=DotID ("=" value=DotID)?;` */
  ruleListAttribute(): Attribute | null {
    const r = this.#r;
    let current: Attribute | null = null;
    try {
      const name = r.call(FOLLOW_20, () => this.ruleDotID());
      const attribute = (current ??= factory().createAttribute());
      this.#setDotId(name, (v) => attribute.setName(v));
      if (r.LA(1) === Tok.EQUALS) {
        r.newLeafNode(r.match(Tok.EQUALS, FOLLOW_10));
        this.#setDotId(
          r.call(FOLLOW_2, () => this.ruleDotID()),
          (v) => attribute.setValue(v),
        );
      }
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /** `Port: name=DotID (":" compass_pt=ID)?;` */
  rulePort(): Port | null {
    const r = this.#r;
    let current: Port | null = null;
    try {
      const name = r.call(FOLLOW_14, () => this.ruleDotID());
      const port = (current ??= factory().createPort());
      this.#setDotId(name, (v) => port.setName(v));
      if (r.LA(1) === Tok.COLON) {
        r.newLeafNode(r.match(Tok.COLON, FOLLOW_21));
        const compass = r.match(Tok.ID, FOLLOW_2);
        r.newLeafNode(compass);
        this.#setId(compass, (v) => port.setCompass_pt(v));
      }
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /**
   * `DotID: ID | INT | FLOAT | STRING;` a datatype rule: the token it merged (`AntlrDatatypeRuleToken`), or `null`
   * when it matched nothing (its text is then `null`, `DatatypeRuleToken.getText`).
   */
  ruleDotID(): Token | null {
    const r = this.#r;
    let current: Token | null = null;
    try {
      const type = r.LA(1);
      if (!DOT_ID_START.has(type)) throw r.noViableAlt();
      current = r.match(type, FOLLOW_2);
      r.newLeafNode(current);
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /** `enum EdgeOperator: directed="->" | undirected="--";` */
  ruleEdgeOperator(): EdgeOperator | null {
    return this.#enumRule(EDGE_OPERATOR, (literal) => EdgeOperator.get(literal));
  }

  /** `enum GraphType: graph | digraph;` */
  ruleGraphType(): GraphType | null {
    return this.#enumRule(new Set([Tok.GRAPH, Tok.DIGRAPH]), (literal) => GraphType.get(literal));
  }

  /** `enum AttributeType: graph | node | edge;` */
  ruleAttributeType(): AttributeType | null {
    return this.#enumRule(new Set([Tok.GRAPH, Tok.NODE, Tok.EDGE]), (literal) => AttributeType.get(literal));
  }

  /** An enum rule: one keyword per literal, or a `NoViableAltException`; the literal's instance, or `null`. */
  #enumRule<E>(keywords: ReadonlySet<string>, literal: (keyword: string) => E | null): E | null {
    const r = this.#r;
    let current: E | null = null;
    try {
      const type = r.LA(1);
      if (!keywords.has(type)) throw r.noViableAlt();
      const keyword = r.match(type, FOLLOW_2);
      current = literal(type.slice(1, -1));
      r.newLeafNode(keyword);
    } catch (e) {
      r.recoverRule(e);
    }
    return current;
  }

  /** `set(current, feature, lv_x, "...DotID")`: the datatype token's text (or `null`) through the converters. */
  #setDotId(token: Token | null, apply: (value: string | null) => void): void {
    convertAndSet(this.#services, this.#r, { token, rule: DOT_ID_RULE }, apply);
  }

  /** `setWithLastConsumed(current, feature, token, "...ID")`: skipped for a missing (`null`) token. */
  #setId(token: Token | null, apply: (value: string | null) => void): void {
    if (token !== null) convertAndSet(this.#services, this.#r, { token, rule: ID_RULE }, apply);
  }
}

/** `DefaultEcoreElementFactory.add` of a contained object: a `null` rule result is not added. */
function add<E>(list: EList<E>, value: E | null): void {
  if (value !== null) list.add(value);
}

/**
 * Parses DOT text as an `XtextResource` loads it: the model as far as the parser built it (`null` without any
 * graph) and the syntax and value-conversion diagnostics in node order (D4). Never throws on bad input.
 *
 * @param text the DOT source
 * @param services the value converters of the language (`createValueConverterService`)
 * @returns the parse result
 */
export function parse(text: string, services: IValueConverterService): DotParseResult {
  const { tokens } = tokenizeWithDiagnostics(text);
  const recognizer = new GraphvizDotRecognizer(tokens, nodeModelLineSource(text), text.length);
  const root = new GraphvizDotParser(recognizer, services).entryRuleGraphvizModel();
  recognizer.finish();
  return { root, diagnostics: recognizer.diagnostics };
}
