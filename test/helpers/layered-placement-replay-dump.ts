// SPDX-License-Identifier: EPL-2.0
// The placement dump of mission 7d (N3): the 7c order dump plus `geometry`. Nodes are those of the order dump's `ports`
// member (layerless, layers in order, hidden, then baseline nodes not met). `ports` and `labels` are always computed;
// the comparison decides whether the expected side asks for them. Paths are the 7a positional paths remembered at
// import (`new/p<k>` for ports first met later; a label first met later is named by the context's own scheme).
// Margins are (top, right, bottom, left), the field order of ElkMargin (src/core/math/ElkMargin.ts:18).
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LLabel } from '../../src/alg/layered/graph/LLabel.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { encodeHex, type HexPair, type HexQuad, type LGraphDump } from './layered-framework-replay.js';
import { orderDump } from './layered-order-replay-dump.js';
import { contextOf } from './layered-phase-replay-dump.js';
import type {
  NodeGeometry,
  PlacementExpected,
  PlacementGeometry,
  PositionGeometry,
} from './layered-placement-replay-rows.js';

type Vector = { readonly x: number; readonly y: number };
type Margin = { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };

const pairOf = (v: Vector): HexPair => [encodeHex(v.x), encodeHex(v.y)];
const quadOf = (m: Margin): HexQuad => [encodeHex(m.top), encodeHex(m.right), encodeHex(m.bottom), encodeHex(m.left)];
const positionOf = (shape: { getPosition(): Vector }): PositionGeometry => ({ pos: pairOf(shape.getPosition()) });

type Entries<T> = Record<string, T>;

function nodeGeometry(node: LNode): NodeGeometry {
  return { pos: pairOf(node.getPosition()), size: pairOf(node.getSize()), margin: quadOf(node.getMargin()) };
}

function portGeometry(graph: LGraph, nodes: readonly LNode[]): Entries<PositionGeometry> {
  const ctx = contextOf(graph);
  const ports: Entries<PositionGeometry> = {};
  for (const port of nodes.flatMap((node) => node.getPorts())) {
    ports[ctx.pathOf(port)] = positionOf(port);
  }
  return ports;
}

function labelGeometry(graph: LGraph, nodes: readonly LNode[]): Entries<PositionGeometry> {
  const ctx = contextOf(graph);
  const labels: Entries<PositionGeometry> = {};
  const owners = nodes.flatMap((node) => [node, ...node.getPorts()]);
  for (const label of owners.flatMap((owner) => owner.getLabels() as readonly LLabel[])) {
    labels[ctx.pathOf(label)] = positionOf(label);
  }
  return labels;
}

function geometryOf(graph: LGraph, nodePaths: readonly string[]): PlacementGeometry {
  const ctx = contextOf(graph);
  const nodes = nodePaths.map((path) => ctx.get(path) as LNode);
  return {
    nodes: Object.fromEntries(nodePaths.map((path, i) => [path, nodeGeometry(nodes[i])])),
    layers: graph.getLayers().map((layer) => pairOf(layer.getSize())),
    ports: portGeometry(graph, nodes),
    labels: labelGeometry(graph, nodes),
  };
}

/** The 7c `orderDump` of the graph's current state plus the geometry of every node, layer, port and label. */
export function placementDump(graph: LGraph, importDump: LGraphDump): PlacementExpected {
  const order = orderDump(graph, importDump);
  return { ...order, geometry: geometryOf(graph, Object.keys(order.ports)) };
}
