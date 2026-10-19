// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import { AbstractFormatter2, isFormattedResource } from '../../../../xtext/formatting2/AbstractFormatter2.js';
import type { IFormattableDocument } from '../../../../xtext/formatting2/IFormattableDocument.js';
import type { HiddenRegionFormatterInit } from '../../../../xtext/formatting2/IHiddenRegionFormatter.js';
import { isElkEdge, type ElkEdge } from '../../../ElkEdge.js';
import type { ElkGraphElement } from '../../../ElkGraphElement.js';
import { isElkLabel, type ElkLabel } from '../../../ElkLabel.js';
import { isElkNode, type ElkNode } from '../../../ElkNode.js';
import { isElkPort, type ElkPort } from '../../../ElkPort.js';
import { ElkPropertyToValueMapEntryImpl } from '../../../impl/ElkPropertyToValueMapEntryImpl.js';
import { ElkGraphJsonGrammarAccess } from '../serializer/ElkGraphJsonGrammarAccess.js';

const {
  elkNodeAccess,
  elkPortAccess,
  elkLabelAccess,
  elkEdgeAccess,
  elkEdgeSourcesAccess,
  elkEdgeTargetsAccess,
  elkNodeChildrenAccess,
  elkNodePortsAccess,
  elkNodeEdgesAccess,
  elkGraphElementLabelsAccess,
  elkGraphElementPropertiesAccess,
  propertyAccess,
  jsonMemberAccess,
  jsonArrayAccess,
  jsonObjectAccess,
} = ElkGraphJsonGrammarAccess;

/** Java `Procedure1<? super IHiddenRegionFormatter>` constants, `:34-36`. */
const no_space: HiddenRegionFormatterInit = (f) => f.noSpace();
const one_space: HiddenRegionFormatterInit = (f) => f.oneSpace();
const new_line: HiddenRegionFormatterInit = (f) => f.newLine();
const indent: HiddenRegionFormatterInit = (f) => f.indent();

const COLON = ':';

/**
 * The comma keywords and the bracket pair a `formatWith...Style` method receives: the Xtend passes them as the
 * parameters `commaKeywords`, `openingKeyword` and `closingKeyword` (a record only to stay at five parameters).
 */
interface Delimiters {
  readonly commas: readonly string[];
  readonly opening: string;
  readonly closing: string;
}

const EDGE_SOURCES: Delimiters = {
  commas: [elkEdgeSourcesAccess.commaKeyword_1_1_0, elkEdgeSourcesAccess.commaKeyword_2],
  opening: elkEdgeSourcesAccess.leftSquareBracketKeyword_0,
  closing: elkEdgeSourcesAccess.rightSquareBracketKeyword_3,
};
const EDGE_TARGETS: Delimiters = {
  commas: [elkEdgeTargetsAccess.commaKeyword_1_1_0, elkEdgeTargetsAccess.commaKeyword_2],
  opening: elkEdgeTargetsAccess.leftSquareBracketKeyword_0,
  closing: elkEdgeTargetsAccess.rightSquareBracketKeyword_3,
};
const NODE_CHILDREN: Delimiters = {
  commas: [elkNodeChildrenAccess.commaKeyword_1_1_0, elkNodeChildrenAccess.commaKeyword_2],
  opening: elkNodeChildrenAccess.leftSquareBracketKeyword_0,
  closing: elkNodeChildrenAccess.rightSquareBracketKeyword_3,
};
const NODE_PORTS: Delimiters = {
  commas: [elkNodePortsAccess.commaKeyword_1_1_0, elkNodePortsAccess.commaKeyword_2],
  opening: elkNodePortsAccess.leftSquareBracketKeyword_0,
  closing: elkNodePortsAccess.rightSquareBracketKeyword_3,
};
const NODE_EDGES: Delimiters = {
  commas: [elkNodeEdgesAccess.commaKeyword_1_1_0, elkNodeEdgesAccess.commaKeyword_2],
  opening: elkNodeEdgesAccess.leftSquareBracketKeyword_0,
  closing: elkNodeEdgesAccess.rightSquareBracketKeyword_3,
};
const ELEMENT_LABELS: Delimiters = {
  commas: [elkGraphElementLabelsAccess.commaKeyword_1_1_0, elkGraphElementLabelsAccess.commaKeyword_2],
  opening: elkGraphElementLabelsAccess.leftSquareBracketKeyword_0,
  closing: elkGraphElementLabelsAccess.rightSquareBracketKeyword_3,
};
const ELEMENT_PROPERTIES: Delimiters = {
  commas: [elkGraphElementPropertiesAccess.commaKeyword_1_1_0, elkGraphElementPropertiesAccess.commaKeyword_2],
  opening: elkGraphElementPropertiesAccess.leftCurlyBracketKeyword_0,
  closing: elkGraphElementPropertiesAccess.rightCurlyBracketKeyword_3,
};
const NODE_BODY: Delimiters = {
  commas: [elkNodeAccess.commaKeyword_2_1_0, elkNodeAccess.commaKeyword_3],
  opening: elkNodeAccess.leftCurlyBracketKeyword_1,
  closing: elkNodeAccess.rightCurlyBracketKeyword_4,
};
const PORT_BODY: Delimiters = {
  commas: [elkPortAccess.commaKeyword_2_0, elkPortAccess.commaKeyword_3],
  opening: elkPortAccess.leftCurlyBracketKeyword_0,
  closing: elkPortAccess.rightCurlyBracketKeyword_4,
};
const LABEL_BODY: Delimiters = {
  commas: [elkLabelAccess.commaKeyword_2_0, elkLabelAccess.commaKeyword_3],
  opening: elkLabelAccess.leftCurlyBracketKeyword_0,
  closing: elkLabelAccess.rightCurlyBracketKeyword_4,
};
const EDGE_BODY: Delimiters = {
  commas: [elkEdgeAccess.commaKeyword_2_0, elkEdgeAccess.commaKeyword_3],
  opening: elkEdgeAccess.leftCurlyBracketKeyword_0,
  closing: elkEdgeAccess.rightCurlyBracketKeyword_4,
};

