// SPDX-License-Identifier: EPL-2.0
import type { JsonElement } from '../../gson/JsonElement.js';
import type { JsonObject } from '../../gson/JsonObject.js';
import { HashMultimap } from '../../guava/HashMultimap.js';
import type { Multimap } from '../../guava/Multimap.js';
import { type HashStrategy, INTEGER, STRING, identity } from '../../java/util/HashStrategy.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import type { ElkNode } from '../ElkNode.js';
import type { ElkPort } from '../ElkPort.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { unbox } from './JsonAdapter.js';
import type { JsonId, JsonImporterState } from './JsonImporter.js';

const EDGES_KEY = 'edges';
const CHILDREN_KEY = 'children';
const SOURCES_KEY = 'sources';
const TARGETS_KEY = 'targets';
const SOURCE_KEY = 'source';
const TARGET_KEY = 'target';
const SOURCE_PORT_KEY = 'sourcePort';
const TARGET_PORT_KEY = 'targetPort';
const SOURCE_POINT_KEY = 'sourcePoint';
const TARGET_POINT_KEY = 'targetPoint';
const BEND_POINTS_KEY = 'bendPoints';
const SECTIONS_KEY = 'sections';
const START_POINT_KEY = 'startPoint';
const END_POINT_KEY = 'endPoint';
const INCOMING_SHAPE_KEY = 'incomingShape';
const OUTGOING_SHAPE_KEY = 'outgoingShape';
const INCOMING_SECTIONS_KEY = 'incomingSections';
const OUTGOING_SECTIONS_KEY = 'outgoingSections';
const X_KEY = 'x';
const Y_KEY = 'y';

/**
 * `String.hashCode` / `Integer.hashCode` for the `Object` json ids (the one instance, also used by `JsonImporter`:
 * its value import of this module cannot be reversed without a cycle); `equals` is false across the two types.
 */
export const ID_STRATEGY: HashStrategy<JsonId> = {
  hash: (k) => (k === null ? 0 : typeof k === 'string' ? STRING.hash(k) : INTEGER.hash(k)),
  equals: (a, b) => a === b,
};

/** The ElkGraph classes do not override `hashCode`/`equals`: identity (AD-10). */
const SECTION_STRATEGY: HashStrategy<ElkEdgeSection> = identity<ElkEdgeSection>();

/** The Xtend extension call `element.asId`: a null receiver reaches `asId`, which formats `'null'` (JsonAdapter.xtend:47). */
function asId(state: JsonImporterState, element: JsonElement | null): JsonId {
  if (element === null) {
    throw state.adapter.formatError("Id must be a string or an integer: 'null'.");
  }
  return state.adapter.asId(element);
}

/**
 * Edges and edge sections of the json to ELK graph transformation: the Xtend members `transformEdges` to
 * `fillEdgeSectionCoordinates`, as module functions over the importer state (J3).
 *
 * @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonImporter.xtend
 */
export function transformEdges(state: JsonImporterState, jsonObjA: unknown): void {
  const adapter = state.adapter;
  const jsonObj = adapter.toJsonObject(jsonObjA) as JsonObject;
  // the json object represents a node
  const node = state.nodeJsonMap.inverse().get(jsonObj);
  if (node === undefined) {
    throw adapter.formatError(`Unable to find elk node for json object '${adapter.getIdSave(jsonObj)}' Panic!`);
  }

  transformLevelEdges(state, jsonObj, node);
  transformChildEdges(state, jsonObj);
}

/** The "transform edges of the current hierarchy level" block of `transformEdges`. */
function transformLevelEdges(state: JsonImporterState, jsonObj: JsonObject, node: ElkNode): void {
  const adapter = state.adapter;
  const edges = adapter.optJSONArray(jsonObj, EDGES_KEY);
  if (edges !== null) {
    for (let i = 0; i < adapter.sizeJsonArr(edges); i++) {
      const edge = adapter.optJSONObject(edges, i) as JsonObject;
      if (adapter.hasJsonObj(edge, SOURCES_KEY) || adapter.hasJsonObj(edge, TARGETS_KEY)) {
        transformEdge(state, edge, node);
      } else {
        transformPrimitiveEdge(state, edge, node);
      }
      ElkGraphUtil.updateContainment(state.edgeIdMap.get(adapter.getId(edge)) ?? null);
    }
  }
}

