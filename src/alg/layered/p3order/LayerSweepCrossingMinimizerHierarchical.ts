// SPDX-License-Identifier: EPL-2.0
import type { PortSide } from '../../../core/options/PortSide.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import type { LNode } from '../graph/LNode.js';
import { CrossMinUtil } from './counting/CrossMinUtil.js';
import {
  dummyNodeFor,
  endIndex,
  firstIndex,
  isExternalPortDummy,
  isHierarchical,
  isOnEndOfSweepSide,
  next,
  originPort,
} from './LayerSweepCrossingMinimizerSweepHelpers.js';

/*
 * The two port-ordering methods of the hierarchical part of `LayerSweepCrossingMinimizer` (`:504-543`), as functions.
 * `sortPortsByDummyPositionsInLastLayer` is also called by the facade's `setPortOrderOnParentGraph`.
 */

/** @see LayerSweepCrossingMinimizer.java:504 */
export function sortPortsByDummyPositionsInLastLayer(
  nodeOrder: LNode[][],
  parent: LNode,
  onRightMostLayer: boolean,
): void {
  const lastLayerIndex = endIndex(onRightMostLayer, nodeOrder.length);
  const lastLayer = nodeOrder[lastLayerIndex]!;
  // Check whether the node to check is an external port dummy.
  let j = firstIndex(onRightMostLayer, lastLayer.length);
  if (!isExternalPortDummy(lastLayer[j]!)) {
    return;
  }

  const ports = parent.getPorts();
  for (let i = 0; i < ports.length; i++) {
    const port = ports[i]!;
    if (isOnEndOfSweepSide(port, onRightMostLayer) && isHierarchical(port)) {
      // Only on external port dummy node has a port as its origin.
      ports[i] = originPort(lastLayer[j]!);
      j += next(onRightMostLayer);
    }
  }
}

/** @see LayerSweepCrossingMinimizer.java:525 */
export function sortPortDummiesByPortPositions(
  parentNode: LNode,
  layerCloseToNodeEdge: LNode[],
  side: PortSide,
): LNode[] {
  const ports = CrossMinUtil.inNorthSouthEastWestOrder(parentNode, side);

  const sortedDummies = new Array<LNode>(layerCloseToNodeEdge.length);

  let i = 0;
  for (const port of ports) {
    if (isHierarchical(port)) {
      sortedDummies[i++] = dummyNodeFor(port);
    }
  }

  if (i < layerCloseToNodeEdge.length) {
    throw new IllegalStateException(
      `Expected ${String(layerCloseToNodeEdge.length)} hierarchical ports, but found only ${String(i)}.`,
    );
  }
  return sortedDummies;
}
