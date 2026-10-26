// SPDX-License-Identifier: EPL-2.0
import * as Int32 from '../../../java/lang/Int32.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { Pair } from '../../../core/util/Pair.js';
import type { NEdge } from './NEdge.js';
import type { NNode } from './NNode.js';
import type { NetworkSimplexState } from './NetworkSimplexState.js';

/**
 * The minimal spans of the incoming (first) and outgoing (second) edges of `node`, or -1 where there are none.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
function minimalSpan(node: NNode): Pair<number, number> {
  let minSpanOut = JavaInteger.MAX_VALUE;
  let minSpanIn = JavaInteger.MAX_VALUE;
  let currentSpan: number;

  for (const edge of node.getConnectedEdges() as NEdge[]) {
    currentSpan = Int32.sub((edge.getTarget() as NNode).layer, (edge.getSource() as NNode).layer);
    if (edge.getTarget() === node && currentSpan < minSpanIn) {
      minSpanIn = currentSpan;
    } else if (currentSpan < minSpanOut) {
      minSpanOut = currentSpan;
    }
  }

  if (minSpanIn === JavaInteger.MAX_VALUE) {
    minSpanIn = -1;
  }
  if (minSpanOut === JavaInteger.MAX_VALUE) {
    minSpanOut = -1;
  }

  return new Pair<number, number>(minSpanIn, minSpanOut);
}

/**
 * Normalizes the layering so the lowest layer is 0; returns the number of nodes in each layer (including nodes of a
 * previous layering, if configured).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function normalize(state: NetworkSimplexState): Int32Array {
  // determine lowest assigned layer and layer count
  let highest = JavaInteger.MIN_VALUE;
  let lowest = JavaInteger.MAX_VALUE;
  for (const node of state.graph.nodes) {
    lowest = Math.min(lowest, node.layer);
    highest = Math.max(highest, node.layer);
  }
  // normalize and determine layer filling
  const filling = new Int32Array(Int32.add(Int32.sub(highest, lowest), 1));
  for (const node of state.graph.nodes) {
    node.layer = Int32.sub(node.layer, lowest);
    filling[node.layer] = (filling[node.layer] as number) + 1;
  }

  // also consider nodes of already layered connected components
  let layerID = 0;
  if (state.previousLayeringNodeCounts !== null) {
    for (const nodeCntInLayer of state.previousLayeringNodeCounts) {
      filling[layerID] = Int32.add(filling[layerID] as number, nodeCntInLayer);
      layerID++;
      if (filling.length === layerID) {
        break;
      }
    }
  }
  return filling;
}

/**
 * Balances the layering concerning its width, moving nodes to layers with fewer nodes where this keeps the layering
 * optimal.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NetworkSimplex.java
 */
export function balance(state: NetworkSimplexState, filling: Int32Array): void {
  // determine possible layers
  let newLayer: number;
  let range: Pair<number, number>;
  for (const node of state.graph.nodes) {
    if (node.getIncomingEdges().size() === node.getOutgoingEdges().size()) {
      // node might get shifted
      newLayer = node.layer;
      range = minimalSpan(node);
      for (
        let i = Int32.add(Int32.sub(node.layer, range.getFirst() as number), 1);
        i < Int32.add(node.layer, range.getSecond() as number);
        i++
      ) {
        if ((filling[i] as number) < (filling[newLayer] as number)) {
          newLayer = i;
        }
      }
      // assign new layer
      if ((filling[newLayer] as number) < (filling[node.layer] as number)) {
        filling[node.layer] = (filling[node.layer] as number) - 1;
        filling[newLayer] = (filling[newLayer] as number) + 1;
        node.layer = newLayer;
      }
    }
  }
}
