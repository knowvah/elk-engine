// SPDX-License-Identifier: EPL-2.0
import type { LNode } from '../graph/LNode.js';
import type { NodeType } from '../graph/LNodeNodeType.js';

/**
 * A linear segment contains a single regular node or all dummy nodes of a long edge. Java's public static nested class
 * `LinearSegmentsNodePlacer.LinearSegment` (M15 file naming); it is only held in `List`s, never hashed, so
 * `compareTo`, `equals` and `hashCode` (all by `id`) are kept as methods. Package-private Java members are public here.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/LinearSegmentsNodePlacer.java:68
 */
export class LinearSegmentsNodePlacerLinearSegment {
  /** Nodes of the linear segment. */
  nodes: LNode[] = [];
  /** Identifier value, used as index in the segments array. */
  id = 0;
  /** Index in the previous layer. Used for cycle avoidance. */
  indexInLastLayer = -1;
  /** The last layer where a node belonging to this segment was discovered. Used for cycle avoidance. */
  lastLayer = -1;
  /** The accumulated force of the contained nodes. */
  deflection = 0;
  /** The current weight of the contained nodes. */
  weight = 0;
  /** The reference segment, if this has been unified with another. */
  refSegment: LinearSegmentsNodePlacerLinearSegment | null = null;
  /** The nodetype contained in this linear segment (Java: `null` until the first node is filled in). */
  nodeType: NodeType | null = null;

  /**
   * Determine the reference segment for the region to which this segment is associated.
   *
   * @return the region segment
   */
  region(): LinearSegmentsNodePlacerLinearSegment {
    let seg: LinearSegmentsNodePlacerLinearSegment = this;
    while (seg.refSegment !== null) {
      seg = seg.refSegment;
    }
    return seg;
  }

  /**
   * Splits this linear segment before the given node. The returned segment contains all nodes from the given node
   * onward, with their ID set to the new segment's ID. Those nodes are removed from this segment.
   *
   * @param node the node to split the segment at.
   * @param newId the new segment's id.
   * @return new linear segment with ID `newId` and all nodes from `node` onward.
   */
  split(node: LNode, newId: number): LinearSegmentsNodePlacerLinearSegment {
    const nodeIndex = this.nodes.indexOf(node);

    // Prepare the new segment
    const newSegment = new LinearSegmentsNodePlacerLinearSegment();
    newSegment.id = newId;

    // Move nodes to the new segment (`listIterator(nodeIndex)` with `remove()` after each `next()`)
    for (const movedNode of this.nodes.splice(nodeIndex)) {
      movedNode.id = newId;
      newSegment.nodes.push(movedNode);
    }

    return newSegment;
  }

  toString(): string {
    return `ls[${this.nodes.map((node) => node.toString()).join(', ')}]`;
  }

  compareTo(other: LinearSegmentsNodePlacerLinearSegment): number {
    return this.id - other.id;
  }

  equals(object: unknown): boolean {
    if (object instanceof LinearSegmentsNodePlacerLinearSegment) {
      return this.id === object.id;
    }
    return false;
  }

  hashCode(): number {
    return this.id;
  }
}
