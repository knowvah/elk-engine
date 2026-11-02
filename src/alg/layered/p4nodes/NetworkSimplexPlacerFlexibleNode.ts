// SPDX-License-Identifier: EPL-2.0
import { ElkMargin } from '../../../core/math/ElkMargin.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { NodeFlexibility } from '../options/NodeFlexibility.js';
import { Spacings } from '../options/Spacings.js';

/**
 * Whether one side's ports fit the node's height (the `west`/`east` checks of `isFlexibleNode`, Java `:1103-1123`).
 * Split out to meet the complexity limit.
 */
function sideFitsHeight(lNode: LNode, side: PortSide, additionalPortSpacing: ElkMargin, portSpacing: number): boolean {
  const sidePorts = lNode.getPortSideView(side);
  const requiredHeight =
    additionalPortSpacing.top + additionalPortSpacing.bottom + (sidePorts.length - 1) * portSpacing;
  return !(requiredHeight > lNode.getSize().y);
}

/**
 * The size check of `isFlexibleNode`: if we cannot resize the node, and the given height is not enough to properly
 * accommodate all ports, the existing port positions are reused (Java `:1099-1127`).
 */
function portsFitFixedSize(lNode: LNode): boolean {
  const portSpacing = Spacings.getIndividualOrDefault(lNode, LayeredOptions.SPACING_PORT_PORT);
  let additionalPortSpacing: ElkMargin | null = lNode.getProperty(LayeredOptions.SPACING_PORTS_SURROUNDING);
  if (additionalPortSpacing === null) {
    additionalPortSpacing = new ElkMargin(portSpacing, portSpacing, portSpacing, portSpacing);
  }

  // check west side
  if (!sideFitsHeight(lNode, PortSide.WEST, additionalPortSpacing, portSpacing)) {
    return false;
  }

  // check east side
  return sideFitsHeight(lNode, PortSide.EAST, additionalPortSpacing, portSpacing);
}

/**
 * A node is _flexible_ if its port constraints are not `FIXED_POS`, and the node's height is large enough to give the
 * ports on both sides (WEST and EAST) enough room to potentially alter their position.
 *
 * The rationale for the latter case is the following: if the height of a node is not enough to accommodate all ports
 * and we are not allowed to change the node's size, we simply use the port positions that have been computed by the
 * `LabelAndNodeSizeProcessor`. The processor is able to handle this situation properly.
 *
 * @param lNode a node
 * @return whether the node is regarded flexible.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/NetworkSimplexPlacer.java
 */
export function isFlexibleNode(lNode: LNode): boolean {
  // dummies are not flexible!
  if (lNode.getType() !== NodeType.NORMAL) {
    return false;
  }

  // at least two ports are required ...
  if (lNode.getPorts().length <= 1) {
    return false;
  }

  // if ports may not be moved there's no use in enlarging the node
  const pc = lNode.getProperty(LayeredOptions.PORT_CONSTRAINTS);
  if (pc.isPosFixed()) {
    return false;
  }

  const nf = NodeFlexibility.getNodeFlexibility(lNode);
  if (nf === NodeFlexibility.NONE) {
    return false;
  }

  // if we cannot resize the node, and the given height is not enough to properly accommodate
  // all ports, reuse the existing port positions
  if (!nf.isFlexibleSizeWhereSpacePermits()) {
    // we are not allowed to increase the node's size
    return portsFitFixedSize(lNode);
  }
  return true;
}
