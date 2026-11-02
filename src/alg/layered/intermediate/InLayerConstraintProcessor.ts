// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Lists from '../../../guava/Lists.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LNode } from '../graph/LNode.js';
import { InLayerConstraint } from '../options/InLayerConstraint.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * Moves nodes with an in-layer constraint to the top or bottom of their layer.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/InLayerConstraintProcessor.java
 */
export class InLayerConstraintProcessor implements ILayoutProcessor<LGraph> {
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Layer constraint edge reversal', 1);

    // Iterate through each layer
    for (const layer of layeredGraph) {
      /* We'll go through the layer's nodes, remembering two things:
       *  1. Once we reach the first non-top-constrained node, we remember its
       *     index. Top-constrained nodes encountered afterwards must be inserted
       *     at that point.
       *  2. A list of bottom-constrained nodes we have encountered. They will
       *     afterwards be moved to the end of the list, keeping the order in
       *     which we've encountered them.
       */

      let topInsertionIndex = -1;
      const bottomConstrainedNodes: LNode[] = Lists.newArrayList();

      // Iterate through an array of its nodes
      const nodes = LGraphUtil.toNodeArray(layer.getNodes());

      for (let i = 0; i < nodes.length; i++) {
        const constraint = nodes[i].getProperty(InternalProperties.IN_LAYER_CONSTRAINT);

        if (topInsertionIndex === -1) {
          // See if this node is the first non-top-constrained node
          if (constraint !== InLayerConstraint.TOP) {
            topInsertionIndex = i;
          }
        } else if (constraint === InLayerConstraint.TOP) {
          // We have already encountered non-top-constrained nodes before: move the node to the top insertion point
          nodes[i].setLayer(null);
          nodes[i].setLayer(topInsertionIndex++, layer);
        }

        // Put BOTTOM-constrained nodes into the corresponding list
        if (constraint === InLayerConstraint.BOTTOM) {
          bottomConstrainedNodes.push(nodes[i]);
        }
      }

      // Append the bottom-constrained nodes
      for (const node of bottomConstrainedNodes) {
        node.setLayer(null);
        node.setLayer(layer);
      }
    }

    monitor.done();
  }
}
