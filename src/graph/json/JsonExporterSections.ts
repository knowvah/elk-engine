// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { EList } from '../../emf/common/util/EList.js';
import type { JsonObject } from '../../gson/JsonObject.js';
import type { BiMap } from '../../guava/HashBiMap.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import type { ElkConnectableShape } from '../ElkConnectableShape.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import type { ElkLabel } from '../ElkLabel.js';
import type { ElkNode } from '../ElkNode.js';
import type { IPropertyHolder } from '../properties/IPropertyHolder.js';
import type { JsonAdapter } from './JsonAdapter.js';

const LABELS_KEY = 'labels';
const X_KEY = 'x';
const Y_KEY = 'y';

/**
 * What the edge and section part of the exporter reads and calls on the `JsonExporter` that owns it (J3). Internal to
 * `graph.json`: not part of the public API.
 */
export interface ExporterState {
  readonly adapter: JsonAdapter;
  readonly nodeIdMap: BiMap<ElkConnectableShape, string>;
  readonly portIdMap: BiMap<ElkConnectableShape, string>;
  readonly nodeJsonMap: Map<ElkNode, unknown>;
  /** The live `omitLayout` configuration. */
  isOmitLayout(): boolean;
  createAndRegisterEdge(edge: ElkEdge): JsonObject;
  createAndRegisterSection(section: ElkEdgeSection): JsonObject;
  transformLabel(label: ElkLabel, array: unknown): void;
  transformProperties(holder: IPropertyHolder, parentA: unknown): void;
  idByElement(element: ElkConnectableShape | ElkEdgeSection): string | undefined;
}

/** @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonExporter.xtend `transformEdges` */
export function transformEdges(state: ExporterState, node: ElkNode): void {
  if (!node.getContainedEdges().isEmpty()) {
    const jsonObj = state.adapter.toJsonObject(state.nodeJsonMap.get(node));
    const edges = state.adapter.newJsonArray();
    state.adapter.addJsonObj(jsonObj!, 'edges', edges);
    for (const edge of node.getContainedEdges()) transformEdge(state, edge, edges);
  }

  // edges of children
  for (const child of node.getChildren()) transformEdges(state, child);
}

/** @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonExporter.xtend `transformEdge` */
function transformEdge(state: ExporterState, edge: ElkEdge, arrayA: unknown): void {
  const { adapter } = state;
  const jsonObj = state.createAndRegisterEdge(edge);
  const array = adapter.toJsonArray(arrayA);
  adapter.addJsonArr(array!, jsonObj);

  // connection points
  transformEdgeSources(state, edge, jsonObj);
  transformEdgeTargets(state, edge, jsonObj);

  // labels
  if (!edge.getLabels().isEmpty()) {
    const labels = adapter.newJsonArray();
    adapter.addJsonObj(jsonObj, LABELS_KEY, labels);
    for (const label of edge.getLabels()) state.transformLabel(label, labels);
  }

  // sections
  if (!state.isOmitLayout() && !edge.getSections().isEmpty()) {
    const sections = adapter.newJsonArray();
    adapter.addJsonObj(jsonObj, 'sections', sections);
    for (const section of edge.getSections()) transformSection(state, section, sections);
  }

  transformJunctionPoints(state, edge, jsonObj);

  // properties
  state.transformProperties(edge, jsonObj);
}

/** The `{x, y}` json object of a point (start, end, bend or junction point). */
function pointJson(adapter: JsonAdapter, x: number, y: number): JsonObject {
  const jsonPnt = adapter.newJsonObject();
  adapter.addJsonObjDouble(jsonPnt, X_KEY, x);
  adapter.addJsonObjDouble(jsonPnt, Y_KEY, y);
  return jsonPnt;
}

/** The id the exporter assigned to an edge endpoint: a port first, then a node; null when it is unknown. */
function endpointId(state: ExporterState, endpoint: ElkConnectableShape): string | null {
  let id = state.portIdMap.get(endpoint) ?? null;
  if (id === null) {
    id = state.nodeIdMap.get(endpoint) ?? null;
  }
  return id;
}

/**
 * What the Java's `source.toJson` on a null id becomes. Known divergence (user decision 2026-10-14): the oracle's Gson
 * 2.11 throws a message-less `NullPointerException` from `new JsonPrimitive(null)`; Gson 2.8.x threw a message-less
 * `IllegalArgumentException`, which is what the port throws. `JsonPrimitive` itself keeps the 2.11 behaviour.
 */
function unknownEndpoint(): IllegalArgumentException {
  return new IllegalArgumentException();
}

