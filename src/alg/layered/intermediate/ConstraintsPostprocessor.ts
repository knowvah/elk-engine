// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { DebugUtil } from '../DebugUtil.js';
import type { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Sets the layer id and the position id of every normal node from the final layer structure, for the interactive and
 * the `generatePositionAndLayerIds` use. Slot: after phase 5.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/ConstraintsPostprocessor.java
 */
export class ConstraintsPostprocessor implements ILayoutProcessor<LGraph> {
  /** @see ConstraintsPostprocessor.java:34 */
  process(graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Constraints Postprocessor', 1);
    // elkjs-exclude-start
    if (progressMonitor.isLoggingEnabled()) {
      DebugUtil.logDebugGraphSlot(progressMonitor, graph, 0, 'ConstraintPostProcessor');
    }
    // elkjs-exclude-end
    // Uses for each loops since they should be more efficient because LinkedLists are accessed.
    // It still creates counter variables so that no getter calls on layer and node are needed.
    let layerIndex = 0;

    for (const layer of graph.getLayers()) {
      let posIndex = 0;

      let nodeLayer = false;
      for (const currentNode of layer.getNodes()) {
        if (currentNode.getType() === NodeType.NORMAL) {
          nodeLayer = true;
          currentNode.setProperty(LayeredOptions.LAYERING_LAYER_ID, layerIndex);
          currentNode.setProperty(LayeredOptions.CROSSING_MINIMIZATION_POSITION_ID, posIndex);
          posIndex++;
        }
      }
      // layers with no nodes in it should not increase the layer id
      if (nodeLayer) {
        layerIndex++;
      }
    }
    // elkjs-exclude-start
    if (progressMonitor.isLoggingEnabled()) {
      DebugUtil.logDebugGraphSlot(progressMonitor, graph, 0, 'ConstraintPostProcessor');
    }
    // elkjs-exclude-end
    progressMonitor.done();
  }
}