/** The statements of `formatJsonMember`: keywords, then `prepend(before).append(after)` on each region found. */
const JSON_MEMBER_RULES: readonly (readonly [
  readonly string[],
  HiddenRegionFormatterInit,
  HiddenRegionFormatterInit,
])[] = [
  [[jsonMemberAccess.colonKeyword_1], no_space, one_space],
  [[jsonArrayAccess.leftSquareBracketKeyword_0], one_space, new_line],
  [[jsonArrayAccess.commaKeyword_1_1_0, jsonArrayAccess.commaKeyword_2], no_space, one_space],
  [[jsonObjectAccess.leftCurlyBracketKeyword_0], one_space, new_line],
  [[jsonObjectAccess.commaKeyword_1_1_0, jsonObjectAccess.commaKeyword_2], no_space, one_space],
];

/**
 * The formatter of the ELK JSON text language. The Xtend `dispatch format(...)` methods are one `format` with a type
 * switch (translation rules, dispatch row); each Xtend overload keeps its Java method name `_format` with the type
 * appended. The extension methods `element.regionFor`, `append`, `prepend` and `interior` are the
 * `ITextRegionExtensions` / `IFormattableDocument` calls, in the Xtend call order (later `append`/`prepend` on one
 * region are merged by the document, so reordering changes the output). `regionFor(x).keywords(':')` matches by
 * keyword text, `keyword(Keyword)` / `keywords(Keyword...)` by grammar element (`keywordElement(s)`).
 *
 * `formatJsonMember` finds nothing: the JSON member rules never appear in a serialized graph (see its note in the
 * Xtend), and the method is ported as written.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend
 */
export class ElkGraphJsonFormatter extends AbstractFormatter2 {
  /**
   * The Xtend dispatch: the most specific `format` overload for the runtime type. `XtextResource` and every other
   * `EObject` go to the base class defaults.
   *
   * @see org.eclipse.elk.graph.json.text/xtend-gen/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.java
   */
  format(obj: unknown, document: IFormattableDocument): void {
    if (isElkNode(obj)) {
      this._formatElkNode(obj, document);
    } else if (isElkPort(obj)) {
      this._formatElkPort(obj, document);
    } else if (obj instanceof ElkPropertyToValueMapEntryImpl) {
      this._formatElkPropertyToValueMapEntryImpl(obj, document);
    } else if (isElkLabel(obj)) {
      this._formatElkLabel(obj, document);
    } else if (isElkEdge(obj)) {
      this._formatElkEdge(obj, document);
    } else if (isFormattedResource(obj)) {
      this._formatResource(obj, document);
    } else if (isEObject(obj)) {
      this._formatObject(obj, document);
    }
  }

