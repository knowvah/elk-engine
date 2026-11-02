// SPDX-License-Identifier: EPL-2.0
import type { LNode } from '../../graph/LNode.js';
import { BKCompactorClassEdge as ClassEdge } from './BKCompactorClassEdge.js';

/**
 * A node of the class graph. Java's private nested `BKCompactor.ClassNode` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/BKCompactor.java:396
 */
export class BKCompactorClassNode {
  classShift: number | null = null;
  /** Set by `BKCompactor.getOrCreateClassNode` right after construction, as in Java. */
  node!: LNode;
  outgoing: ClassEdge[] = [];
  indegree = 0;

  addEdge(target: BKCompactorClassNode, separation: number): void {
    const se = new ClassEdge();
    se.target = target;
    se.separation = separation;
    target.indegree++;
    this.outgoing.push(se);
  }
}
