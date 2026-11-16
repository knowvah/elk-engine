// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { InternalProperties } from '../InternalProperties.js';
import type { VertiFlexLayoutPhases } from '../VertiFlexLayoutPhases.js';
import { VertiFlexOptions } from '../options/VertiFlexOptions.js';
import { castToElkNode } from '../p2relative/RelativeXPlacerChildren.js';

/**
 * Node placer to position nodes vertically. Nodes that have a vertical constraint are placed according to that
 * constraint and other nodes are positioned automatically according to their position in the tree.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p1yplacement/NodeYPlacer.java
 */
export class NodeYPlacer implements ILayoutPhase<VertiFlexLayoutPhases, ElkNode> {
  private layerDistance: number = 0;
  private nodeNodeSpacing: number = 0;

  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('YPlacer', 1);

    this.layerDistance = graph.getProperty(VertiFlexOptions.LAYER_DISTANCE);
    this.nodeNodeSpacing = graph.getProperty(CoreOptions.SPACING_NODE_NODE);

    if (!graph.getChildren().isEmpty()) {
      const parent = graph.getProperty(InternalProperties.ROOT_NODE);
      this.setYLevels(parent, 0.0);
    }

    progressMonitor.done();
  }

  /**
   * A Method to set the absolute Y coordinates of the nodes. Uses a default distance between the nodes.
   *
   * @param node and it's children are getting updated Y-coords.
   * @param minHeight Node gets minimum this height. (Java reassigns the parameter; so does this.)
   * @see NodeYPlacer.java:46
   */
  private setYLevels(node: ElkNode, minHeight: number): void {
    if (node.hasProperty(VertiFlexOptions.VERTICAL_CONSTRAINT)) {
      minHeight = node.getProperty(VertiFlexOptions.VERTICAL_CONSTRAINT);
    }
    node.setY(minHeight);
    const newMinHeight =
      minHeight +
      this.layerDistance +
      node.getHeight() +
      Math.max(node.getProperty(CoreOptions.MARGINS).bottom, this.nodeNodeSpacing);
    for (let i = 0; i < node.getOutgoingEdges().size(); i++) {
      const child = castToElkNode(node.getOutgoingEdges().get(i).getTargets().get(0)!);
      this.setYLevels(child, newMinHeight);
    }
  }

  getLayoutProcessorConfiguration(
    _graph: ElkNode,
  ): LayoutProcessorConfiguration<VertiFlexLayoutPhases, ElkNode> | null {
    return null;
  }
}
