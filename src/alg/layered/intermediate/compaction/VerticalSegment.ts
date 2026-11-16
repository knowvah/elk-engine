// SPDX-License-Identifier: EPL-2.0
import { CompareFuzzy } from '../../../common/compaction/oned/CompareFuzzy.js';
import type { CNode } from '../../../common/compaction/oned/CNode.js';
import { Quadruplet } from '../../../common/compaction/oned/Quadruplet.js';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import type { KVector } from '../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../core/math/KVectorChain.js';
import * as DoubleMath from '../../../../guava/DoubleMath.js';
import * as Joiner from '../../../../guava/Joiner.js';
import { compare as doubleCompare } from '../../../../java/lang/DoubleCompare.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LPort } from '../../graph/LPort.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';

/**
 * Represents a vertical segment on a single {@link LEdge} that is merged with intersecting {@link VerticalSegment}s.
 *
 * There are two types of vertical segments that are handled differently and are distinguished by the presence of a
 * parent node. The usual segment stems from a step in an edge and has no parent node. The other type is the vertical
 * part of an edge that is connected to the north or south side of a node. In this case the node is the parent of the
 * segment and neither impose any constraints on each other because they are supposed to connect and therefore collide.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/VerticalSegment.java
 */
export class VerticalSegment {
  /** Nodes that may become the parent of the {@link CNode} that will represent this segment. */
  potentialGroupParents: CNode[] = [];

  /** The edges that contribute at least partly to this vertical segment. */
  representedLEdges: LEdge[] = [];
  /** The bendpoints that are located within the hitbox of this vertical segment. After compaction they should be adjusted. */
  affectedBends: KVector[] = [];
  /** Bounding boxes, e.g. of splines, that are to be adjusted after compaction. */
  affectedBoundingBoxes: ElkRectangle[] = [];

  /** The area occupied by this vertical segment. */
  hitbox: ElkRectangle = new ElkRectangle();

  /** The junction points of the original {@link LEdge}, that are between the bend points. */
  junctionPoints: KVectorChain = new KVectorChain();

  /** Whether spacing on a particular side should be ignored. */
  ignoreSpacing: Quadruplet = new Quadruplet();

  /** Pre-computed constraints that are to be added to the {@link CNode} which represents this segment. */
  constraints: VerticalSegment[] = [];

  /** Orthogonal edges may have vertical segments that leave/enter a north/south port. Such a port is stored here. */
  aPort: LPort | null = null;

  /** Segments that have been joined with this one. */
  joined: VerticalSegment[] = [];

  /**
   * Creates a new instance setting all fields.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/VerticalSegment.java
   */
  constructor(bend1: KVector, bend2: KVector, cNode: CNode | null, lEdge: LEdge) {
    this.affectedBends.push(bend1);
    this.affectedBends.push(bend2);

    this.hitbox.x = Math.min(bend1.x, bend2.x);
    this.hitbox.y = Math.min(bend1.y, bend2.y);
    this.hitbox.width = Math.abs(bend1.x - bend2.x);
    this.hitbox.height = Math.abs(bend1.y - bend2.y);

    // adding junction points
    const inJPs = lEdge.getProperty(LayeredOptions.JUNCTION_POINTS);
    // this property could be null
    if (inJPs !== null) {
      for (const jp of inJPs) {
        if (CompareFuzzy.eq(jp.x, bend1.x)) {
          this.junctionPoints.add(jp);
        }
      }
    }

    if (cNode !== null) {
      this.potentialGroupParents.push(cNode);
    }
    //        parentNode = cNode;

    this.representedLEdges.push(lEdge);
  }

  /**
   * Joins this segment with the `other` segment. As such, this segment is modified to capture the union of the two
   * segments. The other segment remains unaltered.
   *
   * @returns this instance.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/VerticalSegment.java
   */
  joinWith(other: VerticalSegment): VerticalSegment {
    this.representedLEdges.push(...other.representedLEdges);
    this.affectedBends.push(...other.affectedBends);
    this.affectedBoundingBoxes.push(...other.affectedBoundingBoxes);
    this.junctionPoints.addAll(other.junctionPoints);
    this.constraints.push(...other.constraints);
    this.potentialGroupParents.push(...other.potentialGroupParents);

    const newX = Math.min(this.hitbox.x, other.hitbox.x);
    const newY = Math.min(this.hitbox.y, other.hitbox.y);
    const maxX = Math.max(this.hitbox.x + this.hitbox.width, other.hitbox.x + other.hitbox.width);
    const newW = maxX - newX;
    const maxY = Math.max(this.hitbox.y + this.hitbox.height, other.hitbox.y + other.hitbox.height);
    const newH = maxY - newY;
    this.hitbox.setRect(newX, newY, newW, newH);

    this.ignoreSpacing.applyOr(other.ignoreSpacing);

    if (this.aPort === null) {
      this.aPort = other.aPort;
    }

    this.joined.push(...other.joined);
    this.joined.push(other);

    return this;
  }

  /**
   * Checks whether this segment intersects another.
   *
   * @returns `true` if the segments intersect
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/VerticalSegment.java
   */
  intersects(o: VerticalSegment): boolean {
    return (
      CompareFuzzy.eq(this.hitbox.x, o.hitbox.x) &&
      !(
        CompareFuzzy.lt(this.hitbox.getBottomLeft().y, o.hitbox.y) ||
        CompareFuzzy.lt(o.hitbox.getBottomLeft().y, this.hitbox.y)
      )
    );
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/VerticalSegment.java */
  compareTo(o: VerticalSegment): number {
    const d = DoubleMath.fuzzyCompare(this.hitbox.x, o.hitbox.x, CompareFuzzy.TOLERANCE);
    if (d === 0) {
      return doubleCompare(this.hitbox.y, o.hitbox.y);
    }
    return d;
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/VerticalSegment.java */
  toString(): string {
    let sb = '';
    sb += 'VerticalSegment ';
    sb += this.hitbox.toString();
    sb += ' ';
    sb += Joiner.on(', ').join(this.representedLEdges);
    return sb;
  }
}
