// SPDX-License-Identifier: EPL-2.0
import { NodeMicroLayout } from '../common/NodeMicroLayout.js';
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { AlgorithmAssembler } from '../../core/alg/AlgorithmAssembler.js';
import type { ILayoutProcessor } from '../../core/alg/ILayoutProcessor.js';
import { LayoutProcessorConfiguration } from '../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from './InternalProperties.js';
import { CompactionStrategy } from './options/CompactionStrategy.js';
import { RadialOptions } from './options/RadialOptions.js';
import { RadialLayoutPhases } from './RadialLayoutPhases.js';
import { RadialUtil } from './RadialUtil.js';

/**
 * Layout provider to connect the radial layouter to the Eclipse based layout API.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/RadialLayoutProvider.java
 */
export class RadialLayoutProvider extends AbstractLayoutProvider {
  private readonly algorithmAssembler: AlgorithmAssembler<RadialLayoutPhases, ElkNode> = AlgorithmAssembler.create<
    RadialLayoutPhases,
    ElkNode
  >(RadialLayoutPhases);

  layout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    const algorithm = this.assembleAlgorithm(layoutGraph);

    progressMonitor.begin('Radial layout', algorithm.length);

    // if requested, compute nodes's dimensions, place node labels, ports, port labels, etc.
    if (!layoutGraph.getProperty(RadialOptions.OMIT_NODE_MICRO_LAYOUT)) {
      NodeMicroLayout.forGraph(layoutGraph).execute();
    }

    // pre calculate the root node and save it
    const root = RadialUtil.findRoot(layoutGraph);
    layoutGraph.setProperty(InternalProperties.ROOT_NODE, root);

    if (root === null) {
      throw new IllegalArgumentException('The given graph is not a tree!');
    }
    // Calculate the radius or take the one given by the user.
    let layoutRadius = layoutGraph.getProperty(RadialOptions.RADIUS);
    if (layoutRadius === 0) {
      layoutRadius = RadialUtil.findLargestNodeInGraph(layoutGraph);
    }
    layoutGraph.setProperty(RadialOptions.RADIUS, layoutRadius);

    // execute the different phases
    for (const processor of this.assembleAlgorithm(layoutGraph)) {
      processor.process(layoutGraph, progressMonitor.subTask(1)!);
    }

    progressMonitor.done();
  }

  /**
   * Configure the layout provider by assembling different layout processors.
   *
   * @param layoutGraph The graph which shall be layout.
   * @return The list of assembled layout processors.
   */
  private assembleAlgorithm(layoutGraph: ElkNode): ILayoutProcessor<ElkNode>[] {
    this.algorithmAssembler.reset();

    // Configure phases
    this.algorithmAssembler.setPhase(RadialLayoutPhases.P1_NODE_PLACEMENT, RadialLayoutPhases.P1_NODE_PLACEMENT);
    this.algorithmAssembler.setPhase(RadialLayoutPhases.P2_EDGE_ROUTING, RadialLayoutPhases.P2_EDGE_ROUTING);

    // Configure processors
    const configuration = LayoutProcessorConfiguration.create<RadialLayoutPhases, ElkNode>();
    configuration.addBefore(RadialLayoutPhases.P2_EDGE_ROUTING, IntermediateProcessorStrategy.OVERLAP_REMOVAL);

    if (layoutGraph.getProperty(RadialOptions.COMPACTOR) !== CompactionStrategy.NONE) {
      configuration.addBefore(RadialLayoutPhases.P2_EDGE_ROUTING, IntermediateProcessorStrategy.COMPACTION);
    }

    if (layoutGraph.getProperty(RadialOptions.ROTATE)) {
      configuration.addBefore(RadialLayoutPhases.P2_EDGE_ROUTING, IntermediateProcessorStrategy.ROTATION);
    }

    configuration.addBefore(RadialLayoutPhases.P2_EDGE_ROUTING, IntermediateProcessorStrategy.GRAPH_SIZE_CALCULATION);

    if (layoutGraph.getProperty(RadialOptions.ROTATION_OUTGOING_EDGE_ANGLES)) {
      configuration.addAfter(RadialLayoutPhases.P2_EDGE_ROUTING, IntermediateProcessorStrategy.OUTGOING_EDGE_ANGLES);
    }

    this.algorithmAssembler.addProcessorConfiguration(configuration);

    // Build the algorithm
    return this.algorithmAssembler.build(layoutGraph);
  }
}
