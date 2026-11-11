// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
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
   * @param currentLevel the level we are currently in
   * @param level the level index
   */
  private setLevel(currentLevel: LinkedList<TNode>, level: number): void {
    if (!currentLevel.isEmpty()) {
      const nextLevel = new LinkedList<TNode>();

      for (const tNode of currentLevel) {
        this.gloLevelMap.put(tNode.id, level);
        for (const tChild of tNode.getChildren()) {
          nextLevel.add(tChild);
        }
      }

      this.setLevel(nextLevel, level + 1);
    }
  }
}
