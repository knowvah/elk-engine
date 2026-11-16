// SPDX-License-Identifier: EPL-2.0
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import type { DCGraph } from './graph/DCGraph.js';
import { DisCoPolyominoCompactor } from './DisCoPolyominoCompactor.js';
import { CompactionStrategy } from './options/CompactionStrategy.js';
import { DisCoMetaDataProvider } from './options/DisCoMetaDataProvider.js';
import { DisCoOptions } from './options/DisCoOptions.js';
import { ElkGraphTransformer } from './transform/ElkGraphTransformer.js';

/**
 * Layout provider for the layout algorithms for positioning disconnected components relative to each other.
 *
 * The `default` arm of the strategy switch is unreachable (`CompactionStrategy` has one value); `System.out.println`
 * is `console.log`.
 *
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/DisCoLayoutProvider.java
 */
export class DisCoLayoutProvider extends AbstractLayoutProvider {
  // /////////////////////////////////////////////////////////////////////////////
  // Variables

  /** simplified version of the input graph consisting of polygons approximating the original graph's shape. */
  private result!: DCGraph;

  /** minimum spacing between each component. */
  private componentSpacing: number = 0;

  // /////////////////////////////////////////////////////////////////////////////
  // Layout

  layout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Connected Components Compaction', 1);

    this.componentSpacing = layoutGraph.getProperty(DisCoOptions.SPACING_COMPONENT_COMPONENT);

    // If desired, apply a layout algorithm to the connected components themselves
    if (layoutGraph.hasProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM)) {
      const requestedAlgorithm = layoutGraph.getProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM);
      const lad = LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(requestedAlgorithm);
      if (lad !== null) {
        const layoutProvider = lad.getInstancePool().fetch();
        layoutProvider.layout(layoutGraph, progressMonitor.subTask(1)!);
      }
    }

    // 1.) Transform given KGraph into DCGraph
    const transformer = new ElkGraphTransformer(this.componentSpacing);
    this.result = transformer.importGraph(layoutGraph);

    // 2.) Choose strategy and compact the DCGraph (only polyomino compaction at the moment)
    switch (layoutGraph.getProperty(DisCoMetaDataProvider.COMPONENT_COMPACTION_STRATEGY)) {
      // The implementation based on Freivalds et al. (2002), uses lower resolution polyominoes of the DCGraph's
      // components
      case CompactionStrategy.POLYOMINO:
        new DisCoPolyominoCompactor().compact(this.result);
        // Only for debugging purposes, see org.eclipse.elk.alg.disco.debug.views.DisCoGraphRenderer
        layoutGraph.setProperty(
          DisCoOptions.DEBUG_DISCO_POLYS,
          this.result.getProperty(DisCoOptions.DEBUG_DISCO_POLYS),
        );
        break;
      default:
        console.log('DisCo: no compaction strategy used for connected components.');
    }

    // 3.) Apply new layout to input graph
    transformer.applyLayout();

    // Only for debugging purposes, see org.eclipse.elk.alg.disco.debug.views.DisCoGraphRenderer
    layoutGraph.setProperty(DisCoOptions.DEBUG_DISCO_GRAPH, this.result);

    progressMonitor.done();
  }
}
