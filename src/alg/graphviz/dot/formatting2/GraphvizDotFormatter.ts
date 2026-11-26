// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import { AbstractFormatter2, isFormattedResource } from '../../../../xtext/formatting2/AbstractFormatter2.js';
import type { IFormattableDocument } from '../../../../xtext/formatting2/IFormattableDocument.js';
import type { HiddenRegionFormatterInit } from '../../../../xtext/formatting2/IHiddenRegionFormatter.js';
import type { IHiddenRegion } from '../../../../xtext/formatting2/regionaccess/IHiddenRegion.js';
import type { ISemanticRegion } from '../../../../xtext/formatting2/regionaccess/ISemanticRegion.js';
import type { Attribute } from '../dot/Attribute.js';
import type { AttributeStatement } from '../dot/AttributeStatement.js';
import { DotPackage, isDotEClass, type DotEObject } from '../dot/DotPackage.js';
import type { EdgeStatement } from '../dot/EdgeStatement.js';
import type { EdgeTarget } from '../dot/EdgeTarget.js';
import type { Graph } from '../dot/Graph.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import type { Node } from '../dot/Node.js';
import type { NodeStatement } from '../dot/NodeStatement.js';
import type { Port } from '../dot/Port.js';
import type { Subgraph } from '../dot/Subgraph.js';
import { GraphvizDotGrammarAccess } from '../services/GraphvizDotGrammarAccess.js';

const L = DotPackage.Literals;

/** The `[autowrap]`, `[newLine]`, `[oneSpace]`, `[noSpace]` and `[indent]` lambdas of the Xtend source. */
const autowrap: HiddenRegionFormatterInit = (it) => it.autowrap();
const newLine: HiddenRegionFormatterInit = (it) => it.newLine();
const oneSpace: HiddenRegionFormatterInit = (it) => it.oneSpace();
const noSpace: HiddenRegionFormatterInit = (it) => it.noSpace();
const indent: HiddenRegionFormatterInit = (it) => it.indent();

const SEMICOLON = ';';
const EQUALS = '=';
const LEFT_SQUARE = '[';
const RIGHT_SQUARE = ']';
const COMMA = ',';
const COLON = ':';
const LEFT_CURLY = '{';
const RIGHT_CURLY = '}';

function isDotEObject(obj: unknown): obj is DotEObject {
  return typeof obj === 'object' && obj !== null && 'eClass' in obj && isDotEClass((obj as EObject).eClass());
}

function isEObject(obj: unknown): obj is EObject {
  return typeof obj === 'object' && obj !== null && 'eContents' in obj;
}

/**
 * The formatter of the DOT language. The Xtend `dispatch format(...)` methods are one `format` with the type tests
 * of the generated dispatcher, in its order; each overload keeps its Java name `_format` with the type appended.
 * The extension calls `x.regionFor`, `append`, `prepend`, `surround` and `interior` are the
 * `ITextRegionExtensions` / `IFormattableDocument` calls, in the Xtend order (later formattings of one region are
 * merged by the document, so the order decides conflicts). `x?.format()` formats only a non-null `x`.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/formatting2/GraphvizDotFormatter.xtend
 */
export class GraphvizDotFormatter extends AbstractFormatter2 {
  /** Java `@Inject extension GraphvizDotGrammarAccess` (`subgraphAccess.subgraphKeyword_1_0`). */
  private readonly grammarAccess = GraphvizDotGrammarAccess;

  /**
   * The Xtend dispatch: the most specific `format` overload for the runtime type. `XtextResource` and every other
   * `EObject` go to the base class defaults; `null` and other objects are not formatted.
   *
   * @see org.eclipse.elk.alg.graphviz.dot/xtend-gen/org/eclipse/elk/alg/graphviz/dot/formatting2/GraphvizDotFormatter.java
   */
  format(obj: unknown, document: IFormattableDocument): void {
    if (isFormattedResource(obj)) {
      this._formatResource(obj, document);
    } else if (!isDotEObject(obj) || !this.formatDotObject(obj, document)) {
      if (isEObject(obj)) this._formatObject(obj, document);
    }
  }

