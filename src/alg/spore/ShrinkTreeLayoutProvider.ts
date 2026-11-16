// SPDX-License-Identifier: EPL-2.0
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphImporter } from './ElkGraphImporter.js';
import type { IGraphImporter } from './IGraphImporter.js';
import { SporeCompactionOptions } from './options/SporeCompactionOptions.js';
import { ShrinkTree } from './ShrinkTree.js';

/**
 * Layout provider to connect the compaction algorithm to the Eclipse based layout API.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/ShrinkTreeLayoutProvider.java
 */
export class ShrinkTreeLayoutProvider extends AbstractLayoutProvider {
  /** the compaction algorithm. */
  private readonly shrinktree: ShrinkTree = new ShrinkTree();

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/ShrinkTreeLayoutProvider.java:34 */
  layout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    // If desired, apply a layout algorithm
    if (layoutGraph.hasProperty(SporeCompactionOptions.UNDERLYING_LAYOUT_ALGORITHM)) {
      const requestedAlgorithm = layoutGraph.getProperty(SporeCompactionOptions.UNDERLYING_LAYOUT_ALGORITHM);
      const lad = LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(requestedAlgorithm);
      if (lad !== null) {
        const layoutProvider = lad.getInstancePool().fetch();
        layoutProvider.layout(layoutGraph, progressMonitor.subTask(1)!);
      }
    }

    const graphImporter: IGraphImporter<ElkNode> = new ElkGraphImporter();
    const graph = graphImporter.importGraph(layoutGraph);

    this.shrinktree.shrink(graph, progressMonitor.subTask(1)!);

    graphImporter.applyPositions(graph);
  }
}
