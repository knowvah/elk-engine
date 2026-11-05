// SPDX-License-Identifier: EPL-2.0
import { UnsupportedGraphException } from '../../core/UnsupportedGraphException.js';
import type { LGraph } from './graph/LGraph.js';
import type { LNode } from './graph/LNode.js';
import { LayeredOptions } from './options/LayeredOptions.js';

import type { ILayoutProcessor } from '../../core/alg/ILayoutProcessor.js';

// Section of `ElkLayered` (the compound-graph helpers of `hierarchicalLayout`), split out for the 500-line file limit.

/**
 * Implements a breadth first search in compound graphs with reversed order. This way the innermost graphs are first
 * in the list, followed by one level further up, etc.
 *
 * @see ElkLayered.java:308
 */
export function collectAllGraphsBottomUp(root: LGraph): LGraph[] {
  // `push` on an `ArrayDeque` is `addFirst`; `pop` takes the first element
  const collectedGraphs: LGraph[] = [];
  const continueSearchingTheseGraphs: LGraph[] = [];
  collectedGraphs.unshift(root);
  continueSearchingTheseGraphs.unshift(root);

  while (continueSearchingTheseGraphs.length > 0) {
    const nextGraph = continueSearchingTheseGraphs.shift()!;
    for (const node of nextGraph.getLayerlessNodes()) {
      if (hasNestedGraph(node)) {
        const nestedGraph = node.getNestedGraph()!;
        collectedGraphs.unshift(nestedGraph);
        continueSearchingTheseGraphs.unshift(nestedGraph);
      }
    }
  }
  return collectedGraphs;
}

/**
 * It is not permitted that any of the child-graphs specifies a hierarchical layout processor that is not specified
 * by the root node. It depends on the concrete processor how this is fixed.
 *
 * @see ElkLayered.java:336
 */
export function reviewAndCorrectHierarchicalProcessors(root: LGraph, graphs: readonly LGraph[]): void {
  // Crossing minimization
  //  overwrite invalid child configuration (only layer sweep is hierarchical)
  const parentCms = root.getProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY);
  graphs.forEach((child) => {
    const childCms = child.getProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY);
    if (childCms !== parentCms) {
      throw new UnsupportedGraphException(
        `The hierarchy aware processor ${childCms.toString()} in child node ${child.toString()}` +
          ' is only allowed if the root node specifies the same hierarchical processor.',
      );
    }
  });

  // Greedy switch (simply copy the behavior of the root to all children)
  const rootType = root.getProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE);
  graphs.forEach((g) => g.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE, rootType));
}

/** @see ElkLayered.java:365 */
function hasNestedGraph(node: LNode): boolean {
  return node.getNestedGraph() !== null;
}

/** The Java `Iterator<ILayoutProcessor<LGraph>>` over a processor list: `hasNext()` / `next()`. */
export class ProcessorIterator {
  #position = 0;

  constructor(private readonly processors: readonly ILayoutProcessor<LGraph>[]) {}

  hasNext(): boolean {
    return this.#position < this.processors.length;
  }

  next(): ILayoutProcessor<LGraph> {
    return this.processors[this.#position++]!;
  }
}
