// SPDX-License-Identifier: EPL-2.0
import { NodeMicroLayout } from '../../common/NodeMicroLayout.js';
import { AbstractLayoutProvider } from '../../../core/AbstractLayoutProvider.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ComponentsProcessor } from '../ComponentsProcessor.js';
import { ElkGraphImporter } from '../ElkGraphImporter.js';
import { ForceLayoutProvider } from '../ForceLayoutProvider.js';
import type { FGraph } from '../graph/FGraph.js';
import type { IGraphImporter } from '../IGraphImporter.js';
import { StressOptions } from '../options/StressOptions.js';
import { StressMajorization } from './StressMajorization.js';

/**
 * Layout provider for stress-minimizing layouts.
 *
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/stress/StressLayoutProvider.java
 */
export class StressLayoutProvider extends AbstractLayoutProvider {
  /** connected components processor. */
  private readonly componentsProcessor: ComponentsProcessor = new ComponentsProcessor();
  /** implementation of stress majorization. */
  private readonly stressMajorization: StressMajorization = new StressMajorization();

  layout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('ELK Stress', 1);

    // calculate initial coordinates
    if (!layoutGraph.getProperty(StressOptions.INTERACTIVE)) {
      new ForceLayoutProvider().layout(layoutGraph, progressMonitor.subTask(1)!);
    } else {
      // If requested, compute nodes's dimensions, place node labels, ports, port labels, etc.
      // Note that for the non-interactive case (above) this will be taken care of by the force layout provider
      if (!layoutGraph.getProperty(StressOptions.OMIT_NODE_MICRO_LAYOUT)) {
        NodeMicroLayout.forGraph(layoutGraph).execute();
      }
    }

    // transform the input graph
    const graphImporter: IGraphImporter<ElkNode> = new ElkGraphImporter();
    let fgraph: FGraph = graphImporter.importGraph(layoutGraph)!;

    // split the input graph into components
    const components: FGraph[] = this.componentsProcessor.split(fgraph);

    // perform the actual layout
    for (const subGraph of components) {
      if (subGraph.getNodes().length <= 1) {
        continue;
      }
      this.stressMajorization.initialize(subGraph);
      this.stressMajorization.execute();

      // Note that contrary to force itself, labels are not considered during stress layout.
      // Hence, all we can do here is to place the labels at reasonable positions after layout has finished.
      subGraph.getLabels().forEach((label) => {
        label.refreshPosition();
      });
    }

    // pack the components back into one graph
    fgraph = this.componentsProcessor.recombine(components);

    // apply the layout results to the original graph
    graphImporter.applyLayout(fgraph);

    progressMonitor.done();
  }
}
