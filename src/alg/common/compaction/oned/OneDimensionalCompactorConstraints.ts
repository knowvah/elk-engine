// SPDX-License-Identifier: EPL-2.0
import type { CGraph } from './CGraph.js';
import type { CNode } from './CNode.js';

/**
 * Section of {@link OneDimensionalCompactor} (P1): the constraint bookkeeping of groups and the
 * reversal of constraints (`calculateConstraintsForCGroups`, `reverseConstraints`). Sections never
 * import the facade.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/OneDimensionalCompactor.java
 */

/**
 * Sets the constraints of CGroups according to the constraints of the included CNodes.
 *
 * @param cGraph the graph
 */
export function calculateConstraintsForCGroups(cGraph: CGraph): void {
  for (const group of cGraph.cGroups) {
    group.outDegree = 0;
    group.outDegreeReal = 0;
    group.incomingConstraints.clear();
  }

  for (const group of cGraph.cGroups) {
    for (const cNode of group.cNodes) {
      for (const inc of cNode.constraints) {
        if (inc.cGroup !== group) {
          // adding constraints to each CGroup, that refer to CNodes outside of the
          // CGroup
          group.incomingConstraints.add(inc);
          // setting the outDegree of CGroups
          // (number of CNodes outside the group that the group is constrained by)
          (inc.cGroup as NonNullable<CNode['cGroup']>).outDegree++;
          (inc.cGroup as NonNullable<CNode['cGroup']>).outDegreeReal++;
        }
      }
    }
  }
}

/**
 * If the graph is compacted twice in opposing directions, the constraints can be reversed to
 * avoid recalculating them. Also the CNodes' starting position is reset to be ready for
 * another compaction.
 *
 * @param cGraph the graph
 */
export function reverseConstraints(cGraph: CGraph): void {
  // maps CNodes to temporary lists of incoming constraints
  // IDENTITY-HASHED (Maps.newHashMap, OneDimensionalCompactor.java:500): Map in insertion order;
  // only put/get are called, it is never iterated.
  const incMap = new Map<CNode, CNode[]>();
  for (const cNode of cGraph.cNodes) {
    incMap.set(cNode, []);
  }

  // resetting fields of CNodes and reversing constraints
  for (const cNode of cGraph.cNodes) {
    cNode.startPos = Number.NEGATIVE_INFINITY;
    for (const inc of cNode.constraints) {
      (incMap.get(inc) as CNode[]).push(cNode);
    }
  }

  // write back
  for (const cNode of cGraph.cNodes) {
    cNode.constraints.length = 0;
    cNode.constraints = incMap.get(cNode) as CNode[];
  }

  // resetting constraints for CGroups
  calculateConstraintsForCGroups(cGraph);
}
