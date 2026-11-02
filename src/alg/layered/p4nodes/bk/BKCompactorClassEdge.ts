// SPDX-License-Identifier: EPL-2.0
import type { BKCompactorClassNode } from './BKCompactorClassNode.js';

/**
 * An edge of the class graph, holds the required separation between the connected classes. Java's private nested
 * `BKCompactor.ClassEdge` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/BKCompactor.java:416
 */
export class BKCompactorClassEdge {
  separation = 0;
  /** Set by `BKCompactorClassNode.addEdge` right after construction, as in Java. */
  target!: BKCompactorClassNode;
}
