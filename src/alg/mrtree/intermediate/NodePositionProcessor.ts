// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { KVector } from '../../../core/math/KVector.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * A processor which sets the final coordinates for each node in a given graph. The property XCOOR has to be set before
 * this processor is called.
 *
 * @author sor
 * @author sgu
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/NodePositionProcessor.java
 */
export class NodePositionProcessor implements ILayoutProcessor<TGraph> {
  /** number of nodes in the graph. */
  private numberOfNodes = 0;

  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Processor set coordinates', 1);

    /** save number of nodes for progress computation */
    this.numberOfNodes = tGraph.getNodes().isEmpty() ? 1 : tGraph.getNodes().size();

    /** find the root of the component */
    let root: TNode | null = null;
    const it = tGraph.getNodes().listIterator();
    while (root === null && it.hasNext()) {
      const tNode = it.next();
      if (tNode.getProperty(InternalProperties.ROOT)) {
        root = tNode;
        const pos = tNode.getPosition();
        pos.x = tNode.getProperty(InternalProperties.XCOOR);
        pos.y = tNode.getProperty(InternalProperties.YCOOR);
      }
    }

    /** start with the root and level down by bsf (Java: a null root is a NullPointerException here) */
    let nextLevel: LinkedList<TNode> = root!.getChildrenCopy();
    let subTasks = 1.0;
    do {
      nextLevel = this.setCoordinates(nextLevel, progressMonitor.subTask(subTasks)!);
      subTasks = Math.fround(Int32.div(nextLevel.size(), this.numberOfNodes));
    } while (!nextLevel.isEmpty());

    // Move node positions to their middle to achieve the same spacing between all nodes
    for (const n of tGraph.getNodes()) {
      n.getPosition().sub(new KVector(n.getSize().x / 2, n.getSize().y / 2));
    }

    progressMonitor.done();
  }

  /**
   * Set the coordinate for each node in a given level.
   *
   * @param currentLevel The list of TNode for which the neighbors should be calculated
   * @param progressMonitor The current progress monitor
   * @return The next level to set the coordinates for.
   */
  private setCoordinates(currentLevel: LinkedList<TNode>, progressMonitor: IElkProgressMonitor): LinkedList<TNode> {
    /** if the level is empty there is nothing to do */
    if (!currentLevel.isEmpty()) {
      const nextLevel = new LinkedList<TNode>();

      /** set the coordinates for each node in the current level and collect the nodes of the next level */
      for (const tNode of currentLevel) {
        nextLevel.addAll(tNode.getChildrenCopy());
        const pos = tNode.getPosition();
        pos.x = tNode.getProperty(InternalProperties.XCOOR);
        pos.y = tNode.getProperty(InternalProperties.YCOOR);
      }
      return nextLevel;
    }
    return new LinkedList<TNode>();
  }
}
