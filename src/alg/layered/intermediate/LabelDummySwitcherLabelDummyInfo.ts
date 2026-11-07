// SPDX-License-Identifier: EPL-2.0
import { add as int32Add, sub as int32Sub } from '../../../java/lang/Int32.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { CenterEdgeLabelPlacementStrategy } from '../options/CenterEdgeLabelPlacementStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { firstOf } from './LabelDummySwitcherSupport.js';

/**
 * Encapsulates information about a label dummy along with the long edge dummies to its left and to its right. The
 * Java nested class `LabelDummySwitcher.LabelDummyInfo` has private members used by its outer class; they are public
 * here because TypeScript has no nested-class access.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelDummySwitcher.java:643
 */
export class LabelDummySwitcherLabelDummyInfo {
  /** The label dummy node. */
  labelDummy: LNode;
  /** The label placement strategy to be used with this label. */
  placementStrategy: CenterEdgeLabelPlacementStrategy | null = null;
  /** The long edge dummies to the left of the label dummy. May well be empty. */
  leftLongEdgeDummies: LNode[] = [];
  /** The long edge dummies to the right of the label dummy. May well be empty. */
  rightLongEdgeDummies: LNode[] = [];
  /** ID of the leftmost layer the label dummy's long edge has a dummy node in. */
  leftmostLayerId = 0;
  /** ID of the rightmost layer the label dummy's long edge has a dummy node in. */
  rightmostLayerId = 0;

  /**
   * Create a new instance to represent the given label dummy. Automatically collects long edge dummies to its left
   * and to its right.
   *
   * @param labelDummy the label dummy.
   * @param defaultPlacementStrategy the strategy used unless a represented label overrides it.
   * @see LabelDummySwitcher.java:668
   */
  constructor(labelDummy: LNode, defaultPlacementStrategy: CenterEdgeLabelPlacementStrategy) {
    this.labelDummy = labelDummy;
    this.placementStrategy = defaultPlacementStrategy;

    // Gather long edge dummies that are part of the label dummy's edge and find the end layer IDs
    this.gatherLeftLongEdgeDummies();
    this.gatherRightLongEdgeDummies();

    if (this.leftLongEdgeDummies.length === 0) {
      this.leftmostLayerId = labelDummy.getLayer()!.id;
    } else {
      this.leftmostLayerId = this.leftLongEdgeDummies[0]!.getLayer()!.id;
    }

    if (this.rightLongEdgeDummies.length === 0) {
      this.rightmostLayerId = labelDummy.getLayer()!.id;
    } else {
      this.rightmostLayerId = this.rightLongEdgeDummies[this.rightLongEdgeDummies.length - 1]!.getLayer()!.id;
    }

    // Check if the label wants to deviate from the default placement strategy
    for (const label of labelDummy.getProperty(InternalProperties.REPRESENTED_LABELS)) {
      // Take the first override we can find
      if (label.hasProperty(LayeredOptions.EDGE_LABELS_CENTER_LABEL_PLACEMENT_STRATEGY)) {
        this.placementStrategy = label.getProperty(LayeredOptions.EDGE_LABELS_CENTER_LABEL_PLACEMENT_STRATEGY);
        break;
      }
    }
  }

  /**
   * Gathers the long edge dummies left of the label dummy which are part of its long edge. The order they are in
   * reflects the order of layers, that is, the label dummy is the successor of the last long edge dummy in the list.
   *
   * @see LabelDummySwitcher.java:703
   */
  private gatherLeftLongEdgeDummies(): void {
    let source: LNode = this.labelDummy;
    do {
      source = firstOf(source.getIncomingEdges()).getSource()!.getNode()!;
      if (source.getType() === NodeType.LONG_EDGE) {
        this.leftLongEdgeDummies.push(source);
      }
    } while (source.getType() === NodeType.LONG_EDGE);

    // The list is currently not in the order we would expect, so produce a reversed version (Java: Lists.reverse
    // view; the list is never modified afterwards, so a reversed copy is equivalent)
    this.leftLongEdgeDummies = this.leftLongEdgeDummies.slice().reverse();
  }

  /**
   * Gathers the long edge dummies right of the label dummy which are part of its long edge. The order they are in
   * reflects the order of layers, that is, the label dummy is the predecessor of the first long edge dummy in the
   * list.
   *
   * @see LabelDummySwitcher.java:722
   */
  private gatherRightLongEdgeDummies(): void {
    let target: LNode = this.labelDummy;
    do {
      target = firstOf(target.getOutgoingEdges()).getTarget()!.getNode()!;
      if (target.getType() === NodeType.LONG_EDGE) {
        this.rightLongEdgeDummies.push(target);
      }
    } while (target.getType() === NodeType.LONG_EDGE);
  }

  /**
   * Returns the total number of long edge and label dummy nodes along the label dummy's edge.
   *
   * @see LabelDummySwitcher.java:735
   */
  totalDummyCount(): number {
    return int32Add(int32Sub(this.rightmostLayerId, this.leftmostLayerId), 1);
  }

  /**
   * Returns the i-th dummy node from the edge through the long edge dummies and the label dummy.
   *
   * @see LabelDummySwitcher.java:742
   */
  ithDummyNode(i: number): LNode {
    if (i < this.leftLongEdgeDummies.length) {
      // The i-th dummy is a long edge dummy to the label dummy's left
      return this.leftLongEdgeDummies[i]!;
    } else if (i === this.leftLongEdgeDummies.length) {
      // The i-th dummy is the label dummy itself
      return this.labelDummy;
    } else {
      // the i-th dummy is a long edge dummy to the label dummy's right
      return this.rightLongEdgeDummies[int32Sub(int32Sub(i, this.leftLongEdgeDummies.length), 1)]!;
    }
  }
}
