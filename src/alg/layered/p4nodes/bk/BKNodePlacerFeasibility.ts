// SPDX-License-Identifier: EPL-2.0
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import * as JavaObjects from '../../../../java/util/JavaObjects.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import type { Layer } from '../../graph/Layer.js';
import type { BKAlignedLayout } from './BKAlignedLayout.js';

/**
 * Checks whether all nodes are placed in the correct order in their layers and do not overlap each other. Section
 * "Utility Methods" of `BKNodePlacer`, moved here for the file size limit (P1).
 *
 * @param layeredGraph the containing layered graph.
 * @param bal the layout which shall be checked.
 * @param monitor progress monitor for logging.
 * @return `true` if the order is preserved and no nodes overlap, `false` otherwise.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/BKNodePlacer.java:577
 */
export function checkOrderConstraint(
  layeredGraph: LGraph,
  bal: BKAlignedLayout,
  monitor: IElkProgressMonitor,
): boolean {
  // Flag indicating whether the layout is feasible or not
  let feasible = true;

  // Iterate over the layers
  for (const layer of layeredGraph.getLayers()) {
    feasible = checkLayer(layer, bal, monitor);

    // Don't bother continuing if we've already determined that the layout is infeasible
    if (!feasible) {
      break;
    }
  }

  if (monitor.isLoggingEnabled()) {
    monitor.log(`${bal.toString()} is feasible: ${String(feasible)}`);
  }

  return feasible;
}

/**
 * The body of the layer loop of `checkOrderConstraint` (`BKNodePlacer.java:584`), split off for the complexity limits.
 *
 * @return `false` if an overlap was found in the layer
 */
function checkLayer(layer: Layer, bal: BKAlignedLayout, monitor: IElkProgressMonitor): boolean {
  // Current Y position in the layer
  let pos = Number.NEGATIVE_INFINITY;

  // We remember the previous node for debug output
  let previous: LNode | null = null;

  // Iterate through the layer's nodes
  for (const node of layer.getNodes()) {
    // For the layout to be correct, both the node's top border and its bottom border must
    // be beyond the current position in the layer
    const top = bal.y[node.id]! + bal.innerShift[node.id]! - node.getMargin().top;
    const bottom = bal.y[node.id]! + bal.innerShift[node.id]! + node.getSize().y + node.getMargin().bottom;

    if (top > pos && bottom > pos) {
      previous = node;

      // Update the position inside the layer
      pos = bal.y[node.id]! + bal.innerShift[node.id]! + node.getSize().y + node.getMargin().bottom;
    } else {
      // We've found an overlap
      if (monitor.isLoggingEnabled()) {
        monitor.log(
          `bk node placement breaks on ${String(node)} which should have been after ${JavaObjects.toString(previous)}`,
        );
      }
      return false;
    }
  }
  return true;
}