/** The "transform the edges of all child nodes" block of `transformEdges`. */
function transformChildEdges(state: JsonImporterState, jsonObj: JsonObject): void {
  const adapter = state.adapter;
  const children = adapter.optJSONArray(jsonObj, CHILDREN_KEY);
  if (children !== null) {
    for (let i = 0; i < adapter.sizeJsonArr(children); i++) {
      const child = adapter.optJSONObject(children, i);
      if (child !== null) transformEdges(state, child);
    }
  }
}

function transformPrimitiveEdge(state: JsonImporterState, jsonObjA: unknown, parent: ElkNode): void {
  const adapter = state.adapter;
  const jsonObj = adapter.toJsonObject(jsonObjA) as JsonObject;
  // Create ElkEdge
  const edge = state.registerEdge(ElkGraphUtil.createEdge(parent), jsonObj);
  edge.setIdentifier(adapter.getIdSave(jsonObj));

  // source
  const srcNode = state.nodeIdMap.get(asId(state, adapter.getJsonObj(jsonObj, SOURCE_KEY)));
  const srcPort = state.portIdMap.get(optId(state, jsonObj, SOURCE_PORT_KEY)); // may be undefined (null in Java)

  if (srcNode === undefined) {
    throw adapter.formatError(`An edge must have a source node (edge id: '${adapter.getId(jsonObj)}').`);
  }
  checkPortParent(state, srcPort, srcNode, 'source', jsonObj);
  edge.getSources().add(srcPort ?? srcNode);

  // target
  const tgtNode = state.nodeIdMap.get(asId(state, adapter.getJsonObj(jsonObj, TARGET_KEY)));
  const tgtPort = state.portIdMap.get(optId(state, jsonObj, TARGET_PORT_KEY)); // may be undefined (null in Java)

  if (tgtNode === undefined) {
    throw adapter.formatError(`An edge must have a target node (edge id: '${adapter.getId(jsonObj)}').`);
  }
  checkPortParent(state, tgtPort, tgtNode, 'target', jsonObj);
  edge.getTargets().add(tgtPort ?? tgtNode);

  // check if ok
  checkSourcesAndTargets(state, edge, jsonObj);

  state.transformProperties(jsonObj, edge);
  transformPrimitiveEdgeLayout(state, jsonObj, edge);
  state.transformLabels(jsonObj, edge);
}

/** The Xtend `jsonObj.getJsonObj(key)?.asId`: null when the key is absent. */
function optId(state: JsonImporterState, jsonObj: JsonObject, key: string): JsonId {
  const element = state.adapter.getJsonObj(jsonObj, key);
  return element === null ? null : state.adapter.asId(element);
}

/** The `srcPort !== null && srcPort.parent != srcNode` check (and its target twin) of `transformPrimitiveEdge`. */
function checkPortParent(
  state: JsonImporterState,
  port: ElkPort | undefined,
  node: ElkNode,
  side: 'source' | 'target',
  jsonObj: JsonObject,
): void {
  if (port !== undefined && port.getParent() !== node) {
    throw state.adapter.formatError(
      `The ${side} port of an edge must be a port of the edge's ${side} node (edge id: '${state.adapter.getIdSave(jsonObj)}').`,
    );
  }
}

/** The `edge.sources.empty || edge.targets.empty` check shared by both edge flavours. */
function checkSourcesAndTargets(state: JsonImporterState, edge: ElkEdge, jsonObj: JsonObject): void {
  if (edge.getSources().isEmpty() || edge.getTargets().isEmpty()) {
    throw state.adapter.formatError(
      `An edge must have at least one source and one target (edge id: '${state.adapter.getIdSave(jsonObj)}').`,
    );
  }
}

function transformPrimitiveEdgeLayout(state: JsonImporterState, jsonObjA: unknown, edge: ElkEdge): void {
  const adapter = state.adapter;
  const jsonObj = adapter.toJsonObject(jsonObjA) as JsonObject;

  // if there's any edge route information available, turn it into an ElkSection
  if (
    adapter.hasJsonObj(jsonObj, SOURCE_POINT_KEY) ||
    adapter.hasJsonObj(jsonObj, TARGET_POINT_KEY) ||
    adapter.hasJsonObj(jsonObj, BEND_POINTS_KEY)
  ) {
    const section = ElkGraphUtil.createEdgeSection(edge);
    // src
    const srcPnt = adapter.optJSONObject(jsonObj, SOURCE_POINT_KEY);
    if (srcPnt !== null) {
      section.setStartX(unbox(adapter.optDouble(srcPnt, X_KEY)));
      section.setStartY(unbox(adapter.optDouble(srcPnt, Y_KEY)));
    }

    // tgt
    const tgtPnt = adapter.optJSONObject(jsonObj, TARGET_POINT_KEY);
    if (tgtPnt !== null) {
      section.setEndX(unbox(adapter.optDouble(tgtPnt, X_KEY)));
      section.setEndY(unbox(adapter.optDouble(tgtPnt, Y_KEY)));
    }

    // bend points
    createBendPoints(state, jsonObj, section);
  }
}

