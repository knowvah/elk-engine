// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { TGraph } from '../graph/TGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * This processor should run as a post-processor after the first phase. It should run through the list of edges that
 * once destroyed the tree property and simply insert that edges directly after layouting the graph.
 *
 * @author sor
 * @author sgu
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/Untreeifyer.java
 */
export class Untreeifyer implements ILayoutProcessor<TGraph> {
  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Untreeify', 1);

    const edges = tGraph.getProperty(InternalProperties.REMOVABLE_EDGES);

    for (const tEdge of edges) {
      tEdge.getSource()!.getOutgoingEdges().add(tEdge);
      tEdge.getTarget()!.getIncomingEdges().add(tEdge);
    }

    progressMonitor.done();
  }
}
