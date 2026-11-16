// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { PROPERTY_RETURN_VALUE, unboxInteger } from '../../../java/lang/Unbox.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';

/**
 * The comparator of `InteractiveNodeReorderer.java:56-63`, verbatim: equal desired positions give `-1` in both
 * directions, so it violates the `Comparator` contract (PK7: the tie order of `Array.prototype.sort` is implementation
 * defined, the JDK sort may throw for 32 or more elements).
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/InteractiveNodeReorderer.java
 */
export function compareDesiredPositions(a: ElkNode, b: ElkNode): number {
  const source = PROPERTY_RETURN_VALUE('ElkNode');
  const positionA = unboxInteger(a.getProperty(RectPackingOptions.DESIRED_POSITION), source);
  const positionB = unboxInteger(b.getProperty(RectPackingOptions.DESIRED_POSITION), source);
  if (positionA === positionB) {
    return -1;
  } else {
    // Integer.compare(positionA, positionB)
    return positionA < positionB ? -1 : 1;
  }
}

/**
 * Sorts all child nodes by their desired position.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *   <dt>Postcondition:</dt>
 *     <dd>Children are sorted as specified by their desired position in relation to their original order.</dd>
 *   <dt>Slots:</dt>
 *     <dd>Before phase 1.</dd>
 *   <dt>Same-slot dependencies:</dt>
 * </dl>
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/InteractiveNodeReorderer.java
 */
export class InteractiveNodeReorderer implements ILayoutProcessor<ElkNode> {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/InteractiveNodeReorderer.java */
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Interactive Node Reorderer', 1);
    const rectangles = graph.getChildren();
    const fixedNodes: ElkNode[] = [];
    for (const elkNode of rectangles) {
      if (elkNode.hasProperty(RectPackingOptions.DESIRED_POSITION)) {
        fixedNodes.push(elkNode);
      }
    }
    for (const elkNode of fixedNodes) {
      rectangles.remove(elkNode);
    }
    // Collections.sort(fixedNodes, ...): Array.prototype.sort (translation rules, sort); PK7.
    fixedNodes.sort(compareDesiredPositions);
    for (const elkNode of fixedNodes) {
      let position = unboxInteger(
        elkNode.getProperty(RectPackingOptions.DESIRED_POSITION),
        PROPERTY_RETURN_VALUE('ElkNode'),
      );
      position = Math.min(position, rectangles.size());
      rectangles.addAt(position, elkNode);
    }

    let index = 0;
    for (const elkNode of rectangles) {
      elkNode.setProperty(RectPackingOptions.CURRENT_POSITION, index);
      index++;
    }
    progressMonitor.done();
  }
}
