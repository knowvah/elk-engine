// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { InternalProperties } from '../InternalProperties.js';
import type { VertiFlexLayoutPhases } from '../VertiFlexLayoutPhases.js';
import { castToElkNode } from '../p2relative/RelativeXPlacerChildren.js';

/**
 * Computes absolute x coordinates from the previously computed relative coordinates.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p3absolute/AbsoluteXPlacer.java
 */
export class AbsoluteXPlacer implements ILayoutPhase<VertiFlexLayoutPhases, ElkNode> {
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    // Upstream text "AbsolutPlacer" (AbsoluteXPlacer.java:32): a prose typo in a task name, corrected (CLAUDE.md carve-out).
    progressMonitor.begin('AbsolutePlacer', 1);

    if (!graph.getChildren().isEmpty()) {
      const parent = graph.getProperty(InternalProperties.ROOT_NODE);

      // first, move the root
      parent.setX(parent.getX() - this.findMinimalX(parent));
      // now we update the whole tree to absolute X
      this.absoluteTreeCoords(parent);
    }

    progressMonitor.done();
  }

  /** Find leftmost subtree. @see AbsoluteXPlacer.java:42 */
  private findMinimalX(tree: ElkNode): number {
    const numOfChildren = tree.getOutgoingEdges().size();
    if (numOfChildren === 0) {
      return tree.getX();
    } else {
      let minSubtreeX = 0.0;
      let testX = 0.0;
      for (let i = 0; i < numOfChildren; i++) {
        testX = this.findMinimalX(castToElkNode(tree.getOutgoingEdges().get(i).getTargets().get(0)!));
        minSubtreeX = testX < minSubtreeX ? testX : minSubtreeX;
      }
      return minSubtreeX + tree.getX();
    }
  }

  /** @see AbsoluteXPlacer.java:56 */
  private absoluteTreeCoords(tree: ElkNode): void {
    const numOfChildren = tree.getOutgoingEdges().size();
    if (numOfChildren > 0) {
      for (let i = 0; i < numOfChildren; i++) {
        const child = castToElkNode(tree.getOutgoingEdges().get(i).getTargets().get(0)!);
        child.setX(child.getX() + tree.getX());
        this.absoluteTreeCoords(child);
      }
    }
  }

  getLayoutProcessorConfiguration(
    _graph: ElkNode,
  ): LayoutProcessorConfiguration<VertiFlexLayoutPhases, ElkNode> | null {
    return null;
  }
}
