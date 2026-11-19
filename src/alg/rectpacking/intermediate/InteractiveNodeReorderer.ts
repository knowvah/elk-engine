// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { PROPERTY_RETURN_VALUE, unboxInteger } from '../../../java/lang/Unbox.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';

/** The `source` text of the JVM's helpful NullPointerException for an unboxed `modelOrder.get(...)` that is null. */
const MAP_GET_RETURN_VALUE = 'the return value of "java.util.Map.get(Object)"';

/** Java `Integer.compare`. */
function integerCompare(x: number, y: number): number {
  return x < y ? -1 : x === y ? 0 : 1;
}

/**
 * The comparator of `InteractiveNodeReorderer.java:63-71`, verbatim: the lambda that captures `modelOrder`
 * (`:50`, filled at `:53` with the index of each node among the nodes that have a desired position). Equal desired
 * positions compare by model order, the later node first, so the comparator is a total order (eclipse-elk/elk#1237;
 * until `e7eaea57` it returned `-1` for a tie in both directions, PK7).
 *
 * AD-10: the Java's `HashMap<ElkNode, Integer>` is identity-keyed (`ElkNode` does not override `hashCode`) and only
 * read by key, so it is a plain `Map`.
 *
 * @param modelOrder the model order of every node the comparator is asked about
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/InteractiveNodeReorderer.java
 */
export function compareDesiredPositions(modelOrder: ReadonlyMap<ElkNode, number>): (a: ElkNode, b: ElkNode) => number {
  return (a, b) => {
    const source = PROPERTY_RETURN_VALUE('ElkNode');
    const positionA = unboxInteger(a.getProperty(RectPackingOptions.DESIRED_POSITION), source);
    const positionB = unboxInteger(b.getProperty(RectPackingOptions.DESIRED_POSITION), source);
    if (positionA === positionB) {
      return integerCompare(
        unboxInteger(modelOrder.get(b), MAP_GET_RETURN_VALUE),
        unboxInteger(modelOrder.get(a), MAP_GET_RETURN_VALUE),
      );
    } else {
      return integerCompare(positionA, positionB);
    }
  };
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
    const modelOrder = new Map<ElkNode, number>();
    for (const elkNode of rectangles) {
      if (elkNode.hasProperty(RectPackingOptions.DESIRED_POSITION)) {
        modelOrder.set(elkNode, fixedNodes.length);
        fixedNodes.push(elkNode);
      }
    }
    for (const elkNode of fixedNodes) {
      rectangles.remove(elkNode);
    }
    // Nodes with the same desired position are sorted later node first, since inserting them at the same index
    // below reverses them again, so that they keep their model order. Comparing their model order instead of
    // returning a constant keeps the comparator consistent, which the sort requires.
    // Collections.sort(fixedNodes, ...): Array.prototype.sort (translation rules, sort); PK7.
    fixedNodes.sort(compareDesiredPositions(modelOrder));
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
