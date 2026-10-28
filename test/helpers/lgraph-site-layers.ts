// SPDX-License-Identifier: EPL-2.0
import { Alignment } from '../../src/core/options/Alignment.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { Layer } from '../../src/alg/layered/graph/Layer.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { addLayer, addPort, connect } from './lgraph-builders.js';

/** Layer scenarios of the oracle site rows `site/lgraphutil/layers/*`; they only wire references. */

/** A node of the given size and margin (top, right, bottom, left) in `layer`, created in `graph`. */
export function layerNode(
  graph: LGraph,
  layer: Layer,
  size: [number, number],
  margin: [number, number, number, number],
  type: NodeType = NodeType.NORMAL,
): LNode {
  const node = new LNode(graph);
  node.setLayer(layer);
  if (type !== NodeType.NORMAL) {
    node.setType(type);
  }
  node.getSize().x = size[0];
  node.getSize().y = size[1];
  node.getMargin().set(...margin);
  return node;
}

/** A layer of the given size appended to the graph. */
export function sizedLayer(graph: LGraph, width: number, height: number): Layer {
  const layer = addLayer(graph);
  layer.getSize().x = width;
  layer.getSize().y = height;
  return layer;
}

/**
 * Gives `node` one port per entry of `sides` (in this order), each connected to a fresh node outside any layer: a WEST
 * port by an incoming edge, an EAST port by an outgoing one.
 */
export function wirePorts(graph: LGraph, node: LNode, sides: readonly PortSide[]): void {
  for (const side of sides) {
    const port = addPort(node, side);
    const other = addPort(new LNode(graph));
    if (side === PortSide.WEST) {
      connect(other, port);
    } else {
      connect(port, other);
    }
  }
}

/** A node of 40x10 and the given margin and ALIGNMENT (when given) in the layer. */
export function alignedNode(
  graph: LGraph,
  layer: Layer,
  margin: [number, number, number, number],
  alignment?: Alignment,
): LNode {
  const node = layerNode(graph, layer, [40, 10], margin);
  if (alignment !== undefined) {
    node.setProperty(LayeredOptions.ALIGNMENT, alignment);
  }
  return node;
}
