// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import { AbstractFormatter2, isFormattedResource } from '../../../xtext/formatting2/AbstractFormatter2.js';
import type { IFormattableDocument } from '../../../xtext/formatting2/IFormattableDocument.js';
import type { ISemanticRegion } from '../../../xtext/formatting2/regionaccess/ISemanticRegion.js';
import type { HiddenRegionFormatterInit } from '../../../xtext/formatting2/IHiddenRegionFormatter.js';
import type { EMapPropertyHolder } from '../../EMapPropertyHolder.js';
import { isElkBendPoint, type ElkBendPoint } from '../../ElkBendPoint.js';
import { isElkEdge, type ElkEdge } from '../../ElkEdge.js';
import { isElkEdgeSection, type ElkEdgeSection } from '../../ElkEdgeSection.js';
import { isElkLabel, type ElkLabel } from '../../ElkLabel.js';
import { isElkNode, type ElkNode } from '../../ElkNode.js';
import { isElkPort, type ElkPort } from '../../ElkPort.js';
import type { ElkShape } from '../../ElkShape.js';
import { ElkPropertyToValueMapEntryImpl } from '../../impl/ElkPropertyToValueMapEntryImpl.js';
import { ElkGraphGrammarAccess } from '../serializer/ElkGraphGrammarAccess.js';
import { ElkFeature, ElkGraphTransientValueService } from '../serializer/ElkGraphTransientValueService.js';

const {
  rootNodeAccess,
  elkNodeAccess,
  elkEdgeAccess,
  elkPortAccess,
  elkLabelAccess,
  elkSingleEdgeSectionAccess,
  elkEdgeSectionAccess,
  elkBendPointAccess,
  propertyAccess,
  shapeLayoutAccess,
  edgeLayoutAccess,
} = ElkGraphGrammarAccess;

/** Java `Procedure1<? super IHiddenRegionFormatter>` constants, `:38-40`. */
const no_space: HiddenRegionFormatterInit = (f) => f.noSpace();
const one_space: HiddenRegionFormatterInit = (f) => f.oneSpace();
const new_line: HiddenRegionFormatterInit = (f) => f.newLine();
const new_lines: HiddenRegionFormatterInit = (f) => f.setNewLines(1, 1, 2);
const indent: HiddenRegionFormatterInit = (f) => f.indent();

const COLON = ':';
const COMMA = ',';

/** Java `ElkShape.eIsSet(feature)`: the generated `eIsSet` of the transient value service (D4, not ported on the model). */
const transientValues = new ElkGraphTransientValueService();

/**
 * The formatter of the ELK graph text language. The Xtend `dispatch format(...)` methods are one `format` with a
 * type switch (translation rules, dispatch row); each Xtend overload keeps its Java method name `_format` with the
 * type appended. The extension methods `node.regionFor`, `append` and `prepend` are the
 * `ITextRegionExtensions` / `IFormattableDocument` calls; the call order is the Xtend order (later `append`/`prepend`
 * on one region are merged by the document, so reordering changes the output).
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.xtend
 */
