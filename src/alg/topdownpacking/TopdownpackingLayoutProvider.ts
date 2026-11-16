// SPDX-License-Identifier: EPL-2.0
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import type { ITopdownLayoutProvider } from '../../core/ITopdownLayoutProvider.js';
import { AlgorithmAssembler } from '../../core/alg/AlgorithmAssembler.js';
import type { ILayoutProcessor } from '../../core/alg/ILayoutProcessor.js';
import type { KVector } from '../../core/math/KVector.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { checkCast } from '../../java/lang/JavaCast.js';
import { GridElkNode } from './GridElkNode.js';
import type { INodeArranger } from './INodeArranger.js';
import { TopdownPackingPhases } from './TopdownPackingPhases.js';
import { TopdownpackingOptions } from './options/TopdownpackingOptions.js';

/**
 * Java `o instanceof INodeArranger` for the cast at TopdownpackingLayoutProvider.java:76 (an interface, so structural, as
 * `isTopdownLayoutProvider` in `src/core/RecursiveGraphLayoutEngineTopdown.ts`).
 */
function isNodeArranger(o: unknown): o is INodeArranger {
  return typeof (o as Partial<INodeArranger>).getPredictedSize === 'function';
}

/**
 * A simple box packing algorithm that places nodes as evenly sized rectangles. This algorithm uses fixed sizes and
 * therefore requires the option 'Topdown Layout' to be set to true to result in a correct layout. Using this algorithm
 * makes parallel nodes possible by allowing a node know its child layout size before the child layout is computed.
 *
 * @see org.eclipse.elk.alg.topdownpacking/src/org/eclipse/elk/alg/topdownpacking/TopdownpackingLayoutProvider.java
 */
export class TopdownpackingLayoutProvider extends AbstractLayoutProvider implements ITopdownLayoutProvider {
  private readonly algorithmAssembler: AlgorithmAssembler<TopdownPackingPhases, GridElkNode> =
    AlgorithmAssembler.create<TopdownPackingPhases, GridElkNode>(TopdownPackingPhases);

  layout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    // convert graph to GridElkNode
    const wrappedGraph = new GridElkNode(layoutGraph);

    // assemble algorithm
    const algorithm = this.assembleAlgorithm(wrappedGraph);

    progressMonitor.begin('Topdown Packing', algorithm.length);

    for (const processor of algorithm) {
      processor.process(wrappedGraph, progressMonitor.subTask(1)!);
    }

    progressMonitor.done();
  }

  assembleAlgorithm(graph: GridElkNode): ILayoutProcessor<GridElkNode>[] {
    this.algorithmAssembler.reset();

    this.algorithmAssembler.setPhase(
      TopdownPackingPhases.P1_NODE_ARRANGEMENT,
      graph.getProperty(TopdownpackingOptions.NODE_ARRANGEMENT_STRATEGY),
    );
    this.algorithmAssembler.setPhase(
      TopdownPackingPhases.P2_WHITESPACE_ELIMINATION,
      graph.getProperty(TopdownpackingOptions.WHITESPACE_ELIMINATION_STRATEGY),
    );

    return this.algorithmAssembler.build(graph);
  }

  getPredictedGraphSize(graph: ElkNode): KVector {
    // FIXME: enforce that all node placement strategies implement INodePlacer
    const nodePlacer = checkCast(
      graph.getProperty(TopdownpackingOptions.NODE_ARRANGEMENT_STRATEGY).create(),
      isNodeArranger,
      'org.eclipse.elk.alg.topdownpacking.INodeArranger',
    )!;
    return nodePlacer.getPredictedSize(graph);
  }
}
