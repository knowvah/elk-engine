// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { NodeDimensionCalculation } from '../../common/nodespacing/NodeDimensionCalculation.js';
import { NodeLabelAndSizeCalculator } from '../../common/nodespacing/NodeLabelAndSizeCalculator.js';
import type { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphAdapters } from '../graph/LGraphAdapters.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Runs the node placement a second time after the first run fixed the node sizes (network simplex node
 * flexibility), recomputing port and label positions and node margins in between.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/NodePlacementRepeater.java
 */
export class NodePlacementRepeater implements ILayoutProcessor<LGraph> {
  process(graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Node placement repeater', 1);

    const nodePlacer: ILayoutPhase<LayeredPhases, LGraph> = graph
      .getProperty(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_RECOMPUTE_NODE_PLACEMENT)
      .create();
    // disable node flexibility for second node placement run
    graph.setProperty(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT, null);
    for (const layer of graph) {
      for (const node of layer.getNodes()) {
        // make sure node-level flexibility settings don't affect the second run
        node.setProperty(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY, null);
        // default node size constraints == fixed size
        node.setProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS, null);
        // reset node positions
        node.getPosition().y = 0;
      }
    }
    const adapterGraph = LGraphAdapters.adapt(graph, true, true, (node) => node.getType() === NodeType.NORMAL);
    // recompute port and label positions based on now fixed node sizes
    NodeLabelAndSizeCalculator.process(adapterGraph);
    // recalculate node margins
    NodeDimensionCalculation.calculateNodeMargins(adapterGraph);
    // second node placement run
    nodePlacer.process(graph, progressMonitor);

    progressMonitor.done();
  }
}
