// SPDX-License-Identifier: EPL-2.0
import type { Pair } from '../../../../core/util/Pair.js';
import { d2i } from '../../../../java/lang/JavaMath.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LNode } from '../../graph/LNode.js';
import type { NeighborhoodInformation } from './NeighborhoodInformation.js';

/**
 * Compares neighbor pairs by the index of their node within its layer. Java's private inner class
 * `NeighborhoodInformation.NeighborComparator` (M15 file naming); the Java inner class reads the enclosing instance's
 * `nodeIndex`, so this one keeps the enclosing instance.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/NeighborhoodInformation.java:196
 */
export class NeighborhoodInformationNeighborComparator {
  private readonly ni: NeighborhoodInformation;

  constructor(ni: NeighborhoodInformation) {
    this.ni = ni;
  }

  compare(o1: Pair<LNode, LEdge>, o2: Pair<LNode, LEdge>): number {
    const nodeIndex = this.ni.nodeIndex!;
    const cmp = nodeIndex[o1.getFirst()!.id]! - nodeIndex[o2.getFirst()!.id]!;
    return d2i(Math.sign(cmp));
  }
}
