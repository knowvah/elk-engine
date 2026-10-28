// SPDX-License-Identifier: EPL-2.0
import type { PortSide } from '../../src/core/options/PortSide.js';
import { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import { LLabel } from '../../src/alg/layered/graph/LLabel.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';

/** Builders for structural LGraph tests: they only wire references, they compute nothing. */

/** A node of `type` (default NORMAL) appended to the graph's layerless nodes. */
export function addNode(graph: LGraph, type: NodeType = NodeType.NORMAL): LNode {
  const node = new LNode(graph);
  node.setType(type);
  graph.getLayerlessNodes().push(node);
  return node;
}

/** A port attached to `node`, with `side` set when given. */
export function addPort(node: LNode, side?: PortSide): LPort {
  const port = new LPort();
  port.setNode(node);
  if (side !== undefined) {
    port.setSide(side);
  }
  return port;
}

/** An edge from `source` to `target`. */
export function connect(source: LPort, target: LPort): LEdge {
  const edge = new LEdge();
  edge.setSource(source);
  edge.setTarget(target);
  return edge;
}

/** A new layer appended to the graph's layers. */
export function addLayer(graph: LGraph): Layer {
  const layer = new Layer(graph);
  graph.getLayers().push(layer);
  return layer;
}

/** A node with an edge-less port per given side, in the given order. */
export function nodeWithPorts(graph: LGraph, sides: readonly PortSide[]): { node: LNode; ports: LPort[] } {
  const node = addNode(graph);
  return { node, ports: sides.map((side) => addPort(node, side)) };
}

/** A label with the given text. */
export function label(text: string): LLabel {
  return new LLabel(text);
}
