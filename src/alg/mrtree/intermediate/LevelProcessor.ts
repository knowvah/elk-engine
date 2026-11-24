// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import { INTEGER } from '../../../java/util/HashStrategy.js';
import { JavaHashMap } from '../../../java/util/JavaHashMap.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';

/**
 * A processor that computes the treeLevel property for each node.
 *
 * @author jnc, sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/LevelProcessor.java
 */
export class LevelProcessor implements ILayoutProcessor<TGraph> {
  /**
   * this map temporarily contains the level of each node in the given graph. TR3: Integer keys, lookup only, so the
   * value-hashed JavaHashMap (iteration order is unobservable).
   */
  private gloLevelMap: JavaHashMap<number, number> = new JavaHashMap<number, number>(INTEGER);

  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Processor compute fanout', 1);

    const roots = new LinkedList<TNode>();
    for (const x of tGraph.getNodes()) {
      if (x.getProperty(InternalProperties.ROOT)) {
        roots.add(x);
      }
    }

    this.setLevel(roots, 0);

    for (const tNode of tGraph.getNodes()) {
      const level = this.gloLevelMap.get(tNode.id) !== undefined ? this.gloLevelMap.get(tNode.id)! : 0;
      tNode.setProperty(MrTreeOptions.TREE_LEVEL, level);
    }

    progressMonitor.done();
  }

  /**
   * Sets the level for all nodes.
   *
   * The recursive call of LevelProcessor.java:75 is the last statement of the activation (a tail call), so it is the
   * next iteration of a loop over the levels. AC6 (#67): explicit stack, same visit, side-effect and accumulation
   * order. Each iteration stands for one Java activation, which still holds a frame in Java: they are counted for the
   * depth check.
   *
   * @param currentLevel the level we are currently in
   * @param level the level index
   */
  private setLevel(currentLevel: LinkedList<TNode>, level: number): void {
    let nodes = currentLevel;
    let index = level;
    let depth = 1;
    while (!nodes.isEmpty()) {
      const nextLevel = new LinkedList<TNode>();

      for (const tNode of nodes) {
        this.gloLevelMap.put(tNode.id, index);
        for (const tChild of tNode.getChildren()) {
          nextLevel.add(tChild);
        }
      }

      nodes = nextLevel;
      index = index + 1;
      // Java's StackOverflowError of an endless recursion, raised from this class
      checkStackDepth(++depth);
    }
  }
}
