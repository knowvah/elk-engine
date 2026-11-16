// SPDX-License-Identifier: EPL-2.0
import { NodeMicroLayout } from '../common/NodeMicroLayout.js';
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ComponentsProcessor } from './ComponentsProcessor.js';
import { ElkGraphImporter } from './ElkGraphImporter.js';
import type { TGraph } from './graph/TGraph.js';
import type { IGraphImporter } from './IGraphImporter.js';
import { MrTree } from './MrTree.js';
import { MrTreeOptions } from './options/MrTreeOptions.js';

/** `private final float defaultWork = 0.1f` (progress fractions are floats in the Java). */
const DEFAULT_WORK: number = Math.fround(0.1);

/**
 * Layout provider to connect the tree layouter to the Eclipse based layout services and orchestrate the pre layout
 * processing.
 *
 * @author sor
 * @author sgu
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/TreeLayoutProvider.java
 */
export class TreeLayoutProvider extends AbstractLayoutProvider {
  /** the layout algorithm used for this layout. */
  private readonly klayTree: MrTree = new MrTree();
  /** connected components processor. */
  private readonly componentsProcessor: ComponentsProcessor = new ComponentsProcessor();

  layout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    // If requested, compute nodes's dimensions, place node labels, ports, port labels, etc.
    if (!layoutGraph.getProperty(MrTreeOptions.OMIT_NODE_MICRO_LAYOUT)) {
      NodeMicroLayout.forGraph(layoutGraph).execute();
    }
    // build tGraph
    let pm: IElkProgressMonitor = progressMonitor.subTask(DEFAULT_WORK)!;
    pm.begin('build tGraph', 1);
    const graphImporter: IGraphImporter<ElkNode> = new ElkGraphImporter();
    let tGraph: TGraph = graphImporter.importGraph(layoutGraph)!;
    pm.done();

    // split the input graph into components
    pm = progressMonitor.subTask(DEFAULT_WORK)!;
    pm.begin('Split graph', 1);
    const components: TGraph[] = this.componentsProcessor.split(tGraph);
    pm.done();

    // perform the actual layout on the components
    for (const comp of components) {
      this.klayTree.doLayout(
        comp,
        progressMonitor.subTask(Math.fround(Math.fround(1.0 - Math.fround(DEFAULT_WORK * 4)) / components.length))!,
      );
    }

    // pack the components back into one graph
    pm = progressMonitor.subTask(DEFAULT_WORK)!;
    pm.begin('Pack components', 1);
    tGraph = this.componentsProcessor.pack(components);
    pm.done();

    // apply the layout results to the original graph
    pm = progressMonitor.subTask(DEFAULT_WORK)!;
    pm.begin('Apply layout results', 1);
    graphImporter.applyLayout(tGraph);
    pm.done();
  }
}