export class ElkGraphFormatter extends AbstractFormatter2 {
  /**
   * The Xtend dispatch: the most specific `format` overload for the runtime type. `XtextResource` and every other
   * `EObject` go to the base class defaults.
   *
   * @see org.eclipse.elk.graph.text/xtend-gen/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.java
   */
  format(obj: unknown, document: IFormattableDocument): void {
    if (isElkNode(obj)) {
      this._formatElkNode(obj, document);
    } else if (isElkEdge(obj)) {
      this._formatElkEdge(obj, document);
    } else if (isElkPort(obj)) {
      this._formatElkPort(obj, document);
    } else if (isElkLabel(obj)) {
      this._formatElkLabel(obj, document);
    } else if (isElkEdgeSection(obj)) {
      this._formatElkEdgeSection(obj, document);
    } else if (isElkBendPoint(obj)) {
      this._formatElkBendPoint(obj, document);
    } else if (obj instanceof ElkPropertyToValueMapEntryImpl) {
      this._formatElkPropertyToValueMapEntryImpl(obj, document);
    } else if (isFormattedResource(obj)) {
      this._formatResource(obj, document);
    } else if (isEObject(obj)) {
      this._formatObject(obj, document);
    }
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.xtend:44-73 */
  protected _formatElkNode(node: ElkNode, document: IFormattableDocument): void {
    const access = elkNodeAccess;
    if (node.getParent() === null) {
      this.appendKeyword(document, node, rootNodeAccess.graphKeyword_1_0, one_space);
      this.appendAssignment(document, node, rootNodeAccess.identifierAssignment_1_1, new_lines);
    } else {
      this.appendKeyword(document, node, access.nodeKeyword_0, one_space);
      this.interiorOfBrackets(document, node, access.leftCurlyBracketKeyword_2_0, access.rightCurlyBracketKeyword_2_4);
    }
    this.spaceColonsAndCommas(node, document);
    this.formatShapeLayout(node, document);
    for (const property of node.getProperties().entryList()) {
      document.format(property);
    }
    for (const child of node.getChildren()) {
      document.format(document.append(child, new_lines));
    }
    for (const edge of node.getContainedEdges()) {
      document.format(document.append(edge, new_lines));
    }
    for (const port of node.getPorts()) {
      document.format(document.append(port, new_lines));
    }
    for (const label of node.getLabels()) {
      document.format(document.append(label, new_lines));
    }
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.xtend:75-96 */
  protected _formatElkEdge(edge: ElkEdge, document: IFormattableDocument): void {
    const access = elkEdgeAccess;
    this.appendKeyword(document, edge, access.edgeKeyword_0, one_space);
    this.padKeyword(document, edge, access.hyphenMinusGreaterThanSignKeyword_4, one_space, one_space);
    this.spaceColonsAndCommas(edge, document);
    this.interiorOfBrackets(document, edge, access.leftCurlyBracketKeyword_7_0, access.rightCurlyBracketKeyword_7_4);
    this.formatEdgeLayout(edge, document);
    for (const section of edge.getSections()) {
      document.format(section);
      if (section.getIdentifier() !== null) {
        document.append(section, new_lines);
      }
    }
    for (const property of edge.getProperties().entryList()) {
      document.format(property);
    }
    for (const label of edge.getLabels()) {
      document.format(document.append(label, new_lines));
    }
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.xtend:98-113 */
  protected _formatElkPort(port: ElkPort, document: IFormattableDocument): void {
    this.appendKeyword(document, port, elkPortAccess.portKeyword_0, one_space);
    this.spaceColonsAndCommas(port, document);
    this.interiorOfBrackets(
      document,
      port,
      elkPortAccess.leftCurlyBracketKeyword_2_0,
      elkPortAccess.rightCurlyBracketKeyword_2_4,
    );
    this.formatShapeLayout(port, document);
    for (const property of port.getProperties().entryList()) {
      document.format(property);
    }
    for (const label of port.getLabels()) {
      document.format(document.append(label, new_lines));
    }
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.xtend:115-130 */
  protected _formatElkLabel(label: ElkLabel, document: IFormattableDocument): void {
    this.appendKeyword(document, label, elkLabelAccess.labelKeyword_0, one_space);
    this.spaceColonsAndCommas(label, document);
    this.interiorOfBrackets(
      document,
      label,
      elkLabelAccess.leftCurlyBracketKeyword_3_0,
      elkLabelAccess.rightCurlyBracketKeyword_3_4,
    );
    this.formatShapeLayout(label, document);
    for (const property of label.getProperties().entryList()) {
      document.format(property);
    }
    for (const nestedLabel of label.getLabels()) {
      document.format(document.append(nestedLabel, new_lines));
    }
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.xtend:132-169 */
  protected _formatElkEdgeSection(section: ElkEdgeSection, document: IFormattableDocument): void {
    this.spaceColonsAndCommas(section, document);
    if (section.getIdentifier() === null) {
      // This is a single edge section without 'section' keyword
      this.formatSingleEdgeSection(section, document);
    } else {
      // The section has square brackets surrounding a list of properties
      this.formatNamedEdgeSection(section, document);
    }
    const bendPoints = section.getBendPoints();
    document.append(bendPoints.size() === 0 ? null : bendPoints.get(bendPoints.size() - 1), new_line);
    for (const point of bendPoints) {
      document.format(point);
    }
    for (const property of section.getProperties().entryList()) {
      document.format(property);
    }
  }

  /** The `identifier === null` arm of `_formatElkEdgeSection`, `:135-141`. */
  private formatSingleEdgeSection(section: ElkEdgeSection, document: IFormattableDocument): void {
    const ext = this.textRegionExtensions;
    const access = elkSingleEdgeSectionAccess;
    this.appendAssignment(document, section, access.incomingShapeAssignment_1_0_0_2, new_line);
    this.appendAssignment(document, section, access.outgoingShapeAssignment_1_0_1_2, new_line);
    this.appendAssignment(document, section, access.startYAssignment_1_0_2_4, new_line);
    this.appendAssignment(document, section, access.endYAssignment_1_0_3_4, new_line);
    for (const bar of ext.regionFor(section).keywordElements(access.verticalLineKeyword_1_1_3_0)) {
      document.append(document.prepend(bar, one_space), one_space);
    }
  }

  /** The `else` arm of `_formatElkEdgeSection`, `:142-163`. */
  private formatNamedEdgeSection(section: ElkEdgeSection, document: IFormattableDocument): void {
    const ext = this.textRegionExtensions;
    const access = elkEdgeSectionAccess;
    this.appendKeyword(document, section, access.sectionKeyword_0, one_space);
    this.padKeyword(document, section, access.hyphenMinusGreaterThanSignKeyword_2_0, one_space, one_space);
    if (this.hasAtLeastOneProperty(section)) {
      document.interior(
        this.padKeyword(document, section, access.leftSquareBracketKeyword_3, one_space, new_line),
        ext.regionFor(section).keywordElement(access.rightSquareBracketKeyword_5),
        indent,
      );
      this.appendAssignment(document, section, access.incomingShapeAssignment_4_0_0_2, new_line);
      this.appendAssignment(document, section, access.outgoingShapeAssignment_4_0_1_2, new_line);
      this.appendAssignment(document, section, access.startYAssignment_4_0_2_4, new_line);
      this.appendAssignment(document, section, access.endYAssignment_4_0_3_4, new_line);
      for (const bar of ext.regionFor(section).keywordElements(access.verticalLineKeyword_4_1_3_0)) {
        document.append(document.prepend(bar, one_space), one_space);
      }
    } else {
      // The section is empty
      this.prependKeyword(document, section, access.leftSquareBracketKeyword_3, one_space);
      this.prependKeyword(document, section, access.rightSquareBracketKeyword_5, no_space);
    }
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.xtend:171-178 */
  private hasAtLeastOneProperty(section: ElkEdgeSection): boolean {
    return (
      transientValues.isSet(section, ElkFeature.INCOMING_SHAPE) ||
      transientValues.isSet(section, ElkFeature.OUTGOING_SHAPE) ||
      transientValues.isSet(section, ElkFeature.START_X) ||
      transientValues.isSet(section, ElkFeature.START_Y) ||
      transientValues.isSet(section, ElkFeature.END_X) ||
      transientValues.isSet(section, ElkFeature.END_Y) ||
      section.getBendPoints().size() !== 0 ||
      section.getProperties().size() !== 0
    );
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.xtend:180-182 */
  protected _formatElkBendPoint(bendPoint: ElkBendPoint, document: IFormattableDocument): void {
    document.append(
      document.prepend(
        this.textRegionExtensions.regionFor(bendPoint).keywordElement(elkBendPointAccess.commaKeyword_1),
        no_space,
      ),
      one_space,
    );
  }

  /**
   * The last property of its container gets `new_lines`, the others `new_line`.
   *
   * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.xtend:184-191
   */
  protected _formatElkPropertyToValueMapEntryImpl(
    entry: ElkPropertyToValueMapEntryImpl,
    document: IFormattableDocument,
  ): void {
    document.append(
      document.prepend(
        this.textRegionExtensions.regionFor(entry).keywordElement(propertyAccess.colonKeyword_1),
        no_space,
      ),
      one_space,
    );
    // cast: the container of a property entry is the EMapPropertyHolder that owns the `properties` map
    const entries = (entry.eContainer() as EMapPropertyHolder | null)?.getProperties().entryList();
    if (entries !== undefined && entries.indexOf(entry) === entries.size() - 1) {
      document.append(entry, new_lines);
    } else {
      document.append(entry, new_line);
    }
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.xtend:193-218 */
  private formatShapeLayout(shape: ElkShape, document: IFormattableDocument): void {
    const access = shapeLayoutAccess;
    let propCount = 0;
    if (transientValues.isSet(shape, ElkFeature.X) || transientValues.isSet(shape, ElkFeature.Y)) propCount++;
    if (transientValues.isSet(shape, ElkFeature.WIDTH) || transientValues.isSet(shape, ElkFeature.HEIGHT)) propCount++;
    if (propCount === 0) {
      this.prependKeyword(document, shape, access.leftSquareBracketKeyword_1, one_space);
      this.padKeyword(document, shape, access.rightSquareBracketKeyword_3, no_space, new_lines);
    } else if (propCount === 1) {
      // Format in one line
      this.prependKeyword(document, shape, access.leftSquareBracketKeyword_1, one_space);
      this.padKeyword(document, shape, access.rightSquareBracketKeyword_3, one_space, new_lines);
      this.prependKeyword(document, shape, access.positionKeyword_2_0_0, one_space);
      this.prependKeyword(document, shape, access.sizeKeyword_2_1_0, one_space);
    } else {
      // Format in multiple lines
      document.interior(
        this.padKeyword(document, shape, access.leftSquareBracketKeyword_1, one_space, new_line),
        this.appendKeyword(document, shape, access.rightSquareBracketKeyword_3, new_lines),
        indent,
      );
      this.appendAssignment(document, shape, access.YAssignment_2_0_4, new_line);
      this.appendAssignment(document, shape, access.heightAssignment_2_1_4, new_line);
    }
  }

  /** @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/formatting2/ElkGraphFormatter.xtend:220-234 */
  private formatEdgeLayout(edge: ElkEdge, document: IFormattableDocument): void {
    const access = edgeLayoutAccess;
    const sectionCount = edge.getSections().size();
    if (sectionCount === 0) {
      this.prependKeyword(document, edge, access.leftSquareBracketKeyword_1, one_space);
      this.padKeyword(document, edge, access.rightSquareBracketKeyword_3, no_space, new_lines);
    } else {
      document.interior(
        this.padKeyword(document, edge, access.leftSquareBracketKeyword_1, one_space, new_line),
        this.appendKeyword(document, edge, access.rightSquareBracketKeyword_3, new_lines),
        indent,
      );
    }
  }

  /**
   * `interior(owner.regionFor.keyword(open).prepend(one_space).append(new_line), owner.regionFor.keyword(close),
   * [indent])`, the block form written out in the node, edge, port and label overloads (lines 53-57, 81-85,
   * 101-105, 118-122); a helper only to stay under the NLOC limit of the port.
   */
  private interiorOfBrackets(document: IFormattableDocument, owner: EObject, open: string, close: string): void {
    const ext = this.textRegionExtensions;
    document.interior(
      document.append(this.prependKeyword(document, owner, open, one_space), new_line),
      ext.regionFor(owner).keywordElement(close),
      indent,
    );
  }

  /** `owner.regionFor.keyword(id).prepend(before).append(after)`. */
  private padKeyword(
    document: IFormattableDocument,
    owner: EObject,
    id: string,
    before: HiddenRegionFormatterInit,
    after: HiddenRegionFormatterInit,
  ): ISemanticRegion | null {
    return prependAppend(document, this.textRegionExtensions.regionFor(owner).keywordElement(id), before, after);
  }

  /** `owner.regionFor.keyword(id).prepend(init)`. */
  private prependKeyword(
    document: IFormattableDocument,
    owner: EObject,
    id: string,
    init: HiddenRegionFormatterInit,
  ): ISemanticRegion | null {
    return document.prepend(this.textRegionExtensions.regionFor(owner).keywordElement(id), init);
  }

  /** `owner.regionFor.keyword(id).append(init)`. */
  private appendKeyword(
    document: IFormattableDocument,
    owner: EObject,
    id: string,
    init: HiddenRegionFormatterInit,
  ): ISemanticRegion | null {
    return document.append(this.textRegionExtensions.regionFor(owner).keywordElement(id), init);
  }

  /** `owner.regionFor.assignment(id).append(init)`. */
  private appendAssignment(
    document: IFormattableDocument,
    owner: EObject,
    id: string,
    init: HiddenRegionFormatterInit,
  ): ISemanticRegion | null {
    return document.append(this.textRegionExtensions.regionFor(owner).assignment(id), init);
  }

  /** `x.regionFor.keywords(':', ',').forEach[prepend(no_space).append(one_space)]`, repeated in every overload. */
  private spaceColonsAndCommas(owner: EObject, document: IFormattableDocument): void {
    for (const region of this.textRegionExtensions.regionFor(owner).keywords(COLON, COMMA)) {
      document.append(document.prepend(region, no_space), one_space);
    }
  }
}

/** Java `obj instanceof EObject` for the fallback `_format(EObject)`. */
function isEObject(obj: unknown): obj is EObject {
  return typeof obj === 'object' && obj !== null && 'eContents' in obj;
}

/** `region.prepend(before).append(after)`: both formattings on one region, in this order. */
function prependAppend(
  document: IFormattableDocument,
  region: ISemanticRegion | null,
  before: HiddenRegionFormatterInit,
  after: HiddenRegionFormatterInit,
): ISemanticRegion | null {
  return document.append(document.prepend(region, before), after);
}
