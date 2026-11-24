// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { Direction } from '../../../core/options/Direction.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';

/** Java `new Iterable<TNode>() { iterator() { return Collections.emptyIterator(); } }`: stateless, so one object serves. */
const EMPTY_ITERABLE: Iterable<TNode> = {
  [Symbol.iterator]: (): Iterator<TNode> => [][Symbol.iterator](),
};

/**
 * A processor which determines the height for each level by setting it to the height of the tallest node of the level.
 *
 * @author sor
 * @author sgu
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/LevelHeightProcessor.java
 */
export class LevelHeightProcessor implements ILayoutProcessor<TGraph> {
  /** number of nodes in the graph. */
  private numberOfNodes = 0;

  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Processor determine the height for each level', 1);

    /** save number of nodes for progress computation */
    this.numberOfNodes = tGraph.getNodes().isEmpty() ? 1 : tGraph.getNodes().size();

    let root: TNode | null = null;
    /** find the root of the component */
    const it = tGraph.getNodes().listIterator();
    while (root === null && it.hasNext()) {
      const tNode = it.next();
      if (tNode.getProperty(InternalProperties.ROOT)) {
        root = tNode;
      }
    }

    /** start with the root and level down by dsf */
    if (root !== null) {
      this.setNeighbors([root], progressMonitor, tGraph.getProperty(MrTreeOptions.DIRECTION));
    }

    progressMonitor.done();
  }

  /**
   * Set the height property for each node in the current level and for their children. The height is the height of
   * the tallest node in the level.
   *
   * The recursive call of LevelHeightProcessor.java:128 is the last statement of the activation (a tail call), so it is
   * the next iteration of a loop over the levels. AC6 (#67): explicit stack, same visit, side-effect and accumulation
   * order. Each iteration stands for one Java activation, which still holds a frame in Java: they are counted for the
   * depth check.
   *
   * @param currentLevel the list of TNode at the same level, for which the neighbors and siblings should be determined
   * @param progressMonitor the current progress monitor
   * @param layoutDirection the layout direction
   */
  private setNeighbors(
    currentLevel: Iterable<TNode>,
    progressMonitor: IElkProgressMonitor,
    layoutDirection: Direction,
  ): void {
    let level = currentLevel;
    let depth = 1;
    /** only do something in filled levels */
    while (!Iterables.isEmpty(level)) {
      /** create subtask for recursive descent */
      const sT = progressMonitor.subTask(Int32.div(Iterables.size(level), this.numberOfNodes))!;

      sT.begin('Set neighbors in level', 1);

      const [nextLevel, height] = this.scanLevel(level, layoutDirection);
      this.setLevelHeight(level, height);

      /** add amount of work units to the whole task */
      sT.done();

      /** determine neighbors by bfs and for the whole graph */
      level = nextLevel;
      // Java's StackOverflowError of an endless recursion, raised from this class
      checkStackDepth(++depth);
    }
  }

  /**
   * The two Java loops of `setNeighbors` (LevelHeightProcessor.java:100-117) that collect the next level and the height
   * of the tallest node (split out for the NLOC gate when the recursion became a loop).
   */
  private scanLevel(currentLevel: Iterable<TNode>, layoutDirection: Direction): [Iterable<TNode>, number] {
    /** build empty iterator */
    let nextLevel: Iterable<TNode> = EMPTY_ITERABLE;

    let height = 0;
    if (layoutDirection.isHorizontal()) {
      for (const cN of currentLevel) {
        /** append the children of the current node to the next level */
        nextLevel = Iterables.concat(nextLevel, cN.getChildren());
        /** check if the node is the tallest node so far */
        if (height < cN.getSize().x) {
          height = cN.getSize().x;
        }
      }
    } else {
      for (const cN of currentLevel) {
        /** append the children of the current node to the next level */
        nextLevel = Iterables.concat(nextLevel, cN.getChildren());
        /** check if the node is the tallest node so far */
        if (height < cN.getSize().y) {
          height = cN.getSize().y;
        }
      }
    }
    return [nextLevel, height];
  }

  /** The Java loop of `setNeighbors` that sets the level height for each node (split out for the NLOC gate). */
  private setLevelHeight(currentLevel: Iterable<TNode>, height: number): void {
    for (const cN of currentLevel) {
      /** set the level height for the node */
      cN.setProperty(InternalProperties.LEVELHEIGHT, height);
    }
  }
}
