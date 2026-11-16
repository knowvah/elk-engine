// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ICostFunction } from '../../common/ICostFunction.js';
import { NaiveMinST } from '../../common/NaiveMinST.js';
import type { Tree } from '../../common/Tree.js';
import { InternalProperties } from '../../common/spore/InternalProperties.js';
import type { Graph } from '../graph/Graph.js';
import { MinSTPhase } from './MinSTPhase.js';

/**
 * This phase finds a maximum spanning tree for the edges of the {@link Graph} with the
 * specified root {@link Graph.preferredRoot}.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p2processingorder/MaxSTPhase.java
 */
export class MaxSTPhase extends MinSTPhase {
  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p2processingorder/MaxSTPhase.java:32 */
  override process(graph: Graph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Maximum spanning tree construction', 1);

    // inverted cost function
    const invertedCF: ICostFunction = {
      cost: (e) => -graph.costFunction.cost(e),
    };

    // NOTE: the root is the (modifiable) `vertex`, not `originalVertex` as in MinSTPhase (kept from the Java)
    let root: KVector;
    if (graph.preferredRoot !== null) {
      root = graph.preferredRoot.vertex;
    } else {
      root = graph.vertices[0]!.vertex;
    }

    // `graph.tEdges` is set by the structure phase (the Java would throw a NullPointerException otherwise)
    const tEdges = graph.tEdges!;
    let tree: Tree<KVector>;
    if (graph.getProperty(InternalProperties.DEBUG_SVG)) {
      tree = NaiveMinST.createSpanningTree(
        tEdges,
        root,
        invertedCF,
        `${String(ElkUtil.debugFolderPath('spore'))}20minst`,
      );
    } else {
      tree = NaiveMinST.createSpanningTree(tEdges, root, invertedCF);
    }

    // convert result to a Tree that can be used in the execution phase
    this.convert(tree, graph);

    progressMonitor.done();
  }
}
