// SPDX-License-Identifier: EPL-2.0
import { AlgorithmAssembler } from '../../core/alg/AlgorithmAssembler.js';
import type { ILayoutProcessor } from '../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { Graph } from './graph/Graph.js';
import { StructureExtractionStrategy } from './options/StructureExtractionStrategy.js';
import { SPOrEPhases } from './SPOrEPhases.js';

/**
 * Compacts a graph by shrinking a tree.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/ShrinkTree.java
 */
export class ShrinkTree {
  private readonly algorithmAssembler: AlgorithmAssembler<SPOrEPhases, Graph> = AlgorithmAssembler.create<
    SPOrEPhases,
    Graph
  >(SPOrEPhases);
  private algorithm: ILayoutProcessor<Graph>[] = [];

  /**
   * Executes the phases of compaction by shrinking a tree.
   *
   * @param graph the graph to compact
   * @param progressMonitor a progress monitor
   * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/ShrinkTree.java:51
   */
  shrink(graph: Graph, progressMonitor: IElkProgressMonitor): void {
    // assembling the algorithm
    this.algorithmAssembler.reset();
    this.algorithmAssembler.setPhase(SPOrEPhases.P1_STRUCTURE, StructureExtractionStrategy.DELAUNAY_TRIANGULATION);
    this.algorithmAssembler.setPhase(SPOrEPhases.P2_PROCESSING_ORDER, graph.treeConstructionStrategy);
    this.algorithmAssembler.setPhase(SPOrEPhases.P3_EXECUTION, graph.compactionStrategy);
    this.algorithm = this.algorithmAssembler.build(graph);
    // ------------------------

    progressMonitor.begin('Compaction by shrinking a tree', this.algorithm.length);

    // only compact if there's more than one element to avoid lack of compaction edges and root node
    if (graph.vertices.length > 1) {
      for (const processor of this.algorithm) {
        processor.process(graph, progressMonitor.subTask(1)!);
      }
    }

    progressMonitor.done();
  }
}