  /** @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:40-61 */
  protected _formatElkNode(node: ElkNode, document: IFormattableDocument): void {
    const compact =
      node.getChildren().size() === 0 &&
      node.getPorts().size() === 0 &&
      node.getLabels().size() === 0 &&
      node.getProperties().size() === 0;
    this.formatWithCommonGraphElementStyle(node, NODE_BODY, compact, document);

    this.formatElkNodeChildren(node, document);
    this.formatElkNodePorts(node, document);
    this.formatElkGraphElementLabels(node, document);
    this.formatElkNodeEdges(node, document);
    this.formatLayoutOptions(node, document);
    this.formatJsonMember(node, document);

    for (const child of node.getChildren()) document.format(child);
    for (const port of node.getPorts()) document.format(port);
    for (const label of node.getLabels()) document.format(label);
    for (const edge of node.getContainedEdges()) document.format(edge);
    for (const property of node.getProperties().entryList()) document.format(property);
  }

  /** @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:63-78 */
  protected _formatElkPort(port: ElkPort, document: IFormattableDocument): void {
    const compact = port.getProperties().size() === 0 && port.getLabels().size() < 2;
    this.formatWithCommonGraphElementStyle(port, PORT_BODY, compact, document);

    this.formatElkGraphElementLabels(port, document);
    this.formatLayoutOptions(port, document);
    this.formatJsonMember(port, document);

    for (const label of port.getLabels()) document.format(label);
    for (const property of port.getProperties().entryList()) document.format(property);
  }

  /** @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:80-95 */
  protected _formatElkLabel(label: ElkLabel, document: IFormattableDocument): void {
    const compact = label.getProperties().size() === 0 && label.getLabels().size() === 0;
    this.formatWithCommonGraphElementStyle(label, LABEL_BODY, compact, document);

    this.formatElkGraphElementLabels(label, document);
    this.formatLayoutOptions(label, document);
    this.formatJsonMember(label, document);

    for (const nested of label.getLabels()) document.format(nested);
    for (const property of label.getProperties().entryList()) document.format(property);
  }

  /** @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:97-115 */
  protected _formatElkEdge(edge: ElkEdge, document: IFormattableDocument): void {
    const compact = edge.getProperties().size() === 0 && edge.getSources().size() < 2 && edge.getTargets().size() < 2;
    this.formatWithCommonGraphElementStyle(edge, EDGE_BODY, compact, document);

    // TODO sections (upstream: edges with sections do not serialize)
    this.formatElkEdgeSources(edge, document);
    this.formatElkEdgeTargets(edge, document);
    this.formatElkGraphElementLabels(edge, document);
    this.formatLayoutOptions(edge, document);
    this.formatJsonMember(edge, document);

    for (const label of edge.getLabels()) document.format(label);
    for (const property of edge.getProperties().entryList()) document.format(property);
  }

  /** @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:117-119 */
  protected _formatElkPropertyToValueMapEntryImpl(
    entry: ElkPropertyToValueMapEntryImpl,
    document: IFormattableDocument,
  ): void {
    const colon = this.textRegionExtensions.regionFor(entry).keywordElement(propertyAccess.colonKeyword_1);
    document.append(document.prepend(colon, no_space), one_space);
  }

  /**
   * `formatWithCommonGraphElementStyle(element, commaKeywords, openingKeyword, closingKeyword, compact, document)`.
   *
   * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:121-138
   */
  private formatWithCommonGraphElementStyle(
    element: ElkGraphElement,
    delimiters: Delimiters,
    compact: boolean,
    document: IFormattableDocument,
  ): void {
    const regions = this.textRegionExtensions.regionFor(element);
    for (const colon of regions.keywords(COLON)) {
      document.append(document.prepend(colon, no_space), one_space);
    }
    for (const comma of regions.keywordElements(...delimiters.commas)) {
      document.prepend(comma, no_space);
      document.append(comma, compact ? one_space : new_line);
    }
    // `x => [...]` runs the block on `x` and yields `x`
    const opening = document.prepend(regions.keywordElement(delimiters.opening), no_space);
    document.append(opening, compact ? one_space : new_line);
    const closing = regions.keywordElement(delimiters.closing);
    document.prepend(closing, compact ? one_space : new_line);
    document.interior(opening, closing, indent);
  }

