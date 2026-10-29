// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import type { LGraph } from '../graph/LGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * Remove all edges added by the `PartitionPreprocessor`.
 *
 * Precondition: a layered graph. Postcondition: layered graph with all partition constraint edges removed. Slots:
 * before phase 3. Same-slot dependencies: `NodePromotion`, `LayerConstraintProcessor`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/PartitionPostprocessor.java
 */
export class PartitionPostprocessor implements ILayoutProcessor<LGraph> {
  /** @see PartitionPostprocessor.java:49 */
  process(lGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Partition postprocessing', 1);
    // Remove all added ports and edges.
    for (const layer of lGraph) {
      for (const node of layer) {
        const ports = new ArrayListIterator(node.getPorts());
        while (ports.hasNext()) {
          const port = ports.next();
          if (port.getProperty(InternalProperties.PARTITION_DUMMY)) {
            // Remove the port explicitly from the iterator to prevent
            // ConcurrentModificationExceptions. This removes the port from the underlying
            // collection and thus from the node's list of ports.
            ports.remove();
          }
        }
      }
    }
    monitor.done();
  }
}
