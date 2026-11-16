// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { LinkedHashMultimap } from '../../../../guava/LinkedHashMultimap.js';
import type { Multimap } from '../../../../guava/Multimap.js';
import { identity } from '../../../../java/util/HashStrategy.js';
import { InternalProperties } from '../../InternalProperties.js';
import { RadialOptions } from '../../options/RadialOptions.js';
import { RadialUtil } from '../../RadialUtil.js';
import type { IRadialSorter } from '../../sorting/IRadialSorter.js';
import { AbstractRadiusExtensionCompaction } from './AbstractRadiusExtensionCompaction.js';
import type { IRadialCompactor } from './IRadialCompactor.js';

/**
 * The AnnulusWedgeCompaction compacts each wedge one after another. Which leads to a more compact layout, but the
 * radial property will be lost.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/compaction/AnnulusWedgeCompaction.java
 */
export class AnnulusWedgeCompaction extends AbstractRadiusExtensionCompaction implements IRadialCompactor {
  // AD-10 / TR3 (AnnulusWedgeCompaction.java:37, :40): `HashMultimap.create()`, identity-hashed ElkNode keys and values,
  // read only by the any-match `contourOverlap`. Under -XX:hashCode=2 every identity hash is 1, so the value sets iterate
  // in insertion order: LinkedHashMultimap (W6 precedent).
  /** The left contour of each wedge, saved with the key of the first node in wedge. */
  private readonly leftContour: Multimap<ElkNode, ElkNode> = LinkedHashMultimap.create(
    identity<ElkNode>(),
    identity<ElkNode>(),
  );

  /** The right contour of each wedge, saved with the key of the first node in wedge. */
  private readonly rightContour: Multimap<ElkNode, ElkNode> = LinkedHashMultimap.create(
    identity<ElkNode>(),
    identity<ElkNode>(),
  );

  /** The sorter which shall be used and which is needed to determine the order of the nodes per radius. */
  private sorter: IRadialSorter | null = null;

  /** The root node of the graph. */
  private root!: ElkNode;

  compact(graph: ElkNode): void {
    // Get values of the graph
    this.root = graph.getProperty(InternalProperties.ROOT_NODE);
    this.setRoot(this.root);
    this.sorter = graph.getProperty(RadialOptions.SORTER).create();
    const stepSize = graph.getProperty(RadialOptions.COMPACTION_STEP_SIZE);
    this.setCompactionStep(stepSize);
    const spacing = graph.getProperty(CoreOptions.SPACING_NODE_NODE);
    this.setSpacing(spacing);

    // Calculate the first level nodes
    const successors = RadialUtil.getSuccessors(this.root);
    if (this.sorter !== null) {
      this.sorter.sort(successors);
    }
    this.constructContour(successors);

    // contract each wedge
    const rootList: ElkNode[] = [this.root];
    // do it two times to assure each node is compacted as much as possible
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < successors.length; i++) {
        const nodeAsList: ElkNode[] = [successors[i] as ElkNode];
        const rightParent = (i < successors.length - 1 ? successors[i + 1] : successors[0]) as ElkNode;
        const leftParent = (i === 0 ? successors[successors.length - 1] : successors[i - 1]) as ElkNode;

        this.contractWedge(successors[i] as ElkNode, rootList, leftParent, rightParent, nodeAsList);
      }
    }
  }

  /**
   * Contract each wedge by shortening the incoming edge as long as no overlaps occurs.
   *
   * @param wedgeParent The node which determines the wedge.
   * @param predecessors The tree predecessor.
   * @param radialPredecessor The radial predecessor wedge node.
   * @param radialSuccessor The radial successor wedge node.
   * @param currentRadiusNodes All nodes of the current wedge from one radius.
   */
  private contractWedge(
    wedgeParent: ElkNode,
    predecessors: ElkNode[],
    radialPredecessor: ElkNode,
    radialSuccessor: ElkNode,
    currentRadiusNodes: ElkNode[],
  ): void {
    let isOverlapping = this.overlapping(predecessors, radialPredecessor, radialSuccessor, currentRadiusNodes);
    let wasContracted = false;

    while (!isOverlapping) {
      this.contractLayer(currentRadiusNodes, true);
      wasContracted = true;
      isOverlapping = this.overlapping(predecessors, radialPredecessor, radialSuccessor, currentRadiusNodes);
    }

    // undo last step
    if (wasContracted) {
      this.contractLayer(currentRadiusNodes, false);
    }
    // continue with the nodes from the next radius
    const nextLevelNodes = RadialUtil.getNextLevelNodes(currentRadiusNodes);
    if (nextLevelNodes.length > 0) {
      if (this.sorter !== null) {
        this.sorter.sort(nextLevelNodes);
      }
      this.contractWedge(wedgeParent, currentRadiusNodes, radialPredecessor, radialSuccessor, nextLevelNodes);
    }
  }

  /**
   * Calculate the overlaps. Overlaps are considered between the nodes of the wedge of one radius. Furthermore the
   * overlaps of the nodes and it's predecessors and between the leftmost node and the right contour of the wedge to
   * it's left are considered. And between the overlaps between the rightmost node and left contour of the wedge to
   * it's right.
   */
  private overlapping(
    predecessors: readonly ElkNode[],
    leftParent: ElkNode,
    rightParent: ElkNode,
    layerNodes: ElkNode[],
  ): boolean {
    if (this.sorter !== null) {
      this.sorter.sort(layerNodes);
    }
    const firstNode = layerNodes[0] as ElkNode;

    // overlap with left wedge contour
    if (this.contourOverlap(leftParent, firstNode, false)) {
      return true;
    }

    // overlap with right wegde contour
    const lastNode = layerNodes[layerNodes.length - 1] as ElkNode;
    if (this.contourOverlap(rightParent, lastNode, true)) {
      return true;
    }

    // overlaps on the radius
    if (this.overlapLayer(layerNodes)) {
      return true;
    }

    // overlaps with the predecessors
    for (const sortedNode of layerNodes) {
      for (const predecessor of predecessors) {
        if (this.overlap(sortedNode, predecessor)) {
          return true;
        }
      }
    }

    return false;
  }

  /** Check if a node overlaps with a neighboring wedge contour. */
  private contourOverlap(neighbourWedgeParent: ElkNode, node: ElkNode, left: boolean): boolean {
    const contour = left ? this.leftContour.get(neighbourWedgeParent) : this.rightContour.get(neighbourWedgeParent);
    for (const contourNode of contour) {
      if (this.overlap(node, contourNode)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate the left and right contour of each node from the first layer.
   *
   * @param nodes The list of first layer nodes.
   */
  private constructContour(nodes: readonly ElkNode[]): void {
    for (const node of nodes) {
      this.leftContour.put(node, node);
      this.rightContour.put(node, node);

      let successors = RadialUtil.getSuccessors(node);
      if (successors.length > 0) {
        if (this.sorter !== null) {
          this.sorter.sort(successors);
        }
        this.leftContour.put(node, successors[0] as ElkNode);
        this.rightContour.put(node, successors[successors.length - 1] as ElkNode);

        while (RadialUtil.getNextLevelNodes(successors).length > 0) {
          successors = RadialUtil.getNextLevelNodes(successors);
          if (this.sorter !== null) {
            this.sorter.sort(successors);
          }
          this.leftContour.put(node, successors[0] as ElkNode);
          this.rightContour.put(node, successors[successors.length - 1] as ElkNode);
        }
      }
    }
  }
}
