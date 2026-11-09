// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../core/math/KVector.js';
import { KVectorChain } from '../../core/math/KVectorChain.js';
import type { LGraph } from './graph/LGraph.js';
import type { LNode } from './graph/LNode.js';

/**
 * Calculate the overall size of the given graph. Returns a `KVectorChain` with two elements where the first one
 * represents the minimal coordinates used by any node, edge or port contained in the graph and the second one
 * represents the maximal coordinates.
 *
 * @param lgraph the graph to calculate the size for.
 * @return a `KVectorChain` with two elements, the minimal and the maximal coordinates.
 * @see JsonDebugUtil.java:206
 */
export function calculateGraphSize(lgraph: LGraph): KVectorChain {
  const min = new KVector();
  const max = new KVector();
  for (const node of lgraph.getLayerlessNodes()) {
    calculateMinMaxPositions(min, max, node);
  }
  for (const layer of lgraph) {
    for (const node of layer.getNodes()) {
      calculateMinMaxPositions(min, max, node);
    }
  }
  max.x -= min.x;
  max.y -= min.y;
  return new KVectorChain(min, max);
}

/**
 * Inspects the given node, its outgoing edges and its ports for minimal and maximal coordinates and adjusts the
 * given vectors `min` and `max` if necessary.
 *
 * @param min the minimal coordinates used by the graph.
 * @param max the maximal coordinates used by the graph.
 * @param node the current node to inspect.
 * @see JsonDebugUtil.java:234
 */
function calculateMinMaxPositions(min: KVector, max: KVector, node: LNode): void {
  min.x = Math.min(min.x, node.getPosition().x - node.getMargin().left);
  max.x = Math.max(max.x, node.getPosition().x + node.getSize().x + node.getMargin().right);
  min.y = Math.min(min.y, node.getPosition().y - node.getMargin().top);
  max.y = Math.max(max.y, node.getPosition().y + node.getSize().y + node.getMargin().bottom);

  for (const port of node.getPorts()) {
    min.x = Math.min(min.x, node.getPosition().x + port.getPosition().x - port.getMargin().left);
    max.x = Math.max(max.x, node.getPosition().x + port.getPosition().x + port.getSize().x + port.getMargin().right);
    min.y = Math.min(min.y, node.getPosition().y + port.getPosition().y - port.getMargin().top);
    max.y = Math.max(max.y, node.getPosition().y + port.getPosition().y + port.getSize().y + port.getMargin().bottom);
  }

  for (const edge of node.getOutgoingEdges()) {
    for (const bendpoint of edge.getBendPoints()) {
      min.x = Math.min(min.x, bendpoint.x);
      max.x = Math.max(max.x, bendpoint.x);
      min.y = Math.min(min.y, bendpoint.y);
      max.y = Math.max(max.y, bendpoint.y);
    }
  }
}
