// SPDX-License-Identifier: EPL-2.0
// The routing dump of mission 7e (R3): the 7d placement dump plus `graph` (size, offset), `edges` (bend points, and
// junction points where the edge has the property) and `splines`. `edges` lists the edges of the placement dump in its
// order, so a recorded `expected.edges` and `expected.geometry.edges` stay parallel. `splines` is computed whenever an
// edge carries `SPLINE_ROUTE_START`; the comparison decides whether the expected side asks for it. The class
// `SplineSegment` is read through its Java field names (AD-11) and typed locally, so this file does not bind to the
// class's shape beyond those fields; a missing field is reported by name.
//
// Removed elements (mission 7e, N/S port dummies after NORTH_SOUTH_PORT_POSTPROCESSOR): the recorder's non-strict
// encoder has no path for an element that is neither in the import nor reachable from the graph, so it writes
// `{class: "<Java binary name>"}` for such a value and lists no `changed`, `ports` or geometry entry for the element.
// The landed 7a `Ctx.encode` auto-names it `x/n<k>` and writes `{ref}`; the 7d dump is left alone and this dump rewrites
// those refs and drops those entries (`pruned`).
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { encodeHex, type HexPair, type LGraphDump } from './layered-framework-replay.js';
import { contextOf } from './layered-phase-replay-dump.js';
import type { Ctx } from './layered-site-replay-context.js';
import { placementDump } from './layered-placement-replay-dump.js';
import type { PlacementExpected, PlacementGeometry } from './layered-placement-replay-rows.js';
import {
  IGNORED_ROUTE_START_ID,
  type EdgeRouteGeometry,
  RoutingExpected,
  RoutingGeometry,
  SegmentSummary,
  SplineGeometry,
} from './layered-routing-replay-rows.js';

type Vector = { readonly x: number; readonly y: number };
type Entries<T> = Record<string, T>;

const pairOf = (v: Vector): HexPair => [encodeHex(v.x), encodeHex(v.y)];

/** The fields of a `SplineSegment` a summary reads (SplineSegment.java:60-121), with `boundingBox` an `ElkRectangle`. */
interface SegmentFields {
  readonly boundingBox: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly rank: number;
  readonly isStraight: boolean;
  readonly xDelta: number;
  readonly isWestOfInitialLayer: boolean;
  readonly centerControlPointY: number;
}

const SEGMENT_FIELD_TYPES: Readonly<Record<keyof SegmentFields, string>> = {
  boundingBox: 'object',
  rank: 'number',
  isStraight: 'boolean',
  xDelta: 'number',
  isWestOfInitialLayer: 'boolean',
  centerControlPointY: 'number',
};

function segmentFields(value: unknown, edgePath: string): SegmentFields {
  const record = (value ?? {}) as Record<string, unknown>;
  for (const [field, type] of Object.entries(SEGMENT_FIELD_TYPES)) {
    if (typeof record[field] !== type || record[field] === null) {
      throw new Error(`spline segment of edge ${edgePath}: field ${field} is not a ${type}`);
    }
  }
  return record as unknown as SegmentFields;
}

function summariseSegment(value: unknown, edgePath: string): SegmentSummary {
  const s = segmentFields(value, edgePath);
  const box = s.boundingBox;
  return {
    box: [encodeHex(box.x), encodeHex(box.y), encodeHex(box.width), encodeHex(box.height)],
    rank: s.rank,
    isStraight: s.isStraight,
    xDelta: encodeHex(s.xDelta),
    westOfInitialLayer: s.isWestOfInitialLayer,
    centerControlPointY: encodeHex(s.centerControlPointY),
  };
}

function edgeGeometry(edge: LEdge): EdgeRouteGeometry {
  const bendPoints = edge.getBendPoints().toArray().map(pairOf);
  if (!edge.hasProperty(CoreOptions.JUNCTION_POINTS)) {
    return { bendPoints };
  }
  return { bendPoints, junctionPoints: edge.getProperty(CoreOptions.JUNCTION_POINTS).toArray().map(pairOf) };
}

function splineOf(graph: LGraph, edge: LEdge, path: string): SplineGeometry {
  const ctx = contextOf(graph);
  // The staged property types are `SplineSegment[]`/`LEdge[]`; the segment fields are read structurally.
  const route = edge.getProperty(InternalProperties.SPLINE_ROUTE_START) as unknown as readonly unknown[];
  const chain = edge.getProperty(InternalProperties.SPLINE_EDGE_CHAIN) as readonly LEdge[] | null;
  return {
    chain: (chain ?? []).map((link) => ctx.pathOf(link)),
    route: route.map((segment) => summariseSegment(segment, path)),
  };
}