  /** Formatting of container fragments. @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:144-148 */
  private formatElkEdgeSources(edge: ElkEdge, document: IFormattableDocument): void {
    this.formatWithCommonContainerStyle(edge, true, EDGE_SOURCES, document);
  }

  /** @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:150-154 */
  private formatElkEdgeTargets(edge: ElkEdge, document: IFormattableDocument): void {
    this.formatWithCommonContainerStyle(edge, true, EDGE_TARGETS, document);
  }

  /** @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:156-161 */
  private formatElkNodeChildren(node: ElkNode, document: IFormattableDocument): void {
    this.formatWithCommonContainerStyle(node, node.getChildren().size() === 0, NODE_CHILDREN, document);
  }

  /** @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:163-167 */
  private formatElkNodePorts(node: ElkNode, document: IFormattableDocument): void {
    this.formatWithCommonContainerStyle(node, node.getPorts().size() === 0, NODE_PORTS, document);
  }

  /** @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:169-173 */
  private formatElkNodeEdges(node: ElkNode, document: IFormattableDocument): void {
    this.formatWithCommonContainerStyle(node, node.getContainedEdges().size() === 0, NODE_EDGES, document);
  }

  /** @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:175-180 */
  private formatElkGraphElementLabels(element: ElkGraphElement, document: IFormattableDocument): void {
    this.formatWithCommonContainerStyle(element, element.getLabels().size() === 0, ELEMENT_LABELS, document);
  }

  /** @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:182-200 */
  private formatLayoutOptions(element: ElkGraphElement, document: IFormattableDocument): void {
    const compact = element.getProperties().size() < 2;
    this.formatWithCommonContainerStyle(element, compact, ELEMENT_PROPERTIES, document);

    const regions = this.textRegionExtensions.regionFor(element);
    // Different from the other containers
    if (!compact) {
      document.append(regions.keywordElement(ELEMENT_PROPERTIES.opening), new_line);
    }
    for (const comma of regions.keywordElements(...ELEMENT_PROPERTIES.commas)) {
      if (compact) {
        document.append(document.prepend(comma, no_space), one_space);
      } else {
        document.append(comma, new_line);
      }
    }
  }

  /**
   * `formatWithCommonContainerStyle(element, compact, commaKeywords, openingKeyword, closingKeyword, document)`.
   *
   * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:202-217
   */
  private formatWithCommonContainerStyle(
    element: ElkGraphElement,
    compact: boolean,
    delimiters: Delimiters,
    document: IFormattableDocument,
  ): void {
    const regions = this.textRegionExtensions.regionFor(element);
    for (const comma of regions.keywordElements(...delimiters.commas)) {
      document.append(document.prepend(comma, no_space), new_line);
    }
    if (compact) {
      document.append(regions.keywordElement(delimiters.opening), one_space);
      document.prepend(regions.keywordElement(delimiters.closing), one_space);
    } else {
      const opening = document.append(
        document.prepend(regions.keywordElement(delimiters.opening), one_space),
        new_line,
      );
      const closing = document.prepend(regions.keywordElement(delimiters.closing), new_line);
      document.interior(opening, closing, indent);
    }
  }

  /**
   * Finds no region: the JSON member rules never occur in a graph (upstream TODO, kept as written). The five
   * `regionFor(element).keywords(...).forEach[...]` statements, in the Xtend order, are the rows of
   * {@link JSON_MEMBER_RULES}.
   *
   * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/formatting2/ElkGraphJsonFormatter.xtend:223-238
   */
  private formatJsonMember(element: ElkGraphElement, document: IFormattableDocument): void {
    const regions = this.textRegionExtensions.regionFor(element);
    for (const [keywords, before, after] of JSON_MEMBER_RULES) {
      for (const region of regions.keywordElements(...keywords)) {
        document.append(document.prepend(region, before), after);
      }
    }
  }
}

/** Java `obj instanceof EObject` for the fallback `_format(EObject)`. */
function isEObject(obj: unknown): obj is EObject {
  return typeof obj === 'object' && obj !== null && 'eContents' in obj;
}