/** The `bendPoints` loop shared by `transformPrimitiveEdgeLayout` and `fillEdgeSectionCoordinates`. */
function createBendPoints(state: JsonImporterState, jsonObj: JsonObject, section: ElkEdgeSection): void {
  const adapter = state.adapter;
  const bendPoints = adapter.optJSONArray(jsonObj, BEND_POINTS_KEY);
  if (bendPoints !== null) {
    for (let i = 0; i < adapter.sizeJsonArr(bendPoints); i++) {
      const bendPoint = adapter.optJSONObject(bendPoints, i) as JsonObject;
      ElkGraphUtil.createBendPoint(
        section,
        unbox(adapter.optDouble(bendPoint, X_KEY)),
        unbox(adapter.optDouble(bendPoint, Y_KEY)),
      );
    }
  }
}

function transformEdge(state: JsonImporterState, jsonObjA: unknown, parent: ElkNode): void {
  const adapter = state.adapter;
  const jsonObj = adapter.toJsonObject(jsonObjA) as JsonObject;
  // Create ElkEdge
  const edge = state.registerEdge(ElkGraphUtil.createEdge(parent), jsonObj);
  edge.setIdentifier(adapter.getIdSave(jsonObj));

  // sources
  const sources = adapter.optJSONArray(jsonObj, SOURCES_KEY);
  if (sources !== null) {
    for (let i = 0; i < adapter.sizeJsonArr(sources); i++) {
      const sourceElement = state.shapeById(adapter.asId(adapter.getJsonArr(sources, i)));
      if ((sourceElement as ElkNode | ElkPort | null) !== null) {
        edge.getSources().add(sourceElement);
      }
    }
  }

  // targets
  const targets = adapter.optJSONArray(jsonObj, TARGETS_KEY);
  if (targets !== null) {
    for (let i = 0; i < adapter.sizeJsonArr(targets); i++) {
      const targetElement = state.shapeById(adapter.asId(adapter.getJsonArr(targets, i)));
      if ((targetElement as ElkNode | ElkPort | null) !== null) {
        edge.getTargets().add(targetElement);
      }
    }
  }

  // check if ok
  checkSourcesAndTargets(state, edge, jsonObj);

  // transform things
  state.transformProperties(jsonObj, edge);
  transformEdgeSections(state, jsonObj, edge);
  state.transformLabels(jsonObj, edge);
}

function transformEdgeSections(state: JsonImporterState, jsonObjA: unknown, edge: ElkEdge): void {
  const adapter = state.adapter;
  const jsonObj = adapter.toJsonObject(jsonObjA) as JsonObject;
  // While iterating over the edge's edge sections, we remember identifiers of the section's incoming and
  // outgoing edge sections. Those references, along with one special case for incoming and outgoing shapes,
  // are resolved later, after all sections have been transformed
  const incomingSectionIdentifiers = HashMultimap.create<ElkEdgeSection, JsonId>(SECTION_STRATEGY, ID_STRATEGY);
  const outgoingSectionIdentifiers = HashMultimap.create<ElkEdgeSection, JsonId>(SECTION_STRATEGY, ID_STRATEGY);

  const sections = adapter.optJSONArray(jsonObj, SECTIONS_KEY);
  if (sections !== null) {
    for (let i = 0; i < adapter.sizeJsonArr(sections); i++) {
      const jsonSection = adapter.optJSONObject(sections, i) as JsonObject;
      transformEdgeSection(state, jsonSection, edge, incomingSectionIdentifiers, outgoingSectionIdentifiers);
    }
  }

  // Fill in references to incoming and outgoing sections
  for (const section of incomingSectionIdentifiers.keySet()) {
    for (const id of incomingSectionIdentifiers.get(section)) {
      section.getIncomingSections().add(referencedSection(state, id, jsonObj));
    }
  }

  for (const section of outgoingSectionIdentifiers.keySet()) {
    for (const id of outgoingSectionIdentifiers.get(section)) {
      section.getOutgoingSections().add(referencedSection(state, id, jsonObj));
    }
  }

  linkSingleSectionShapes(edge);
}

