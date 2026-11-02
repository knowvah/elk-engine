// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../core/options/PortSide.js';
import { NodeLabelPlacement } from '../../../core/options/NodeLabelPlacement.js';
import type { LLabel } from '../graph/LLabel.js';
import type { LNode } from '../graph/LNode.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { NodeFlexibility } from '../options/NodeFlexibility.js';
import { isFlexibleNode } from './NetworkSimplexPlacerFlexibleNode.js';
import type { NetworkSimplexPlacerState } from './NetworkSimplexPlacerState.js';

/**
 * Applies the solution of the network simplex run to the node positions, sizes and (flexible nodes) port and label
 * positions.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/NetworkSimplexPlacer.java
 */
export function applyPositions(s: NetworkSimplexPlacerState): void {
  for (const l of s.lGraph!) {
    for (const lNode of l) {
      // find the node's corners
      const nodeRep = s.nodeReps![lNode.id]!;
      const minY = nodeRep.head.layer;
      const maxY = nodeRep.tail.layer;

      // set new position and size
      lNode.getPosition().y = minY;

      const sizeDelta = maxY - minY - lNode.getSize().y;

      const flexibleNode = isFlexibleNode(lNode);
      const nf = NodeFlexibility.getNodeFlexibility(lNode);

      // modify the size?
      if (flexibleNode && nf.isFlexibleSizeWhereSpacePermits()) {
        lNode.getSize().y += sizeDelta;
      }

      // reposition ports if allowed
      if (flexibleNode && nf.isFlexiblePorts()) {
        repositionPorts(s, lNode, nf, minY, sizeDelta);
      }
    }
  }
}

/**
 * The `if (flexibleNode && nf.isFlexiblePorts())` body of `applyPositions` (Java `:769-781`), split out to meet the
 * complexity limit.
 */
function repositionPorts(
  s: NetworkSimplexPlacerState,
  lNode: LNode,
  nf: NodeFlexibility,
  minY: number,
  sizeDelta: number,
): void {
  for (const p of lNode.getPorts()) {
    if (PortSide.SIDES_EAST_WEST.has(p.getSide())) {
      const nNode = s.portMap.get(p)!;
      p.getPosition().y = nNode.layer - minY;
    }
  }
  // when the node got resized, the positions of labels and south ports have to be adjusted
  for (const label of lNode.getLabels()) {
    adjustLabelPosition(lNode, label, sizeDelta);
  }
  if (nf.isFlexibleSizeWhereSpacePermits()) {
    lNode.getPortSideView(PortSide.SOUTH).forEach((p) => (p.getPosition().y += sizeDelta));
  }
}

export function adjustLabelPosition(node: LNode, label: LLabel, sizeDelta: number): void {
  const placement = node.getProperty(LayeredOptions.NODE_LABELS_PLACEMENT);
  if (placement.contains(NodeLabelPlacement.V_BOTTOM)) {
    label.getPosition().y += sizeDelta;
  } else if (placement.contains(NodeLabelPlacement.V_CENTER)) {
    label.getPosition().y += sizeDelta / 2.0;
  }
  // V_TOP placement does not require adjustment
}
