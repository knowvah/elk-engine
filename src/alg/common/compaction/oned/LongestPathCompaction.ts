// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../../core/options/Direction.js';
import { LinkedList } from '../../../../java/util/LinkedList.js';
import type { CGroup } from './CGroup.js';
import type { CNode } from './CNode.js';
import type { ICompactionAlgorithm } from './ICompactionAlgorithm.js';
import type { OneDimensionalCompactor } from './OneDimensionalCompactor.js';

/**
 * Compacts a previously calculated constraint graph (`CGraph`) by using a technique similar
 * to a longest path layering.
 *
 * The algorithm evaluates the {@link CGroup} `reposition` flag.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/LongestPathCompaction.java
 */
export class LongestPathCompaction implements ICompactionAlgorithm {
  compact(compactor: OneDimensionalCompactor): void {
    // calculating the left-most position of any element
    // this will be our starting point for the compaction
    let minStartPos = Number.POSITIVE_INFINITY;
    for (const cNode of compactor.cGraph.cNodes) {
      minStartPos = Math.min(minStartPos, (cNode.cGroup as CGroup).reference.hitbox.x + cNode.cGroupOffset.x);
    }

    // finding the sinks of the constraint graph
    const sinks = new LinkedList<CGroup>();
    for (const group of compactor.cGraph.cGroups) {
      group.startPos = minStartPos;
      if (group.outDegree === 0) {
        sinks.add(group);
      }
    }
    // process sinks until every node in the constraint graph was handled
    while (!sinks.isEmpty()) {
      const group = sinks.removeFirst();

      // record the movement of this group during the current compaction
      // this has to be recorded _before_ the nodes' positions are updated
      // and care has to be taken about the compaction direction. In certain
      // scenarios nodes may move "back-and-forth". To detect this, we associate
      // a negative delta with two of the compaction directions.
      let diff = group.reference.hitbox.x;

      this.setFinalPositions(compactor, group);

      diff -= group.reference.startPos;

      group.delta += diff;
      if (compactor.direction === Direction.RIGHT || compactor.direction === Direction.DOWN) {
        group.deltaNormalized += diff;
      } else {
        group.deltaNormalized -= diff;
      }

      this.propagateStartPositions(compactor, group, sinks);
    }

    // ------------------------------------------------------
    // #3 setting hitbox positions to new starting positions
    // ------------------------------------------------------
    for (const cNode of compactor.cGraph.cNodes) {
      cNode.hitbox.x = cNode.startPos;
    }
  }

  // ------------------------------------------
  // #1 final positions for this group's nodes
  // ------------------------------------------
  private setFinalPositions(compactor: OneDimensionalCompactor, group: CGroup): void {
    for (const node of group.cNodes) {
      // CNodes can be locked in place to avoid pulling clusters apart
      const suggestedX = group.startPos + node.cGroupOffset.x;
      if (
        !compactor.isLocked(group, compactor.direction) ||
        // does the "fixed" position violate the constraints?
        node.hitbox.x < suggestedX
      ) {
        node.startPos = suggestedX;
      } else {
        // leave the node where it was!
        node.startPos = node.hitbox.x;
      }
    }
  }

  // ---------------------------------------------------
  // #2 propagate start positions to constrained groups
  // ---------------------------------------------------
  private propagateStartPositions(compactor: OneDimensionalCompactor, group: CGroup, sinks: LinkedList<CGroup>): void {
    for (const node of group.cNodes) {
      for (const incNode of node.constraints) {
        this.propagateTo(compactor, node, incNode, sinks);
      }
    }
  }

  private propagateTo(
    compactor: OneDimensionalCompactor,
    node: CNode,
    incNode: CNode,
    sinks: LinkedList<CGroup>,
  ): void {
    const incGroup = incNode.cGroup as CGroup;
    // determine the required spacing
    let spacing: number;
    if (compactor.direction.isHorizontal()) {
      spacing = compactor.spacingsHandler.getHorizontalSpacing(node, incNode);
    } else {
      spacing = compactor.spacingsHandler.getVerticalSpacing(node, incNode);
    }

    incGroup.startPos = Math.max(
      incGroup.startPos,
      node.startPos +
        node.hitbox.width +
        spacing -
        // respect the other group's node's offset
        incNode.cGroupOffset.x,
    );

    // whether the node's current position should be preserved
    if (compactor.isLocked(incNode, compactor.direction)) {
      incGroup.startPos = Math.max(incGroup.startPos, incNode.hitbox.x - incNode.cGroupOffset.x);
    }

    incGroup.outDegree--;
    if (incGroup.outDegree === 0) {
      sinks.add(incGroup);
    }
  }
}
