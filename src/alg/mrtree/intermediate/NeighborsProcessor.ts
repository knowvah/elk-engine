// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';

/** Java `new Iterable<TNode>() { iterator() { return Collections.emptyIterator(); } }`: stateless, so one object serves. */
const EMPTY_ITERABLE: Iterable<TNode> = {
  [Symbol.iterator]: (): Iterator<TNode> => [][Symbol.iterator](),
};

/**
 * A processor which determines the neighbors and siblings for all nodes in the graph. A neighbor is the current node's
 * nearest node, at the same level. A siblings is a neighbor with the same parent.
 *
 * @author sor
 * @author sgu
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/NeighborsProcessor.java
 */
export class NeighborsProcessor implements ILayoutProcessor<TGraph> {
  /** the number of nodes in the given graph. */
  private numberOfNodes = 0;

  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Processor set neighbors', 1);

    /** save number of nodes for progress computation */
    this.numberOfNodes = tGraph.getNodes().isEmpty() ? 1 : tGraph.getNodes().size();

    /** find the root of the component */
    let root: TNode | null = null;
    const it = tGraph.getNodes().listIterator();
    while (root === null && it.hasNext()) {
      const tNode = it.next();
      if (tNode.getProperty(InternalProperties.ROOT)) {
        root = tNode;
      }
    }

    /** start with the root and level down by dsf */
    if (root !== null) {
      this.setNeighbors(root.getChildren(), progressMonitor);
    }

    progressMonitor.done();
  }

  /**
   * Set the neighbors of each node in the current level and for their children. A neighbor is the current node's
   * nearest node, at the same level. A sibling is a neighbor with the same parent.
   *
   * The recursive call of NeighborsProcessor.java:123 is the last statement of the activation (a tail call), so it is
   * the next iteration of a loop over the levels. AC6 (#67): explicit stack, same visit, side-effect and accumulation
   * order. Each iteration stands for one Java activation, which still holds a frame in Java: they are counted for the
   * depth check.
   *
   * @param currentLevel the list of TNode at the same level, for which the neighbors and siblings should be determined
   * @param progressMonitor the current progress monitor
   */
  private setNeighbors(currentLevel: Iterable<TNode>, progressMonitor: IElkProgressMonitor): void {
    let level = currentLevel;
    let depth = 1;
    /** only do something in filled levels */
    while (!Iterables.isEmpty(level)) {
      /** create subtask for recursive descent */
      const sT = progressMonitor.subTask(Int32.div(Iterables.size(level), this.numberOfNodes))!;

      sT.begin('Set neighbors in level', 1);

      /** build empty iterator */
      let nextLevel: Iterable<TNode> = EMPTY_ITERABLE;

      let lN: TNode | null = null;

      /** the left neighbor is the previous processed node the right neighbor of the left neighbor is the current node */
      for (const cN of level) {
        /** append the children of the current node to the next level */
        nextLevel = Iterables.concat(nextLevel, cN.getChildren());
        if (lN !== null) {
          lN.setProperty(InternalProperties.RIGHTNEIGHBOR, cN);
          cN.setProperty(InternalProperties.LEFTNEIGHBOR, lN);
          if (cN.getParent() === lN.getParent()) {
            lN.setProperty(InternalProperties.RIGHTSIBLING, cN);
            cN.setProperty(InternalProperties.LEFTSIBLING, lN);
          }
        }

        lN = cN;
      }

      /** add amount of work units to the whole task */
      sT.done();

      /** determine neighbors by bfs and for the whole graph */
      level = nextLevel;
      // Java's StackOverflowError of an endless recursion, raised from this class
      checkStackDepth(++depth);
    }
  }
}
