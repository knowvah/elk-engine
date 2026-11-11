// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import type { DCDirection } from '../graph/DCDirection.js';
import type { DCExtension } from '../graph/DCExtension.js';
import { adjustFirstSegment } from './ElkGraphTransformerGeometry.js';

// Section of `ElkGraphTransformer` (the parts of `applyLayout` and `adjustRelatedPort`), split out for the 500-line file limit and
// the function-size limits. The class keeps `applyLayout` and delegates here; statement order is the Java's. The two extension
// loops iterate the maps given (insertion order, FD4): they are the order-observable site, the first edge at a port sets its position.

/**
 * Adjusts the position of a port after compaction. Note that DisCo currently only supports the fixed side port constraint.
 *
 * @param port Port to be adjusted
 * @param edgePoint The end point of an edge (extension) connected to the port after compaction took place
 * @param dir Cardinal direction the extension is facing, which is at the same time the side of the parent node the port is placed on.
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
 */
export function adjustRelatedPort(port: ElkPort, edgePoint: KVector, dir: DCDirection): void {
  if (dir.isHorizontal()) {
    port.setY(edgePoint.y - port.getHeight() / 2);
  } else {
    // dir is vertical
    port.setX(edgePoint.x - port.getWidth() / 2);
  }
}

/**
 * The first part of `applyLayout`: adjusts the size of the layout and scales the parent's labels and ports.
 *
 * @param parent the layout node
 * @param graphDimensions the dimensions the compaction computed
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
 */
export function resizeParent(parent: ElkNode, graphDimensions: KVector): void {
  const newWidth = graphDimensions.x;
  const newHeight = graphDimensions.y;

  const oldWidth = parent.getWidth();
  const oldHeight = parent.getHeight();

  // Adjust size of layout
  parent.setDimensions(graphDimensions.x, graphDimensions.y);

  const xFactor = newWidth / oldWidth;
  const yFactor = newHeight / oldHeight;

  for (const label of parent.getLabels()) {
    label.setX(label.getX() * xFactor);
    label.setY(label.getY() * yFactor);
  }

  for (const port of parent.getPorts()) {
    const px = port.getX();
    const py = port.getY();

    if (px > 0) {
      port.setX(px * xFactor);
    }
    if (py > 0) {
      port.setY(py * yFactor);
    }
  }
}

/**
 * The loop over `incomingExtensionsMapping` of `applyLayout`.
 *
 * @param mapping the incoming extensions in iteration order
 * @param adjustedPorts the ports adjusted so far
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
 */
export function adjustIncomingExtensions(mapping: ReadonlyMap<ElkEdge, DCExtension>, adjustedPorts: ElkPort[]): void {
  for (const [edge, extension] of mapping) {
    const dir = extension.getDirection();
    const edgeSection = ElkGraphUtil.firstEdgeSection(edge, false, false);
    const newPoints = adjustFirstSegment(
      ElkGraphUtil.getSourceNode(edge)!,
      ElkUtil.createVectorChain(edgeSection),
      dir,
    );
    ElkUtil.applyVectorChain(newPoints, edgeSection);

    const portToAdjust = ElkGraphUtil.getSourcePort(edge);
    if (portToAdjust !== null && !adjustedPorts.includes(portToAdjust)) {
      adjustedPorts.push(portToAdjust);
      adjustRelatedPort(portToAdjust, newPoints.getFirst(), dir);
    }
  }
}

/**
 * The loop over `outgoingExtensionsMapping` of `applyLayout`.
 *
 * @param mapping the outgoing extensions in iteration order
 * @param adjustedPorts the ports adjusted so far
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
 */
export function adjustOutgoingExtensions(mapping: ReadonlyMap<ElkEdge, DCExtension>, adjustedPorts: ElkPort[]): void {
  for (const [edge, extension] of mapping) {
    const dir = extension.getDirection();
    const edgeSection = ElkGraphUtil.firstEdgeSection(edge, false, false);
    let newPoints = adjustFirstSegment(
      ElkGraphUtil.getTargetNode(edge)!,
      KVectorChain.reverse(ElkUtil.createVectorChain(edgeSection)),
      dir,
    );
    newPoints = KVectorChain.reverse(newPoints);
    ElkUtil.applyVectorChain(newPoints, edgeSection);

    const portToAdjust = ElkGraphUtil.getTargetPort(edge);
    if (portToAdjust !== null && !adjustedPorts.includes(portToAdjust)) {
      adjustedPorts.push(portToAdjust);
      adjustRelatedPort(portToAdjust, newPoints.getLast(), dir);
    }
  }
}
