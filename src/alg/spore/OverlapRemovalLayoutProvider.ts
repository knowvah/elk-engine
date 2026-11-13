// SPDX-License-Identifier: EPL-2.0
import { TEDGE_STRATEGY, TEdge } from '../common/TEdge.js';
import type { IOverlapHandler } from '../common/spore/IOverlapHandler.js';
import { InternalProperties } from '../common/spore/InternalProperties.js';
import { ScanlineOverlapCheck } from '../common/spore/ScanlineOverlapCheck.js';
import { SVGImage } from '../common/utils/SVGImage.js';
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { AlgorithmAssembler } from '../../core/alg/AlgorithmAssembler.js';
import type { ILayoutProcessor } from '../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { ElkUtil } from '../../core/util/ElkUtil.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import * as Sets from '../../guava/Sets.js';
import type { JavaHashSet } from '../../java/util/JavaHashSet.js';
import { ElkGraphImporter } from './ElkGraphImporter.js';
import type { Graph } from './graph/Graph.js';
import type { IGraphImporter } from './IGraphImporter.js';
import { OverlapRemovalStrategy } from './options/OverlapRemovalStrategy.js';
import { RootSelection } from './options/RootSelection.js';
import { SpanningTreeCostFunction } from './options/SpanningTreeCostFunction.js';
import { SporeCompactionOptions } from './options/SporeCompactionOptions.js';
import { SporeOverlapRemovalOptions } from './options/SporeOverlapRemovalOptions.js';
import { StructureExtractionStrategy } from './options/StructureExtractionStrategy.js';
import { TreeConstructionStrategy } from './options/TreeConstructionStrategy.js';
import { SPOrEPhases } from './SPOrEPhases.js';

/** The locals the Java `layout` method shares with its loop. */
interface RemovalState {
  readonly maxIterations: number;
  readonly svg: SVGImage;
  readonly overlapEdges: JavaHashSet<TEdge>;
  readonly overlapHandler: IOverlapHandler;
}

/**
 * Layout provider to connect the overlap removal algorithm to the Eclipse based layout API.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/OverlapRemovalLayoutProvider.java
 */
export class OverlapRemovalLayoutProvider extends AbstractLayoutProvider {
  private readonly algorithmAssembler: AlgorithmAssembler<SPOrEPhases, Graph> = AlgorithmAssembler.create<
    SPOrEPhases,
    Graph
  >(SPOrEPhases);
  private algorithm: ILayoutProcessor<Graph>[] = [];

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/OverlapRemovalLayoutProvider.java:57 */
  layout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    this.applyUnderlyingLayout(layoutGraph, progressMonitor);

    this.setAlgorithmProperties(layoutGraph);
    const maxIterations = layoutGraph.getProperty(SporeOverlapRemovalOptions.OVERLAP_REMOVAL_MAX_ITERATIONS);

    progressMonitor.begin('Overlap removal', 1);

    // initialize debug output
    let debugOutputFile: string | null = null;
    if (layoutGraph.getProperty(SporeOverlapRemovalOptions.DEBUG_MODE)) {
      // Java concatenates the possibly null folder path ("null45scanlineOverlaps"): String(...) keeps that
      debugOutputFile = `${String(ElkUtil.debugFolderPath('spore'))}45scanlineOverlaps`;
    }
    const svg = new SVGImage(debugOutputFile);

    // set overlap handler and import ElkGraph
    const overlapEdges: JavaHashSet<TEdge> = Sets.newHashSet<TEdge>(TEDGE_STRATEGY);
    const overlapHandler: IOverlapHandler = {
      handle: (n1, n2) => {
        overlapEdges.add(new TEdge(n1.originalVertex, n2.originalVertex));
      },
    };
    const graphImporter: IGraphImporter<ElkNode> = new ElkGraphImporter();
    const graph = graphImporter.importGraph(layoutGraph);

    this.removeOverlaps(layoutGraph, graph, graphImporter, progressMonitor, {
      maxIterations,
      svg,
      overlapEdges,
      overlapHandler,
    });

    // apply node positions to ElkGraph
    graphImporter.applyPositions(graph);

    progressMonitor.done();
  }

  /** Set algorithm properties (OverlapRemovalLayoutProvider.java:68-73). */
  private setAlgorithmProperties(layoutGraph: ElkNode): void {
    layoutGraph.setProperty(SporeCompactionOptions.PROCESSING_ORDER_ROOT_SELECTION, RootSelection.CENTER_NODE);
    layoutGraph.setProperty(
      SporeCompactionOptions.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION,
      SpanningTreeCostFunction.INVERTED_OVERLAP,
    );
    layoutGraph.setProperty(
      SporeCompactionOptions.PROCESSING_ORDER_TREE_CONSTRUCTION,
      TreeConstructionStrategy.MINIMUM_SPANNING_TREE,
    );
  }

  /** If desired, apply a layout algorithm (OverlapRemovalLayoutProvider.java:58-66). */
  private applyUnderlyingLayout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    if (layoutGraph.hasProperty(SporeCompactionOptions.UNDERLYING_LAYOUT_ALGORITHM)) {
      const requestedAlgorithm = layoutGraph.getProperty(SporeOverlapRemovalOptions.UNDERLYING_LAYOUT_ALGORITHM);
      const lad = LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(requestedAlgorithm);
      if (lad !== null) {
        const layoutProvider = lad.getInstancePool().fetch();
        layoutProvider.layout(layoutGraph, progressMonitor.subTask(1)!);
      }
    }
  }

  /** The `while` loop of the layout method: repeat overlap removal (OverlapRemovalLayoutProvider.java:94-125). */
  private removeOverlaps(
    layoutGraph: ElkNode,
    graph: Graph,
    graphImporter: IGraphImporter<ElkNode>,
    progressMonitor: IElkProgressMonitor,
    state: RemovalState,
  ): void {
    let overlapsExisted = true;
    let iteration = 0;

    while (iteration < state.maxIterations && overlapsExisted) {
      // scanline overlap check
      if (layoutGraph.getProperty(SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE)) {
        state.overlapEdges.clear();
        new ScanlineOverlapCheck(state.overlapHandler, state.svg).sweep(graph.vertices);
        if (state.overlapEdges.isEmpty()) {
          break; // don't bother if nothing overlaps
        }
        graph.tEdges = state.overlapEdges;
      }

      this.assembleAndRun(graph, progressMonitor);

      // update node positions
      graphImporter.updateGraph(graph);

      overlapsExisted = graph.getProperty(InternalProperties.OVERLAPS_EXISTED);
      iteration++;
    }
  }

  /** The assembling and executing of the algorithm inside the loop (OverlapRemovalLayoutProvider.java:107-114). */
  private assembleAndRun(graph: Graph, progressMonitor: IElkProgressMonitor): void {
    this.algorithmAssembler.reset();
    this.algorithmAssembler.setPhase(SPOrEPhases.P1_STRUCTURE, StructureExtractionStrategy.DELAUNAY_TRIANGULATION);
    this.algorithmAssembler.setPhase(SPOrEPhases.P2_PROCESSING_ORDER, graph.treeConstructionStrategy);
    this.algorithmAssembler.setPhase(SPOrEPhases.P3_EXECUTION, OverlapRemovalStrategy.GROW_TREE);
    this.algorithm = this.algorithmAssembler.build(graph);
    for (const processor of this.algorithm) {
      processor.process(graph, progressMonitor.subTask(1)!);
    }
  }
}
