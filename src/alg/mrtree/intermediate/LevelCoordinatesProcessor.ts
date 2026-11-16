// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { Pair } from '../../../core/util/Pair.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';

/**
 * A processor that computes the start and end coordinates for each levels nodes. The used coordinates depend on the
 * layout direction of the graph.
 *
 * @author jnc, sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/LevelCoordinatesProcessor.java
 */
export class LevelCoordinatesProcessor implements ILayoutProcessor<TGraph> {
  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Processor determine the coords for each level', 1);

    const levels: Pair<number, number>[] = [];

    // Set up levels
    for (const n of tGraph.getNodes()) {
      while (n.getProperty(MrTreeOptions.TREE_LEVEL) > levels.length - 1) {
        levels.push(new Pair<number, number>(Number.MAX_VALUE, -Number.MAX_VALUE));
      }

      const curLevel = n.getProperty(MrTreeOptions.TREE_LEVEL);
      this.extendLevel(levels[curLevel]!, n, tGraph.getProperty(MrTreeOptions.DIRECTION).isHorizontal());
    }

    // Set node properties
    for (const n of tGraph.getNodes()) {
      const curLevel = n.getProperty(MrTreeOptions.TREE_LEVEL);
      n.setProperty(InternalProperties.LEVELMIN, levels[curLevel]!.getFirst()!);
      n.setProperty(InternalProperties.LEVELMAX, levels[curLevel]!.getSecond()!);
    }

    progressMonitor.done();
  }

  /** The `if (isHorizontal) ... else ...` block of the Java set-up loop (split out for the NLOC gate; Java reads DIRECTION once per node, as here). */
  private extendLevel(level: Pair<number, number>, n: TNode, horizontal: boolean): void {
    if (horizontal) {
      if (n.getPosition().x < level.getFirst()!) {
        level.setFirst(n.getPosition().x);
      }
      if (n.getPosition().x + n.getSize().x > level.getSecond()!) {
        level.setSecond(n.getPosition().x + n.getSize().x);
      }
    } else {
      if (n.getPosition().y < level.getFirst()!) {
        level.setFirst(n.getPosition().y);
      }
      if (n.getPosition().y + n.getSize().y > level.getSecond()!) {
        level.setSecond(n.getPosition().y + n.getSize().y);
      }
    }
  }
}
