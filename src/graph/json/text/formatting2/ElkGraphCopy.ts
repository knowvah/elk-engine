// SPDX-License-Identifier: EPL-2.0
import type { ElkConnectableShape } from '../../../ElkConnectableShape.js';
import type { ElkEdge } from '../../../ElkEdge.js';
import type { ElkEdgeSection } from '../../../ElkEdgeSection.js';
import type { ElkGraphElement } from '../../../ElkGraphElement.js';
import type { ElkNode } from '../../../ElkNode.js';
import { ElkGraphFactory } from '../../../ElkGraphFactory.js';
import { isEMapPropertyHolder } from '../../../EMapPropertyHolder.js';
import type { EMapPropertyHolder } from '../../../EMapPropertyHolder.js';
import { ElkPropertyToValueMapEntryImpl } from '../../../impl/ElkPropertyToValueMapEntryImpl.js';
import { ElkGraphUtil } from '../../../util/ElkGraphUtil.js';

// The `EcoreUtil.copy(root)` the writer applies before serializing (T5 recorder, D3). Same algorithm as the `.elkt`
// writer's copy (`src/graph/text/ElkGraphText.ts`, which this bundle may not import): `src/graph/json/text` imports
// only core, graph, xtext, emf, java and guava.

/** A set double: the `eIsSet` of an attribute whose default is `0.0` (`-0.0 == 0.0`, `NaN != 0.0`). */
const isSetDouble = (v: number): boolean => v !== 0;

/** The old-to-new map of a copy, with the lookups that drop references leaving the copied tree. */
type Copies = Map<object, object>;

function copyProperties(from: EMapPropertyHolder, to: EMapPropertyHolder): void {
  for (const entry of from.getProperties().entryList()) {
    // `EcoreUtil.copy` copies the entries of the containment list one by one, so a graph loaded with a repeated key
    // (the `.elkj` parser keeps both entries) keeps both; `put` would merge them. Keys and values are shared with the
    // original (EMF copies a map entry's attributes by reference).
    const copy = new ElkPropertyToValueMapEntryImpl();
    copy.setKey(entry.getKey());
    copy.setValue(entry.getValue());
    to.getProperties().entryList().add(copy);
  }
}

function copyElement(from: ElkGraphElement, to: ElkGraphElement, copies: Copies): void {
  copies.set(from, to);
  to.setIdentifier(from.getIdentifier());
  if (isEMapPropertyHolder(from) && isEMapPropertyHolder(to)) {
    copyProperties(from, to);
  }
  for (const label of from.getLabels()) {
    const copy = ElkGraphUtil.createLabel(to);
    copy.setText(label.getText());
    copyShapeFeatures(label, copy);
    copyElement(label, copy, copies);
  }
}

function copyShapeFeatures(
  from: { getX(): number; getY(): number; getWidth(): number; getHeight(): number },
  to: { setX(v: number): void; setY(v: number): void; setWidth(v: number): void; setHeight(v: number): void },
): void {
  if (isSetDouble(from.getX())) to.setX(from.getX());
  if (isSetDouble(from.getY())) to.setY(from.getY());
  if (isSetDouble(from.getWidth())) to.setWidth(from.getWidth());
  if (isSetDouble(from.getHeight())) to.setHeight(from.getHeight());
}

function copyNode(from: ElkNode, to: ElkNode, copies: Copies): void {
  copyElement(from, to, copies);
  copyShapeFeatures(from, to);
  for (const port of from.getPorts()) {
    const copy = ElkGraphUtil.createPort(to);
    copyElement(port, copy, copies);
    copyShapeFeatures(port, copy);
  }
  for (const child of from.getChildren()) {
    copyNode(child, ElkGraphUtil.createNode(to), copies);
  }
  for (const edge of from.getContainedEdges()) {
    const copy = ElkGraphUtil.createEdge(to);
    copyElement(edge, copy, copies);
    copySections(edge, copy, copies);
  }
}

function copySections(from: ElkEdge, to: ElkEdge, copies: Copies): void {
  for (const section of from.getSections()) {
    const copy = ElkGraphUtil.createEdgeSection(to);
    copies.set(section, copy);
    copy.setIdentifier(section.getIdentifier());
    if (isEMapPropertyHolder(section) && isEMapPropertyHolder(copy)) {
      copyProperties(section, copy);
    }
    copySectionLocations(section, copy);
  }
}

function copySectionLocations(from: ElkEdgeSection, to: ElkEdgeSection): void {
  if (isSetDouble(from.getStartX())) to.setStartX(from.getStartX());
  if (isSetDouble(from.getStartY())) to.setStartY(from.getStartY());
  if (isSetDouble(from.getEndX())) to.setEndX(from.getEndX());
  if (isSetDouble(from.getEndY())) to.setEndY(from.getEndY());
  for (const bend of from.getBendPoints()) {
    const bendCopy = ElkGraphFactory.eINSTANCE.createElkBendPoint();
    if (isSetDouble(bend.getX())) bendCopy.setX(bend.getX());
    if (isSetDouble(bend.getY())) bendCopy.setY(bend.getY());
    to.getBendPoints().add(bendCopy);
  }
}

/** The copy of a referenced shape, `null` when the target is outside the copied tree (it has an `eOpposite`). */
function copied<T extends object>(copies: Copies, original: T | null): T | null {
  return original === null ? null : ((copies.get(original) as T | undefined) ?? null);
}

function copyEdgeReferences(node: ElkNode, copies: Copies): void {
  for (const edge of node.getContainedEdges()) {
    const copy = copies.get(edge) as ElkEdge;
    for (const source of edge.getSources()) addCopied(copy.getSources(), copied<ElkConnectableShape>(copies, source));
    for (const target of edge.getTargets()) addCopied(copy.getTargets(), copied<ElkConnectableShape>(copies, target));
    for (const section of edge.getSections()) copySectionLinks(section, copies);
  }
  for (const child of node.getChildren()) {
    copyEdgeReferences(child, copies);
  }
}

function addCopied<T>(list: { add(o: T): boolean }, target: T | null): void {
  if (target !== null) list.add(target);
}

function copySectionLinks(section: ElkEdgeSection, copies: Copies): void {
  const copy = copies.get(section) as ElkEdgeSection;
  copy.setIncomingShape(copied(copies, section.getIncomingShape()));
  copy.setOutgoingShape(copied(copies, section.getOutgoingShape()));
  for (const next of section.getOutgoingSections()) {
    // the opposite (`incomingSections`) is maintained by the model
    addCopied(copy.getOutgoingSections(), copied(copies, next));
  }
}

/**
 * `EcoreUtil.copy(root)`: containment is copied (nodes, ports, labels, edges, sections, bend points, property
 * entries), attributes are copied when set, cross references are remapped into the copy, and a reference to an
 * object outside the copied tree is dropped (`Copier.copyReference` keeps original targets only for references
 * without an `eOpposite`, and every ElkGraph reference has one). Property keys and values are shared.
 *
 * @see org.eclipse.emf.ecore/src/org/eclipse/emf/ecore/util/EcoreUtil.java (Copier)
 */
export function copyGraph(root: ElkNode): ElkNode {
  const copies: Copies = new Map();
  const copy = ElkGraphUtil.createGraph();
  copyNode(root, copy, copies);
  copyEdgeReferences(root, copies);
  return copy;
}
