// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { KVector } from '../../../../core/math/KVector.js';
import { InternalProperties } from '../../InternalProperties.js';
import { RadialOptions } from '../../options/RadialOptions.js';
import { RadialUtil } from '../../RadialUtil.js';
import type { IRadialSorter } from '../../sorting/IRadialSorter.js';
import { AbstractRadiusExtensionCompaction } from '../compaction/AbstractRadiusExtensionCompaction.js';
import type { IOverlapRemoval } from './IOverlapRemoval.js';

/**
 * Iteration order of the next-level node set of `extend` (I30, TR3): `'java'` is insertion order (what the identity-hashed
 * Java `HashSet` iterates in under -XX:hashCode=2 for up to 10 nodes); `'reversed'` is the twin that shows order dependence.
 */
export type NextLevelOrder = 'java' | 'reversed';

/**
 * Overlap removal which extends the radius of the nodes until they no longer overlap. It then moves the children by the
 * same distance and continues with the next radius.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/overlaps/RadiusExtensionOverlapRemoval.java
 */
export class RadiusExtensionOverlapRemoval
  extends AbstractRadiusExtensionCompaction
  implements ILayoutProcessor<ElkNode>, IOverlapRemoval
{
  private sorter: IRadialSorter | null = null;

  /** The I30 twin switch (tests only; production code never sets it): the iteration order of the next-level node set. */
  nextLevelOrder: NextLevelOrder = 'java';

  removeOverlaps(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    const root = graph.getProperty(InternalProperties.ROOT_NODE);
    this.setRoot(root);
    this.sorter = graph.getProperty(RadialOptions.SORTER).create();
    const spacing = graph.getProperty(CoreOptions.SPACING_NODE_NODE);
    this.setSpacing(spacing);

    const successors = RadialUtil.getSuccessors(root);
    this.extend(graph, successors, progressMonitor);
  }

  /**
   * Extend the first radius nodes until the nodes are non-overlapping.
   *
   * @param nodes A list of the same radius.
   */
  extend(graph: ElkNode, nodes: ElkNode[], progressMonitor: IElkProgressMonitor): void {
    if (nodes.length > 0) {
      const movedDistance = this.removeLevelOverlaps(graph, nodes, progressMonitor);
      const nextLevelSet = RadialUtil.getNextLevelNodeSet(nodes);
      const nextLevelNodes = this.nextLevelOrder === 'reversed' ? new Set([...nextLevelSet].reverse()) : nextLevelSet;
      // Calculate the moved distance which is the amount all children and grandchildren have to be moved.
      let index = 1;
      if (nextLevelNodes.size > 0) {
        for (const nextLevelNode of nextLevelNodes) {
          this.moveNode(nextLevelNode, movedDistance);
        }
        progressMonitor.logGraph(graph, `Child movement ${String(index)}`);
        index++;
      }

      if (this.sorter !== null) {
        // the copy is sorted and discarded (RadiusExtensionOverlapRemoval.java:91): its only effect is the ORDER_ID
        // writes of a polar sorter. Kept verbatim.
        this.sorter.sort([...nextLevelNodes]);
      }
      this.extend(graph, [...nextLevelNodes], progressMonitor);
    }
  }

  /**
   * The first half of `extend` (RadiusExtensionOverlapRemoval.java:59-77), split off for the NLOC limit: saves the old
   * positions, extends the level until it no longer overlaps and returns the distance the first node moved.
   */
  private removeLevelOverlaps(graph: ElkNode, nodes: ElkNode[], progressMonitor: IElkProgressMonitor): number {
    const oldPositions: KVector[] = [];
    // Save old positions
    for (const node of nodes) {
      oldPositions.push(new KVector(node.getX(), node.getY()));
    }
    progressMonitor.logGraph(graph, 'Before removing overlaps');
    while (this.overlapLayer(nodes)) {
      this.contractLayer(nodes, false);
    }
    progressMonitor.logGraph(graph, 'After removing overlaps');

    let movedX = 0;
    let movedY = 0;
    if (nodes.length > 0) {
      const firstNode = nodes[0] as ElkNode;
      movedX = firstNode.getX() - (oldPositions[0] as KVector).x;
      movedY = firstNode.getY() - (oldPositions[0] as KVector).y;
    }
    return Math.sqrt(movedX * movedX + movedY * movedY);
  }

  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Remove overlaps', 1);
    progressMonitor.logGraph(graph, 'Before');
    this.removeOverlaps(graph, progressMonitor);
    progressMonitor.logGraph(graph, 'After');
  }
}