/** The `sources` block of `transformEdge`. */
function transformEdgeSources(state: ExporterState, edge: ElkEdge, jsonObj: JsonObject): void {
  const { adapter } = state;
  const sources = adapter.newJsonArray();
  for (const s of edge.getSources()) {
    const source = endpointId(state, s);
    if (source === null) {
      // J5: the Java does not throw (`formatError` is called without `throw`) and fails in `toJson(null)` below.
      adapter.formatError(`Unknown edge source: ${s.toString()}`);
      throw unknownEndpoint();
    }
    adapter.addJsonArr(sources, adapter.toJson(source));
  }
  adapter.addJsonObj(jsonObj, 'sources', sources);
}

/** The `targets` block of `transformEdge`. */
function transformEdgeTargets(state: ExporterState, edge: ElkEdge, jsonObj: JsonObject): void {
  const { adapter } = state;
  const targets = adapter.newJsonArray();
  for (const t of edge.getTargets()) {
    const target = endpointId(state, t);
    if (target === null) {
      // J5: as above; the Java message prints `target`, which is null here
      adapter.formatError(`Unknown edge target: ${String(target)}`);
      throw unknownEndpoint();
    }
    adapter.addJsonArr(targets, adapter.toJson(target));
  }
  adapter.addJsonObj(jsonObj, 'targets', targets);
}

/**
 * The junction points block of `transformEdge`: transfer junction points, if existent; make sure not to initialize an
 * empty set of junction points by accident (#559) when immediately using `getProperty`.
 */
function transformJunctionPoints(state: ExporterState, edge: ElkEdge, jsonObj: JsonObject): void {
  const { adapter } = state;
  if (!state.isOmitLayout() && edge.hasProperty(CoreOptions.JUNCTION_POINTS)) {
    const jps = edge.getProperty(CoreOptions.JUNCTION_POINTS);
    if (!state.isOmitLayout() && !jps.isEmpty()) {
      const jsonJPs = adapter.newJsonArray();
      for (const jp of jps) {
        adapter.addJsonArr(jsonJPs, pointJson(adapter, jp.x, jp.y));
      }
      adapter.addJsonObj(jsonObj, 'junctionPoints', jsonJPs);
    }
  }
}

/** @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonExporter.xtend `transformSection` */
function transformSection(state: ExporterState, section: ElkEdgeSection, sectionsA: unknown): void {
  const { adapter } = state;
  const jsonObj = state.createAndRegisterSection(section);
  const sections = adapter.toJsonArray(sectionsA);
  adapter.addJsonArr(sections!, jsonObj);

  // Start Point
  adapter.addJsonObj(jsonObj, 'startPoint', pointJson(adapter, section.getStartX(), section.getStartY()));

  // End Point
  adapter.addJsonObj(jsonObj, 'endPoint', pointJson(adapter, section.getEndX(), section.getEndY()));

  // Bend Points
  if (!state.isOmitLayout() && !section.getBendPoints().isEmpty()) {
    const bendPoints = adapter.newJsonArray();
    for (const pnt of section.getBendPoints()) {
      adapter.addJsonArr(bendPoints, pointJson(adapter, pnt.getX(), pnt.getY()));
    }
    adapter.addJsonObj(jsonObj, 'bendPoints', bendPoints);
  }

  transformSectionShapes(state, section, jsonObj);
  transformSectionNeighbors(state, section, jsonObj);

  state.transformProperties(section, jsonObj);
}

/** The incoming and outgoing shape blocks of `transformSection`. */
function transformSectionShapes(state: ExporterState, section: ElkEdgeSection, jsonObj: JsonObject): void {
  // Incoming shape
  const incomingShape = section.getIncomingShape();
  if (incomingShape !== null) {
    jsonObj.addProperty('incomingShape', state.idByElement(incomingShape) ?? null);
  }

  // Outgoing shape
  const outgoingShape = section.getOutgoingShape();
  if (outgoingShape !== null) {
    jsonObj.addProperty('outgoingShape', state.idByElement(outgoingShape) ?? null);
  }
}

/** The incoming and outgoing sections blocks of `transformSection`. */
function transformSectionNeighbors(state: ExporterState, section: ElkEdgeSection, jsonObj: JsonObject): void {
  transformSectionIds(state, section.getIncomingSections(), 'incomingSections', jsonObj);
  transformSectionIds(state, section.getOutgoingSections(), 'outgoingSections', jsonObj);
}

/** The ids of neighbouring sections under `key`, if there are any (the incoming and outgoing blocks are identical). */
function transformSectionIds(
  state: ExporterState,
  sections: EList<ElkEdgeSection>,
  key: string,
  jsonObj: JsonObject,
): void {
  const { adapter } = state;
  if (!sections.isEmpty()) {
    const ids = adapter.newJsonArray();
    for (const sec of sections) {
      adapter.addJsonArr(ids, adapter.toJson(state.idByElement(sec) as string));
    }
    adapter.addJsonObj(jsonObj, key, ids);
  }
}
