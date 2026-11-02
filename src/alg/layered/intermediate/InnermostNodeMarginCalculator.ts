// SPDX-License-Identifier: EPL-2.0
import { NodeDimensionCalculation } from '../../common/nodespacing/NodeDimensionCalculation.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphAdapters } from '../graph/LGraphAdapters.js';

/**
 * Calculates the margins of the nodes of the graph (excluding the space self loops and comment boxes need, which later
 * processors add).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/InnermostNodeMarginCalculator.java
 */
export class InnermostNodeMarginCalculator implements ILayoutProcessor<LGraph> {
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Node margin calculation', 1);

    // Calculate the margins using ELK's utility methods. What is not included in the margins yet are is space
    // required for self loops and comment boxes. We will deal with all of those later.
    NodeDimensionCalculation.getNodeMarginCalculator(LGraphAdapters.adapt(layeredGraph, false))
      .excludeEdgeHeadTailLabels()
      .process();

    monitor.done();
  }
}
