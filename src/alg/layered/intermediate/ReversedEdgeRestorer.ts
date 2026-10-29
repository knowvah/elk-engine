// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LGraph } from '../graph/LGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * Restores the direction of reversed edges (edges with the property `LayeredOptions.REVERSED` set to `true`).
 *
 * All edges are traversed to look for reversed edges. If such edges are found, they are restored, the ports they are
 * connected to being restored as well.
 *
 * Precondition: a layered graph. Postcondition: reversed edges are restored to their original direction. Slots: after
 * phase 5. Same-slot dependencies: none.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/ReversedEdgeRestorer.java
 */
export class ReversedEdgeRestorer implements ILayoutProcessor<LGraph> {
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Restoring reversed edges', 1);

    // Iterate through the layers
    for (const layer of layeredGraph) {
      // Iterate through the nodes
      for (const node of layer) {
        // Iterate over all the ports, looking for outgoing edges that should be reversed
        for (const port of node.getPorts()) {
          // Iterate over a copy of the edges to avoid concurrent modification exceptions
          const edgeArray = LGraphUtil.toEdgeArray(port.getOutgoingEdges());

          for (const edge of edgeArray) {
            if (edge.getProperty(InternalProperties.REVERSED)) {
              edge.reverse(layeredGraph, false);
            }
          }
        }
      }
    }

    monitor.done();
  }
}
