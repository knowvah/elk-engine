// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { EdgeCoords } from '../../core/options/EdgeCoords.js';
import { ShapeCoords } from '../../core/options/ShapeCoords.js';
import type { JsonArray } from '../../gson/JsonArray.js';
import type { JsonObject } from '../../gson/JsonObject.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import type { ElkBendPoint } from '../ElkBendPoint.js';
import { type ElkEdge, isElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import type { ElkGraphElement } from '../ElkGraphElement.js';
import { isElkLabel } from '../ElkLabel.js';
import { type ElkNode, isElkNode } from '../ElkNode.js';
import { isElkPort } from '../ElkPort.js';
import type { ElkShape } from '../ElkShape.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { deref, unbox } from './JsonAdapter.js';
import type { JsonId, JsonImporterState } from './JsonImporter.js';

const X_KEY = 'x';
const Y_KEY = 'y';
const WIDTH_KEY = 'width';
const HEIGHT_KEY = 'height';
const ID_KEY = 'id';
const SECTIONS_KEY = 'sections';
const START_POINT_KEY = 'startPoint';
const END_POINT_KEY = 'endPoint';
const BEND_POINTS_KEY = 'bendPoints';
const INCOMING_SHAPE_KEY = 'incomingShape';
const OUTGOING_SHAPE_KEY = 'outgoingShape';
const INCOMING_SECTIONS_KEY = 'incomingSections';
const OUTGOING_SECTIONS_KEY = 'outgoingSections';
const JUNCTION_POINTS_KEY = 'junctionPoints';
const CONTAINER_KEY = 'container';
const SECTION_ID_INFIX = '_s';

/**
 * Transfer the layout back to the formerly imported graph, using `transform`: the Xtend members `transferLayout` to
 * `idByElement` (549-741; `idByElement` itself stays on the importer) and the coordinate-mode helpers (797-864), as
 * module functions over the importer state (J3).
 *
 * @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonImporter.xtend
 */
export function transferLayout(state: JsonImporterState, graph: ElkNode): void {
  // First pass handles nodes and ports.
  for (const element of ElkGraphUtil.propertiesSkippingIteratorFor(graph, true)) {
    transferLayoutInt1(state, element);
  }

  // Second pass handles edges and labels.
  for (const element of ElkGraphUtil.propertiesSkippingIteratorFor(graph, true)) {
    transferLayoutInt2(state, element);
  }
}

/** The Xtend `dispatch transferLayoutInt1` over node, port and Object. */
function transferLayoutInt1(state: JsonImporterState, element: unknown): void {
  if (isElkNode(element)) {
    transferNodeLayout(state, element);
  } else if (isElkPort(element)) {
    const jsonObj = state.portJsonMap.get(element);
    if (jsonObj === undefined) {
      throw state.adapter.formatError('Port did not exist in input.');
    }
    recordGlobalCoords(state, element);
    recordCoordinateModes(state, element);
    transferShapeLayout(state, element, jsonObj);
  }
  // don't care about the rest
}

function transferNodeLayout(state: JsonImporterState, node: ElkNode): void {
  const jsonObj = state.nodeJsonMap.get(node);
  if (jsonObj === undefined) {
    throw state.adapter.formatError('Node did not exist in input.');
  }
  recordGlobalCoords(state, node);
  recordCoordinateModes(state, node);
  transferShapeLayout(state, node, jsonObj);
}

/** The Xtend `dispatch transferLayoutInt2` over edge, label and Object. */
function transferLayoutInt2(state: JsonImporterState, element: unknown): void {
  if (isElkEdge(element)) {
    transferEdgeLayout(state, element);
  } else if (isElkLabel(element)) {
    const jsonObj = state.labelJsonMap.get(element) ?? null;
    recordGlobalCoords(state, element);
    recordCoordinateModes(state, element);
    transferShapeLayout(state, element, jsonObj);
  }
  // don't care about the rest
}

function transferEdgeLayout(state: JsonImporterState, edge: ElkEdge): void {
  const adapter = state.adapter;
  const jsonObj = adapter.toJsonObject(state.edgeJsonMap.get(edge) ?? null);
  if (jsonObj === null) {
    throw adapter.formatError('Edge did not exist in input.');
  }

  recordCoordinateModes(state, edge);

  const edgeId = adapter.getId(jsonObj);

  // what we need to transfer are the edge sections
  if (!edge.getSections().isEmpty()) {
    transferSections(state, edge, jsonObj, edgeId);
  }

  // transfer junction points, if existent
  transferJunctionPoints(state, edge, jsonObj);

  if (edgeCoordsMode(state, originalParent(state, edge)) === EdgeCoords.CONTAINER) {
    adapter.addJsonObj(jsonObj, CONTAINER_KEY, deref(edge.getContainingNode()).getIdentifier());
  }
}

/** The "what we need to transfer are the edge sections" block of `transferLayoutInt2(ElkEdge)`. */
function transferSections(state: JsonImporterState, edge: ElkEdge, jsonObj: JsonObject, edgeId: JsonId): void {
  const adapter = state.adapter;
  const sections = adapter.newJsonArray();
  let i = 0;
  for (const elkSection of edge.getSections()) {
    // check if there's a corresponding json section
    let maybeSection = state.edgeSectionJsonMap.get(elkSection) ?? null;
    if (maybeSection === null) {
      // otherwise create a new one
      maybeSection = adapter.newJsonObject();
      // Id, just enumerate the sections per edge
      adapter.addJsonObj(maybeSection, ID_KEY, `${String(edgeId)}${SECTION_ID_INFIX}${i}`);
    }
    const jsonSection = maybeSection;
    adapter.addJsonArr(sections, jsonSection);

    transferSectionPoints(state, edge, elkSection, jsonSection);
    transferSectionShapes(state, elkSection, jsonSection);
    transferSectionLinks(state, elkSection, jsonSection);
    i++;
  }
  adapter.removeJsonObj(jsonObj, SECTIONS_KEY);
  adapter.addJsonObj(jsonObj, SECTIONS_KEY, sections);
}

/** The start point, end point and bend points blocks of a section. */
function transferSectionPoints(
  state: JsonImporterState,
  edge: ElkEdge,
  elkSection: ElkEdgeSection,
  jsonSection: JsonObject,
): void {
  const adapter = state.adapter;
  // Start Point
  adapter.addJsonObj(
    jsonSection,
    START_POINT_KEY,
    pointJson(state, edge, { x: elkSection.getStartX(), y: elkSection.getStartY() }),
  );

  // End Point
  adapter.addJsonObj(
    jsonSection,
    END_POINT_KEY,
    pointJson(state, edge, { x: elkSection.getEndX(), y: elkSection.getEndY() }),
  );

  // Bend Points
  if (!elkSection.getBendPoints().isEmpty()) {
    const bendPoints = adapter.newJsonArray();
    for (const pnt of elkSection.getBendPoints()) {
      adapter.addJsonArr(bendPoints, pointJson(state, edge, pnt));
    }
    adapter.addJsonObj(jsonSection, BEND_POINTS_KEY, bendPoints);
  }
}

/** The `{x, y}` json object of a start, end, bend or junction point, in the edge's coordinate mode. */
function pointJson(state: JsonImporterState, edge: ElkEdge, pnt: ElkBendPoint | { x: number; y: number }): JsonObject {
  const adapter = state.adapter;
  const [x, y] = 'getX' in pnt ? [pnt.getX(), pnt.getY()] : [pnt.x, pnt.y];
  const jsonPnt = adapter.newJsonObject();
  adapter.addJsonObjDouble(jsonPnt, X_KEY, adjustX(state, edge, x));
  adapter.addJsonObjDouble(jsonPnt, Y_KEY, adjustY(state, edge, y));
  return jsonPnt;
}

/** The incoming shape and outgoing shape blocks of a section. */
function transferSectionShapes(state: JsonImporterState, elkSection: ElkEdgeSection, jsonSection: JsonObject): void {
  const adapter = state.adapter;
  // Incoming shape
  if (elkSection.getIncomingShape() !== null) {
    adapter.addJsonObjObject(jsonSection, INCOMING_SHAPE_KEY, state.idByElement(elkSection.getIncomingShape()));
  }

  // Outgoing shape
  if (elkSection.getOutgoingShape() !== null) {
    adapter.addJsonObjObject(jsonSection, OUTGOING_SHAPE_KEY, state.idByElement(elkSection.getOutgoingShape()));
  }
}

/** The incoming sections and outgoing sections blocks of a section. */
function transferSectionLinks(state: JsonImporterState, elkSection: ElkEdgeSection, jsonSection: JsonObject): void {
  const adapter = state.adapter;
  // Incoming sections
  if (!elkSection.getIncomingSections().isEmpty()) {
    const incomingSections = adapter.newJsonArray();
    for (const sec of elkSection.getIncomingSections()) {
      adapter.addJsonArrObject(incomingSections, state.idByElement(sec));
    }
    adapter.addJsonObj(jsonSection, INCOMING_SECTIONS_KEY, incomingSections);
  }

  // Outgoing sections
  if (!elkSection.getOutgoingSections().isEmpty()) {
    const outgoingSections = adapter.newJsonArray();
    for (const sec of elkSection.getOutgoingSections()) {
      adapter.addJsonArrObject(outgoingSections, state.idByElement(sec));
    }
    adapter.addJsonObj(jsonSection, OUTGOING_SECTIONS_KEY, outgoingSections);
  }
}

/** The "transfer junction points, if existent" block of `transferLayoutInt2(ElkEdge)`. */
function transferJunctionPoints(state: JsonImporterState, edge: ElkEdge, jsonObj: JsonObject): void {
  if (edge.hasProperty(CoreOptions.JUNCTION_POINTS)) {
    const jps = edge.getProperty(CoreOptions.JUNCTION_POINTS);
    if (jps !== null && !jps.isEmpty()) {
      const jsonJPs: JsonArray = state.adapter.newJsonArray();
      for (const jp of jps) {
        state.adapter.addJsonArr(jsonJPs, pointJson(state, edge, jp));
      }
      state.adapter.addJsonObj(jsonObj, JUNCTION_POINTS_KEY, jsonJPs);
    }
  }
}

function transferShapeLayout(state: JsonImporterState, shape: ElkShape, jsonObjA: unknown): void {
  const adapter = state.adapter;
  const jsonObj = adapter.toJsonObject(jsonObjA);
  const parent = jsonParent(state, shape);
  // pos and dimension
  const x = parent === null ? shape.getX() : adjustX(state, parent, shape.getX());
  const y = parent === null ? shape.getY() : adjustY(state, parent, shape.getY());
  adapter.addJsonObjDouble(deref(jsonObj), X_KEY, x);
  adapter.addJsonObjDouble(deref(jsonObj), Y_KEY, y);
  adapter.addJsonObjDouble(deref(jsonObj), WIDTH_KEY, shape.getWidth());
  adapter.addJsonObjDouble(deref(jsonObj), HEIGHT_KEY, shape.getHeight());
}

/** The Xtend `dispatch adjustX` over edge and shape. */
function adjustX(state: JsonImporterState, element: ElkGraphElement, x: number): number {
  if (isElkEdge(element)) {
    const mode = edgeCoordsMode(state, originalParent(state, element));
    switch (mode) {
      case EdgeCoords.ROOT:
        return x + globalX(state, deref(element.getContainingNode()));
      case EdgeCoords.PARENT:
        return x + globalX(state, deref(element.getContainingNode())) - globalX(state, originalParent(state, element));
      default:
        return x;
    }
  }
  const mode = shapeCoordsMode(state, element);
  return mode === ShapeCoords.ROOT ? x + globalX(state, element as ElkShape) : x;
}

/** The Xtend `dispatch adjustY` over edge and shape. */
function adjustY(state: JsonImporterState, element: ElkGraphElement, y: number): number {
  if (isElkEdge(element)) {
    const mode = edgeCoordsMode(state, originalParent(state, element));
    switch (mode) {
      case EdgeCoords.ROOT:
        return y + globalY(state, deref(element.getContainingNode()));
      case EdgeCoords.PARENT:
        return y + globalY(state, deref(element.getContainingNode())) - globalY(state, originalParent(state, element));
      default:
        return y;
    }
  }
  const mode = shapeCoordsMode(state, element);
  return mode === ShapeCoords.ROOT ? y + globalY(state, element as ElkShape) : y;
}

/* ---------------------------------------------------------------------------
 *   Coordinate-mode helpers (Xtend 797-864)
 */

function recordCoordinateModes(state: JsonImporterState, element: ElkGraphElement): void {
  const parent = jsonParent(state, element);
  recordShapeCoordsMode(state, element, parent);
  recordEdgeCoordsMode(state, element, parent);
}

/** The shape coordinate mode half of `recordCoordinateModes`. */
function recordShapeCoordsMode(
  state: JsonImporterState,
  element: ElkGraphElement,
  parent: ElkGraphElement | null,
): void {
  let scm = element.getProperty(CoreOptions.JSON_SHAPE_COORDS) ?? ShapeCoords.INHERIT;
  if (scm === ShapeCoords.INHERIT) {
    scm = shapeCoordsMode(state, parent) ?? ShapeCoords.PARENT;
  }
  state.shapeCoordsMap.set(element, scm);
}

/** The edge coordinate mode half of `recordCoordinateModes`. */
function recordEdgeCoordsMode(
  state: JsonImporterState,
  element: ElkGraphElement,
  parent: ElkGraphElement | null,
): void {
  let ecm = element.getProperty(CoreOptions.JSON_EDGE_COORDS) ?? EdgeCoords.INHERIT;
  if (ecm === EdgeCoords.INHERIT) {
    ecm = edgeCoordsMode(state, parent) ?? EdgeCoords.CONTAINER;
  }
  state.edgeCoordsMap.set(element, ecm);
}

function recordGlobalCoords(state: JsonImporterState, shape: ElkShape): void {
  const parent = jsonParent(state, shape);
  const shapeA = parent === null ? null : shapeAncestor(state, parent);
  const dx = globalXOrNull(state, shapeA) ?? 0;
  const dy = globalYOrNull(state, shapeA) ?? 0;
  state.globalXMap.set(shape, shape.getX() + dx);
  state.globalYMap.set(shape, shape.getY() + dy);
}

/** The Xtend `dispatch shapeAncestor` over edge and shape. */
function shapeAncestor(state: JsonImporterState, element: ElkGraphElement): ElkGraphElement | null {
  return isElkEdge(element) ? originalParent(state, element) : element;
}

/** The Xtend `dispatch jsonParent` over node, port, edge and label; a null receiver has no parent. */
function jsonParent(state: JsonImporterState, element: ElkGraphElement): ElkGraphElement | null {
  if (isElkNode(element)) {
    return element.getParent();
  } else if (isElkPort(element)) {
    return element.getParent();
  } else if (isElkEdge(element)) {
    return originalParent(state, element);
  } else if (isElkLabel(element)) {
    return element.getParent();
  }
  throw new IllegalArgumentException(`Unhandled parameter types: [${String(element)}]`);
}

function originalParent(state: JsonImporterState, edge: ElkEdge): ElkNode | null {
  return state.edgeOriginalParentMap.get(edge) ?? null;
}

function globalXOrNull(state: JsonImporterState, shape: ElkGraphElement | null): number | undefined {
  return shape === null ? undefined : state.globalXMap.get(shape as ElkShape);
}

function globalYOrNull(state: JsonImporterState, shape: ElkGraphElement | null): number | undefined {
  return shape === null ? undefined : state.globalYMap.get(shape as ElkShape);
}

/** Java `Double globalX(ElkShape)` unboxed by the arithmetic that uses it: a missing entry is an NPE. */
function globalX(state: JsonImporterState, shape: ElkGraphElement | null): number {
  return unbox(globalXOrNull(state, shape));
}

function globalY(state: JsonImporterState, shape: ElkGraphElement | null): number {
  return unbox(globalYOrNull(state, shape));
}

function shapeCoordsMode(state: JsonImporterState, element: ElkGraphElement | null): ShapeCoords | null {
  return element === null ? null : (state.shapeCoordsMap.get(element) ?? null);
}

function edgeCoordsMode(state: JsonImporterState, element: ElkGraphElement | null): EdgeCoords | null {
  return element === null ? null : (state.edgeCoordsMap.get(element) ?? null);
}