/** The body of the `sections.optJSONObject(i) => [ jsonSection | ... ]` loop of `transformEdgeSections`. */
function transformEdgeSection(
  state: JsonImporterState,
  jsonSection: JsonObject,
  edge: ElkEdge,
  incomingSectionIdentifiers: Multimap<ElkEdgeSection, JsonId>,
  outgoingSectionIdentifiers: Multimap<ElkEdgeSection, JsonId>,
): void {
  const adapter = state.adapter;
  const elkSection = state.registerEdgeSection(ElkGraphUtil.createEdgeSection(edge), jsonSection);
  elkSection.setIdentifier(adapter.getIdSave(jsonSection));

  fillEdgeSectionCoordinates(state, jsonSection, elkSection);

  // Incoming and Outgoing shapes
  const incomingShapeId = adapter.optString(jsonSection, INCOMING_SHAPE_KEY);
  if (incomingShapeId !== null) {
    elkSection.setIncomingShape(state.shapeById(incomingShapeId));
  }

  const outgoingShapeId = adapter.optString(jsonSection, OUTGOING_SHAPE_KEY);
  if (outgoingShapeId !== null) {
    elkSection.setOutgoingShape(state.shapeById(outgoingShapeId));
  }

  // References to incoming and outgoing sections
  collectSectionIds(state, jsonSection, INCOMING_SECTIONS_KEY, elkSection, incomingSectionIdentifiers);
  collectSectionIds(state, jsonSection, OUTGOING_SECTIONS_KEY, elkSection, outgoingSectionIdentifiers);
}

/** The `incomingSections` / `outgoingSections` collection blocks of `transformEdgeSections`. */
function collectSectionIds(
  state: JsonImporterState,
  jsonSection: JsonObject,
  key: string,
  elkSection: ElkEdgeSection,
  identifiers: Multimap<ElkEdgeSection, JsonId>,
): void {
  const adapter = state.adapter;
  const jsonSectionIds = adapter.optJSONArray(jsonSection, key);
  if (jsonSectionIds !== null) {
    for (let j = 0; j < adapter.sizeJsonArr(jsonSectionIds); j++) {
      identifiers.put(elkSection, adapter.asId(adapter.getJsonArr(jsonSectionIds, j)));
    }
  }
}

/** The `edgeSectionIdMap.get(id)` lookup of both reference loops: only sections registered so far resolve. */
function referencedSection(state: JsonImporterState, id: JsonId, jsonObj: JsonObject): ElkEdgeSection {
  const referenced = state.edgeSectionIdMap.get(id);
  if (referenced === undefined) {
    throw state.adapter.formatError(
      `Referenced edge section does not exist: ${id} (edge id: '${state.adapter.getIdSave(jsonObj)}').`,
    );
  }
  return referenced;
}

/**
 * Special case: if the edge has only a single source, a single target, and a single edge section which has
 * no incoming and outgoing shapes, set the incoming and outgoing shape to the source and target of the edge,
 * respectively
 */
function linkSingleSectionShapes(edge: ElkEdge): void {
  if (edge.isConnected() && !edge.isHyperedge() && edge.getSections().size() === 1) {
    const section = edge.getSections().get(0);
    if (section.getIncomingShape() === null && section.getOutgoingShape() === null) {
      section.setIncomingShape(edge.getSources().get(0));
      section.setOutgoingShape(edge.getTargets().get(0));
    }
  }
}

function fillEdgeSectionCoordinates(state: JsonImporterState, jsonObjA: unknown, section: ElkEdgeSection): void {
  const adapter = state.adapter;
  const jsonObj = adapter.toJsonObject(jsonObjA) as JsonObject;
  const startPoint = adapter.optJSONObject(jsonObj, START_POINT_KEY);
  if (startPoint !== null) {
    section.setStartX(unbox(adapter.optDouble(startPoint, X_KEY)));
    section.setStartY(unbox(adapter.optDouble(startPoint, Y_KEY)));
  } else {
    throw adapter.formatError('All edge sections need a start point.');
  }

  const endPoint = adapter.optJSONObject(jsonObj, END_POINT_KEY);
  if (endPoint !== null) {
    section.setEndX(unbox(adapter.optDouble(endPoint, X_KEY)));
    section.setEndY(unbox(adapter.optDouble(endPoint, Y_KEY)));
  } else {
    throw adapter.formatError('All edge sections need an end point.');
  }

  createBendPoints(state, jsonObj, section);
}