function splinesOf(graph: LGraph, edges: ReadonlyMap<string, LEdge>): Entries<SplineGeometry> | undefined {
  const splines: Entries<SplineGeometry> = {};
  for (const [path, edge] of edges) {
    if (edge.hasProperty(InternalProperties.SPLINE_ROUTE_START)) {
      splines[path] = splineOf(graph, edge, path);
    }
  }
  return Object.keys(splines).length === 0 ? undefined : splines;
}

function routingGeometry(graph: LGraph, base: PlacementGeometry, edgePaths: readonly string[]): RoutingGeometry {
  const ctx = contextOf(graph);
  const edges = new Map(edgePaths.map((path) => [path, ctx.get(path) as LEdge]));
  const splines = splinesOf(graph, edges);
  return {
    ...base,
    graph: { size: pairOf(graph.getSize()), offset: pairOf(graph.getOffset()) },
    edges: Object.fromEntries([...edges].map(([path, edge]) => [path, edgeGeometry(edge)])),
    ...(splines === undefined ? {} : { splines }),
  };
}

const GRAPH_PACKAGE = 'org.eclipse.elk.alg.layered.graph.';

/** Every path the import dump names: graphs, nodes, ports, edges and their labels. */
function importPaths(dump: LGraphDump): Set<string> {
  const paths = new Set<string>();
  const add = (item: { readonly path: string; readonly labels?: readonly { readonly path: string }[] }): void => {
    paths.add(item.path);
    item.labels?.forEach((label) => paths.add(label.path));
  };
  for (const graph of dump.graphs) {
    add(graph);
    graph.edges.forEach(add);
    for (const node of graph.layerlessNodes) {
      add(node);
      node.ports.forEach(add);
    }
  }
  return paths;
}

/** The paths of the nodes the dump lists, their ports, edges and labels, plus every path of the import. */
function knownPaths(graph: LGraph, placement: PlacementExpected, importDump: LGraphDump): Set<string> {
  const ctx = contextOf(graph);
  const nodes = [...placement.layerless, ...placement.layers.flat(), ...placement.hidden].map(
    (p) => ctx.get(p) as LNode,
  );
  const edges = placement.edges.map((edge) => ctx.get(edge.path) as LEdge);
  const elements = [
    ...nodes.flatMap((node) => [node, ...node.getLabels(), ...node.getPorts().flatMap((p) => [p, ...p.getLabels()])]),
    ...edges.flatMap((edge) => [edge, ...edge.getLabels()]),
  ];
  return new Set([...importPaths(importDump), ...elements.map((element) => ctx.pathOf(element))]);
}

/** A C4 value with each `{ref}` to an element outside `known` replaced by `{class: <Java binary name>}`, at any depth. */
function withoutForeignRefs(value: unknown, known: ReadonlySet<string>, ctx: Ctx): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => withoutForeignRefs(item, known, ctx));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const ref = (value as { ref?: unknown }).ref;
  if (typeof ref === 'string' && Object.keys(value).length === 1) {
    return known.has(ref) ? value : { class: `${GRAPH_PACKAGE}${(ctx.get(ref) as object).constructor.name}` };
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withoutForeignRefs(item, known, ctx)]));
}

/** A property map without the route start, which the recorder keeps out of `changed` (`geometry.splines` holds it). */
function withoutRouteStart(props: unknown): unknown {
  return Object.fromEntries(
    Object.entries(props as Record<string, unknown>).filter(([id]) => id !== IGNORED_ROUTE_START_ID),
  );
}

function onlyKnown<T>(record: Readonly<Record<string, T>>, known: ReadonlySet<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([path]) => known.has(path)));
}

function pruned(graph: LGraph, placement: PlacementExpected, importDump: LGraphDump): PlacementExpected {
  const known = knownPaths(graph, placement, importDump);
  const ctx = contextOf(graph);
  const { geometry } = placement;
  return {
    ...placement,
    ports: onlyKnown(placement.ports, known),
    changed: placement.changed
      .filter((entry) => known.has(entry.path))
      .map(({ path, props }) => ({
        path,
        props: withoutRouteStart(withoutForeignRefs(props, known, ctx)) as typeof props,
      }))
      .filter((entry) => Object.keys(entry.props).length > 0),
    geometry: {
      ...geometry,
      nodes: onlyKnown(geometry.nodes, known),
      ...(geometry.ports === undefined ? {} : { ports: onlyKnown(geometry.ports, known) }),
      ...(geometry.labels === undefined ? {} : { labels: onlyKnown(geometry.labels, known) }),
    },
  };
}

/**
 * The 7d `placementDump` of the graph's current state, in the recorder's shape for removed elements, plus the graph
 * box, the edge routes and the splines.
 */
export function routingDump(graph: LGraph, importDump: LGraphDump): RoutingExpected {
  const placement = pruned(graph, placementDump(graph, importDump), importDump);
  const edgePaths = placement.edges.map((edge) => edge.path);
  return { ...placement, geometry: routingGeometry(graph, placement.geometry, edgePaths) };
}
