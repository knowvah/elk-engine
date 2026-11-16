// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { InternalProperties } from '../../InternalProperties.js';
import { RadialOptions } from '../../options/RadialOptions.js';
import { RadialUtil } from '../../RadialUtil.js';
import type { IRadialSorter } from '../../sorting/IRadialSorter.js';
import { AbstractRadiusExtensionCompaction } from './AbstractRadiusExtensionCompaction.js';
import type { IRadialCompactor } from './IRadialCompactor.js';

/**
 * The radial compaction contracts each radius, beginning at the inner radius, until an overlap occurs.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/compaction/RadialCompaction.java
 */
export class RadialCompaction extends AbstractRadiusExtensionCompaction implements IRadialCompactor {
  /** The sorter which shall be used and which is needed to determine the order of the nodes per radius. */
  private sorter: IRadialSorter | null = null;

  /** The value of the last radius. */
  private lastRadius = 0;

  compact(graph: ElkNode): void {
    const root = graph.getProperty(InternalProperties.ROOT_NODE);
    this.setRoot(root);
    this.sorter = graph.getProperty(RadialOptions.SORTER).create();
    const stepSize = graph.getProperty(RadialOptions.COMPACTION_STEP_SIZE);
    this.setCompactionStep(stepSize);
    const spacing = graph.getProperty(CoreOptions.SPACING_NODE_NODE);
    this.setSpacing(spacing);

    const firstLevelNodes = RadialUtil.getSuccessors(root);
    if (this.sorter !== null) {
      this.sorter.sort(firstLevelNodes);
    }
    this.contract(firstLevelNodes);
  }

  /**
   * Contract each radius beginning at the inner radius. Each radius is contracted until an overlap occurs. The last
   * contraction will be undone, to remove the overlap.
   *
   * @param nodes A list of nodes of one radius.
   */
  contract(nodes: ElkNode[]): void {
    if (nodes.length > 0) {
      let isOverlapping = this.overlapping(nodes);
      let wasContracted = false;
      while (!isOverlapping) {
        this.contractLayer(nodes, true);
        wasContracted = true;
        isOverlapping = this.overlapping(nodes);
      }
      // undo last step
      if (wasContracted) {
        this.contractLayer(nodes, false);
      }
      const nextLevelNodes = RadialUtil.getNextLevelNodes(nodes);
      if (this.sorter !== null) {
        this.sorter.sort(nextLevelNodes);
      }
      this.lastRadius = this.calculateRadius(nodes[0] as ElkNode);
      this.contract(nextLevelNodes);
    }
  }

  /**
   * Calculate the radius by help of a node.
   *
   * @param node A node of the radius which will be determined.
   * @return the radius the given node is placed on.
   */
  private calculateRadius(node: ElkNode): number {
    const xPos = node.getX();
    const yPos = node.getY();

    const root = this.getRoot();
    const rootX = root.getX();
    const rootY = root.getY();

    const vectorX = xPos - rootX;
    const vectorY = yPos - rootY;
    const radius = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
    return radius;
  }

  /**
   * Calculate if nodes of a radius are either overlapping their next neighbor or its predecessor on the next layer.
   *
   * @param nodes A list of nodes of one radius.
   * @return Return if the value is overlapping or not.
   */
  private overlapping(nodes: readonly ElkNode[]): boolean {
    if (this.overlapLayer(nodes)) {
      return true;
    }
    for (const node of nodes) {
      const parent = RadialUtil.getTreeParent(node);
      // a node without a tree parent makes `overlap` dereference null: a NullPointerException in Java, a TypeError here
      if (this.overlap(node, parent as ElkNode)) {
        return true;
      }

      if (this.calculateRadius(node) - this.getSpacing() <= this.lastRadius) {
        return true;
      }
    }

    return false;
  }
}
