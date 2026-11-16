// SPDX-License-Identifier: EPL-2.0
import { NodeMicroLayout } from '../common/NodeMicroLayout.js';
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import * as Float32 from '../../java/lang/Float32.js';
import { Random } from '../../java/util/Random.js';
import { ComponentsProcessor } from './ComponentsProcessor.js';
import { ElkGraphImporter } from './ElkGraphImporter.js';
import type { FGraph } from './graph/FGraph.js';
import type { IGraphImporter } from './IGraphImporter.js';
import { AbstractForceModel } from './model/AbstractForceModel.js';
import { EadesModel } from './model/EadesModel.js';
import { FruchtermanReingoldModel } from './model/FruchtermanReingoldModel.js';
import { ForceModelStrategy } from './options/ForceModelStrategy.js';
import { ForceOptions } from './options/ForceOptions.js';
import { InternalProperties } from './options/InternalProperties.js';

/**
 * Layout provider for the force layout algorithms.
 *
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/ForceLayoutProvider.java
 */
export class ForceLayoutProvider extends AbstractLayoutProvider {
  /** the force model used by this layout algorithm. */
  private forceModel: AbstractForceModel | null = null;
  /** connected components processor. */
  private readonly componentsProcessor: ComponentsProcessor = new ComponentsProcessor();

  layout(elkGraph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('ELK Force', 1);

    // if requested, compute nodes's dimensions, place node labels, ports, port labels, etc.
    if (!elkGraph.getProperty(ForceOptions.OMIT_NODE_MICRO_LAYOUT)) {
      NodeMicroLayout.forGraph(elkGraph).execute();
    }

    // transform the input graph
    const graphImporter: IGraphImporter<ElkNode> = new ElkGraphImporter();
    let fgraph: FGraph = graphImporter.importGraph(elkGraph)!;

    // set special properties for the layered graph
    this.setOptions(fgraph, elkGraph);

    // update the force model depending on user selection
    this.updateModel(fgraph.getProperty(ForceOptions.MODEL));

    // split the input graph into components
    const components: FGraph[] = this.componentsProcessor.split(fgraph);

    // perform the actual layout
    for (const comp of components) {
      // updateModel always leaves a model for the two strategies
      this.forceModel!.layout(comp, progressMonitor.subTask(Float32.div(1.0, components.length))!);
    }

    // pack the components back into one graph
    fgraph = this.componentsProcessor.recombine(components);

    // apply the layout results to the original graph
    graphImporter.applyLayout(fgraph);

    progressMonitor.done();
  }

  /**
   * Set special layout options for the force graph.
   *
   * @param fgraph a new force graph
   * @param parent the original parent node
   */
  private setOptions(fgraph: FGraph, _parent: ElkNode): void {
    // set the random number generator based on the random seed option
    const randomSeed: number | null = fgraph.getProperty(ForceOptions.RANDOM_SEED);
    if (randomSeed !== null) {
      const val: number = randomSeed;
      if (val === 0) {
        fgraph.setProperty(InternalProperties.RANDOM, new Random());
      } else {
        fgraph.setProperty(InternalProperties.RANDOM, new Random(val));
      }
    } else {
      fgraph.setProperty(InternalProperties.RANDOM, new Random(1));
    }
  }

  /**
   * Update the force model depending on the chosen strategy.
   *
   * @param strategy a force model strategy
   */
  private updateModel(strategy: ForceModelStrategy): void {
    switch (strategy) {
      case ForceModelStrategy.EADES:
        if (!(this.forceModel instanceof EadesModel)) {
          this.forceModel = new EadesModel();
        }
        break;
      case ForceModelStrategy.FRUCHTERMAN_REINGOLD:
        if (!(this.forceModel instanceof FruchtermanReingoldModel)) {
          this.forceModel = new FruchtermanReingoldModel();
        }
        break;
    }
  }
}
