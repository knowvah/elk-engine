// SPDX-License-Identifier: EPL-2.0
import { AlgorithmAssembler } from '../../core/alg/AlgorithmAssembler.js';
import type { ILayoutProcessor } from '../../core/alg/ILayoutProcessor.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { TGraph } from './graph/TGraph.js';
import { TreeLayoutPhases } from './TreeLayoutPhases.js';

/**
 * Implements a layout algorithm for trees. The tree layouter uses the algorithm from "A Node-Positioning Algorithm
 * for General Trees, John Q.Walker II" to layout trees. To do this it uses four phases plus a pre-processing to build
 * a corresponding data structure. The first phase "treeifying" transforms the given graph into a tree if necessary.
 * To do this, edges which destroy the tree property will be removed and stored, so that they can be reinserted during
 * a post processing. In the second phase "orderNodes" the nodes of each level are separated into leaves and inner
 * nodes. And then whitespace in the level is filled with leaves. The third phase "NodePlacer" uses the algorithm
 * first mentioned from John Q.Walker II to compute the actual position of the nodes. The last phase routeEdges sets
 * the positions for the edges corresponding to the positions of the nodes.
 *
 * Each phase uses intermediate processors for small computations on the graph. The corresponding processors are
 * defined in each phase. Some are defined multiple times, but they are invoked only once.
 *
 * The processors can determine roots of components and fan outs or level neighbors of nodes.
 *
 * Divergence (core-engine M2): the two `elkjs-exclude` debug blocks (`MrTree.java:77-83` in `doLayout` and
 * `MrTree.java:184-193` in `layout`, both guarded by `MrTreeOptions.DEBUG_MODE`, which only log through the progress
 * monitor) are dropped, as is the `java.time` import of the first. The commented-out
 * `getIntermediateProcessingConfiguration` TODO of the Java (`:113-163`) is not carried over.
 *
 * @author sor
 * @author sgu
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/MrTree.java
 */
export class MrTree {
  /** The thing that will assemble the processors that will constitute our algorithm. */
  private readonly algorithmAssembler: AlgorithmAssembler<TreeLayoutPhases, TGraph> = AlgorithmAssembler.create<
    TreeLayoutPhases,
    TGraph
  >(TreeLayoutPhases);

  /** Our algorithm. */
  private algorithm: ILayoutProcessor<TGraph>[] = [];

  /**
   * Does a layout on the given graph.
   *
   * @param tgraph the graph to layout.
   * @param progressMonitor a progress monitor to show progress information in.
   * @returns tree graph with layout applied.
   */
  doLayout(tgraph: TGraph, progressMonitor: IElkProgressMonitor): TGraph {
    progressMonitor.begin('Tree layout', 1);

    // set up the phases and processors depending on user options
    this.updateModules(tgraph);

    // do layout for each component
    this.layout(tgraph, progressMonitor.subTask(1.0));

    progressMonitor.done();

    return tgraph;
  }

  /**
   * Update the modules depending on user options.
   *
   * @param graph the graph to be laid out.
   */
  private updateModules(graph: TGraph): void {
    this.algorithmAssembler.reset();

    // Configure phases
    this.algorithmAssembler.setPhase(TreeLayoutPhases.P1_TREEIFICATION, TreeLayoutPhases.P1_TREEIFICATION);
    this.algorithmAssembler.setPhase(TreeLayoutPhases.P2_NODE_ORDERING, TreeLayoutPhases.P2_NODE_ORDERING);
    this.algorithmAssembler.setPhase(TreeLayoutPhases.P3_NODE_PLACEMENT, TreeLayoutPhases.P3_NODE_PLACEMENT);
    this.algorithmAssembler.setPhase(TreeLayoutPhases.P4_EDGE_ROUTING, TreeLayoutPhases.P4_EDGE_ROUTING);

    // Assemble the algorithm
    this.algorithm = this.algorithmAssembler.build(graph);
  }

  /**
   * Perform the phases of the tree layouter.
   *
   * @param graph the graph that is to be laid out
   * @param themonitor a progress monitor, or `null`
   */
  private layout(graph: TGraph, themonitor: IElkProgressMonitor | null): void {
    let monitor: IElkProgressMonitor | null = themonitor;
    if (monitor === null) {
      monitor = new BasicProgressMonitor();
    }
    monitor.begin('Layout', this.algorithm.length);

    // invoke each layout processor
    for (const processor of this.algorithm) {
      if (monitor.isCanceled()) {
        return;
      }
      processor.process(graph, monitor.subTask(1)!);
    }
    monitor.done();
  }
}
