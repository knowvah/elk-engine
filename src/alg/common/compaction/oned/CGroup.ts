// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
import * as Sets from '../../../../guava/Sets.js';
import { CGroupBuilder } from './CGroupCGroupBuilder.js';
import type { CNode } from './CNode.js';

/**
 * Represents a group of {@link CNode}s whose relative distances to each other are preserved.
 * For instance, when compacting a layered graph, {@link CGroup}s are used to ensure that vertical edge segments
 * that are connected to north/south ports, are kept at the position of the port (relative to the node).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/CGroup.java
 */
export class CGroup {
  // Variables are public for convenience reasons

  /* -------------- Publicly Usable Fields -------------- */
  /** An id for public use. There is no warranty, use at your own risk. */
  id = 0;
  /** Some node that was elected to be the master. The exact meaning of this is to be determined by the user. */
  master: CNode | null = null;

  /* -------------- Contained CNodes -------------- */
  /** grouped {@link CNode}s. */
  cNodes: Set<CNode>;

  /* -------------- Transient Data -------------- */
  /** root position of the {@link CGroup}. */
  startPos: number = Number.NEGATIVE_INFINITY;
  /** constraints pointing from within the {@link CGroup} to CNodes outside the {@link CGroup}. */
  incomingConstraints: Set<CNode>;
  /** number of constraints originating from within the {@link CGroup}. May change during compaction. */
  outDegree: number;
  /**
   * number of constraints originating from within the {@link CGroup}. As opposed to {@link outDegree} this value
   * must not be altered by a compaction algorithm.
   */
  outDegreeReal: number;
  /**
   * the reference node of this group, i.e. the reference for the group offset of other nodes.
   * The reference node is not fixed, it may be changed by the {@link OneDimensionalCompactor}.
   * (`protected` in Java, i.e. visible to the whole package; TypeScript has no package access.)
   */
  reference: CNode = null as never;

  /**
   * The field can be used to determine whether a group has moved during compaction. It has to be reset externally
   * and is updated during compaction, for instance by the {@link LongestPathCompaction}. Bear in mind that not every
   * compaction algorithm updates this field.
   */
  delta = 0;
  /**
   * Similar to {@link delta} with the difference that it does not represent the direction-less
   * sum of a this group's movements but instead considers the compaction direction. Thus, if a
   * node moves back and forth the same distance this field's value will be zero.
   */
  deltaNormalized = 0;

  /** Private in Java; TypeScript cannot give {@link CGroupBuilder} access to a private constructor. Use {@link of}. */
  constructor() {
    this.cNodes = Sets.newLinkedHashSet();
    // IDENTITY-HASHED (Sets.newHashSet, CGroup.java:66): Set in insertion order. Only add/clear are
    // ever called on it (OneDimensionalCompactor.calculateConstraintsForCGroups), never iterated.
    this.incomingConstraints = new Set<CNode>();
    this.outDegree = 0;
    this.outDegreeReal = 0;
  }

  /**
   * @returns a new builder for a {@link CGroup}.
   */
  static of(): CGroupBuilder {
    return new CGroupBuilder();
  }

  /**
   * Adds a {@link CNode} to the {@link CGroup} and updates the incoming constraints.
   *
   * @param cNode the {@link CNode} to add
   */
  addCNode(cNode: CNode): void {
    if (cNode.cGroup !== null) {
      throw new RuntimeException('CNode belongs to another CGroup.');
    }
    this.cNodes.add(cNode);
    cNode.cGroup = this;
    // `reference` is null in Java until set; the field type is non-null for the algorithms' sake.
    if ((this.reference as CNode | null) === null) {
      this.reference = cNode;
    }
  }

  /**
   * Removes the passed {@link CNode} from this group and sets the `cGroup` field to
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
