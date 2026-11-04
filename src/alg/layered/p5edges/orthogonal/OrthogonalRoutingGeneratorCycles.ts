// SPDX-License-Identifier: EPL-2.0
import type { Random } from '../../../../java/util/Random.js';
import { HyperEdgeCycleDetector } from './HyperEdgeCycleDetector.js';
import type { HyperEdgeSegment } from './HyperEdgeSegment.js';

/**
 * The cycle breaking and topological numbering methods of `OrthogonalRoutingGenerator` (`:467-562`) as module
 * functions behind the facade (file-size limit). `breakCriticalCycles` stays on the facade: it needs the generator
 * instance (the lazily created splitter and the critical conflict threshold).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/OrthogonalRoutingGenerator.java
 */

/**
 * Finds and breaks non-critical cycles by removing and reversing non-critical dependencies. This method is used by the
 * self loop routing code as well.
 *
 * @see OrthogonalRoutingGenerator.java:471
 */
export function breakNonCriticalCycles(edgeSegments: HyperEdgeSegment[], random: Random): void {
  const cycleDependencies = HyperEdgeCycleDetector.detectCycles(edgeSegments, false, random);

  for (const cycleDependency of cycleDependencies) {
    if (cycleDependency.getWeight() === 0) {
      // Simply remove this dependency. This assumes that only two-cycles will have dependency weight 0
      cycleDependency.remove();
    } else {
      cycleDependency.reverse();
    }
  }
}

/**
 * Perform a topological numbering of the given hyperedge segments.
 *
 * @param segments list of hyperedge segments
 * @see OrthogonalRoutingGenerator.java:493
 */
export function topologicalNumbering(segments: HyperEdgeSegment[]): void {
  // determine sources, targets, incoming count and outgoing count; targets are only
  // added to the list if they only connect westward ports (that is, if all their
  // horizontal segments point to the right)
  const sources: HyperEdgeSegment[] = [];
  const rightwardTargets: HyperEdgeSegment[] = [];
  for (const node of segments) {
    node.setInWeight(node.getIncomingSegmentDependencies().length);
    node.setOutWeight(node.getOutgoingSegmentDependencies().length);

    if (node.getInWeight() === 0) {
      sources.push(node);
    }

    if (node.getOutWeight() === 0 && node.getIncomingConnectionCoordinates().size() === 0) {
      rightwardTargets.push(node);
    }
  }

  let maxRank = -1;

  // assign ranks using topological numbering
  while (sources.length > 0) {
    const node = sources.shift()!;
    for (const dep of node.getOutgoingSegmentDependencies()) {
      const target = dep.getTarget()!;
      target.setRoutingSlot(Math.max(target.getRoutingSlot(), node.getRoutingSlot() + 1));
      maxRank = Math.max(maxRank, target.getRoutingSlot());

      target.setInWeight(target.getInWeight() - 1);
      if (target.getInWeight() === 0) {
        sources.push(target);
      }
    }
  }

  /* If we stopped here, hyperedge segments that don't have any horizontal segments pointing
   * leftward would be ranked just like every other hyperedge segments. This would move back
   * edges too far away from their target node. To remedy that, we move all hyperedge segments
   * with horizontal segments only pointing rightwards as far right as possible.
   */
  if (maxRank > -1) {
    moveRightwardTargetsRight(rightwardTargets, maxRank);
  }
}

/**
 * The body of the `if (maxRank > -1)` block of `topologicalNumbering` (`:534-561`), split from the Java method body
 * (complexity limits); the statements and their order are unchanged.
 */
function moveRightwardTargetsRight(rightwardTargets: HyperEdgeSegment[], maxRank: number): void {
  // assign all target nodes with horizontal segments pointing to the right the
  // rightmost rank
  for (const node of rightwardTargets) {
    node.setRoutingSlot(maxRank);
  }

  // let all other segments with horizontal segments pointing rightwards move as
  // far right as possible
  while (rightwardTargets.length > 0) {
    const node = rightwardTargets.shift()!;

    // The node only has connections to western ports
    for (const dep of node.getIncomingSegmentDependencies()) {
      const source = dep.getSource()!;
      if (source.getIncomingConnectionCoordinates().size() > 0) {
        continue;
      }

      source.setRoutingSlot(Math.min(source.getRoutingSlot(), node.getRoutingSlot() - 1));

      source.setOutWeight(source.getOutWeight() - 1);
      if (source.getOutWeight() === 0) {
        rightwardTargets.push(source);
      }
    }
  }
}