  /** The DOT arms of the dispatch, in its order; `false` when none applies (split for the complexity limit). */
  private formatDotObject(obj: DotEObject, document: IFormattableDocument): boolean {
    if (L.ATTRIBUTE.isInstance(obj)) {
      this._formatAttribute(obj as Attribute, document);
    } else if (L.ATTRIBUTE_STATEMENT.isInstance(obj)) {
      this._formatAttributeStatement(obj as AttributeStatement, document);
    } else if (L.EDGE_STATEMENT.isInstance(obj)) {
      this._formatEdgeStatement(obj as EdgeStatement, document);
    } else if (L.NODE_STATEMENT.isInstance(obj)) {
      this._formatNodeStatement(obj as NodeStatement, document);
    } else if (L.SUBGRAPH.isInstance(obj)) {
      this._formatSubgraph(obj as Subgraph, document);
    } else {
      return this.formatDotObjectRest(obj, document);
    }
    return true;
  }

  /** The second half of the DOT arms, same order. */
  private formatDotObjectRest(obj: DotEObject, document: IFormattableDocument): boolean {
    if (L.EDGE_TARGET.isInstance(obj)) {
      this._formatEdgeTarget(obj as EdgeTarget, document);
    } else if (L.GRAPH.isInstance(obj)) {
      this._formatGraph(obj as Graph, document);
    } else if (L.GRAPHVIZ_MODEL.isInstance(obj)) {
      this._formatGraphvizModel(obj as GraphvizModel, document);
    } else if (L.NODE.isInstance(obj)) {
      this._formatNode(obj as Node, document);
    } else if (L.PORT.isInstance(obj)) {
      this._formatPort(obj as Port, document);
    } else {
      return false;
    }
    return true;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/formatting2/GraphvizDotFormatter.xtend:37-47 */
  protected _formatGraphvizModel(graphvizModel: GraphvizModel, document: IFormattableDocument): void {
    let region: IHiddenRegion | null = this.textRegionExtensions.previousHiddenRegion(graphvizModel);
    while (region !== null) {
      document.set(region, autowrap);
      region = region.getNextHiddenRegion();
    }
    for (const graph of graphvizModel.getGraphs()) {
      document.append(graph, newLine);
      document.format(graph);
    }
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/formatting2/GraphvizDotFormatter.xtend:49-60 */
  protected _formatGraph(graph: Graph, document: IFormattableDocument): void {
    const ext = this.textRegionExtensions;
    document.surround(ext.regionFor(graph).feature(L.GRAPH__TYPE), oneSpace);
    document.interior(
      document.append(document.prepend(ext.regionFor(graph).keyword(LEFT_CURLY), oneSpace), newLine),
      ext.regionFor(graph).keyword(RIGHT_CURLY),
      indent,
    );
    for (const statement of graph.getStatements()) {
      document.append(statement, newLine);
      document.format(statement);
    }
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/formatting2/GraphvizDotFormatter.xtend:62-65 */
  protected _formatAttribute(attribute: Attribute, document: IFormattableDocument): void {
    const ext = this.textRegionExtensions;
    document.prepend(ext.regionFor(attribute).keyword(SEMICOLON), noSpace);
    document.surround(ext.regionFor(attribute).keyword(EQUALS), oneSpace);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/formatting2/GraphvizDotFormatter.xtend:67-76 */
  protected _formatNodeStatement(nodeStatement: NodeStatement, document: IFormattableDocument): void {
    const ext = this.textRegionExtensions;
    document.prepend(ext.regionFor(nodeStatement).keyword(SEMICOLON), noSpace);
    document.append(document.prepend(ext.regionFor(nodeStatement).keyword(LEFT_SQUARE), oneSpace), noSpace);
    document.prepend(ext.regionFor(nodeStatement).keyword(RIGHT_SQUARE), noSpace);
    ext
      .regionFor(nodeStatement)
      .keywords(COMMA)
      .forEach((it: ISemanticRegion) => document.append(document.prepend(it, noSpace), oneSpace));
    const node = nodeStatement.getNode();
    if (node !== null) document.format(node);
    for (const attribute of nodeStatement.getAttributes()) {
      document.format(attribute);
    }
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/formatting2/GraphvizDotFormatter.xtend:78-81 */
  protected _formatNode(node: Node, document: IFormattableDocument): void {
    document.surround(this.textRegionExtensions.regionFor(node).keyword(COLON), noSpace);
    const port = node.getPort();
    if (port !== null) document.format(port);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/formatting2/GraphvizDotFormatter.xtend:83-96 */
  protected _formatEdgeStatement(edgeStatement: EdgeStatement, document: IFormattableDocument): void {
    const ext = this.textRegionExtensions;
    document.prepend(ext.regionFor(edgeStatement).keyword(SEMICOLON), noSpace);
    document.append(document.prepend(ext.regionFor(edgeStatement).keyword(LEFT_SQUARE), oneSpace), noSpace);
    document.prepend(ext.regionFor(edgeStatement).keyword(RIGHT_SQUARE), noSpace);
    ext
      .regionFor(edgeStatement)
      .keywords(COMMA)
      .forEach((it: ISemanticRegion) => document.append(document.prepend(it, noSpace), oneSpace));
    const sourceNode = edgeStatement.getSourceNode();
    if (sourceNode !== null) document.format(sourceNode);
    for (const target of edgeStatement.getEdgeTargets()) {
      document.prepend(target, oneSpace);
      document.format(target);
    }
    for (const attribute of edgeStatement.getAttributes()) {
      document.format(attribute);
    }
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/formatting2/GraphvizDotFormatter.xtend:98-102 */
  protected _formatEdgeTarget(edgeTarget: EdgeTarget, document: IFormattableDocument): void {
    document.append(this.textRegionExtensions.regionFor(edgeTarget).feature(L.EDGE_TARGET__OPERATOR), oneSpace);
    const targetSubgraph = edgeTarget.getTargetSubgraph();
    if (targetSubgraph !== null) document.format(targetSubgraph);
    const targetnode = edgeTarget.getTargetnode();
    if (targetnode !== null) document.format(targetnode);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/formatting2/GraphvizDotFormatter.xtend:104-112 */
  protected _formatAttributeStatement(attributeStatement: AttributeStatement, document: IFormattableDocument): void {
    const ext = this.textRegionExtensions;
    document.prepend(ext.regionFor(attributeStatement).keyword(SEMICOLON), noSpace);
    document.append(document.prepend(ext.regionFor(attributeStatement).keyword(LEFT_SQUARE), oneSpace), noSpace);
    document.prepend(ext.regionFor(attributeStatement).keyword(RIGHT_SQUARE), noSpace);
    ext
      .regionFor(attributeStatement)
      .keywords(COMMA)
      .forEach((it: ISemanticRegion) => document.append(document.prepend(it, noSpace), oneSpace));
    for (const attribute of attributeStatement.getAttributes()) {
      document.format(attribute);
    }
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/formatting2/GraphvizDotFormatter.xtend:114-126 */
  protected _formatSubgraph(subgraph: Subgraph, document: IFormattableDocument): void {
    const ext = this.textRegionExtensions;
    document.prepend(ext.regionFor(subgraph).keyword(SEMICOLON), noSpace);
    document.append(
      ext.regionFor(subgraph).keywordElement(this.grammarAccess.subgraphAccess.subgraphKeyword_1_0),
      oneSpace,
    );
    document.interior(
      document.append(document.prepend(ext.regionFor(subgraph).keyword(LEFT_CURLY), oneSpace), newLine),
      ext.regionFor(subgraph).keyword(RIGHT_CURLY),
      indent,
    );
    for (const statement of subgraph.getStatements()) {
      document.append(statement, newLine);
      document.format(statement);
    }
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/formatting2/GraphvizDotFormatter.xtend:128-130 */
  protected _formatPort(port: Port, document: IFormattableDocument): void {
    document.surround(this.textRegionExtensions.regionFor(port).keyword(COLON), noSpace);
  }
}
