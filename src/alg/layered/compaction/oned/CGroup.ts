// SPDX-License-Identifier: EPL-2.0
import * as Sets from '../../../../guava/Sets.js';
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
import type { CNode } from './CNode.js';

/**
 * Represents a group of {@link CNode}s whose relative distances to each other are preserved.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/oned/CGroup.java
 */
export class CGroup {
  // Variables are public for convenience reasons since this class is used internally only.
  /** root position of the {@link CGroup}. */
  startPos: number = Number.NEGATIVE_INFINITY;
  /**
   * The field can be used to determine whether a group has moved during compaction. It has to be
   * reset externally and is updated during compaction, for instance by the
   * {@link LongestPathCompaction}. Bear in mind that not every compaction algorithm updates this field.
   */
  delta = 0;
  /**
   * Similar to {@link delta} with the difference that it does not represent the direction-less
   * sum of a this group's movements but instead considers the compaction direction. Thus, if a
   * node moves back and forth the same distance this field's value will be zero.
   */
  deltaNormalized = 0;
  /** grouped {@link CNode}s. */
  cNodes: Set<CNode>;
  /** constraints pointing from within the {@link CGroup} to CNodes outside of the {@link CGroup}. */
  incomingConstraints: Set<CNode>;
  /** number of constraints originating from within the {@link CGroup}. */
  outDegree: number;
  /** the reference node of this group, i.e. the reference for the group offset of other nodes. */
  reference: CNode = null as never;
  /** An id for public use. There is no warranty, use at your own risk. */
  id = 0;
  /** flags this group to be repositioned in the case of left/right balanced compaction. */
  reposition = true;

  /**
   * The constructor for a {@link CGroup} receives {@link CNode}s to group.
   *
   * @param inputCNodes the {@link CNode}s to add
   */
  constructor(...inputCNodes: CNode[]) {
    this.cNodes = Sets.newLinkedHashSet();
    // IDENTITY-HASHED (Sets.newHashSet, CGroup.java:68): Set in insertion order. Only add/clear are
    // ever called on it (OneDimensionalCompactor.calculateConstraintsForCGroups), never iterated.
    this.incomingConstraints = new Set<CNode>();
    this.outDegree = 0;
    for (const cNode of inputCNodes) {
      if ((this.reference as CNode | null) === null) {
        this.reference = cNode;
      }
      this.addCNode(cNode);
    }
  }

  /**
   * Adds a {@link CNode} to the {@link CGroup} and updates the incoming constraints.
   *
   * @param cNode the {@link CNode} to add
   */
  addCNode(cNode: CNode): void {
    this.cNodes.add(cNode);
    if (cNode.cGroup !== null) {
      throw new RuntimeException('CNode belongs to another CGroup.');
    }
    cNode.cGroup = this;
  }

  /**
   * Removes the passed {@link CNode} from this group and sets the `cGroup` field of the node to
   * null (if it belongs to this group).
   *
   * @param cNode the {@link CNode} to remove.
   * @returns true if this {@link CGroup} actually contained the passed {@link CNode}, false otherwise.
   */
  removeCNode(cNode: CNode): boolean {
    const removed = this.cNodes.delete(cNode);
    if (removed) {
      cNode.cGroup = null;
    }
    return removed;
  }
}
