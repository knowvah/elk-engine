// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { LGraph } from '../graph/LGraph.js';
import { PortType } from '../options/PortType.js';
import type { CrossHierarchyEdge } from './CrossHierarchyEdge.js';

/**
 * Compares cross-hierarchy edge segments such that they can be sorted from the start to the end segment.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CrossHierarchyEdgeComparator.java
 */
export class CrossHierarchyEdgeComparator {
  private readonly graph: LGraph;

  /**
   * Creates a new comparator for sorting cross-hierarchy edge segments for the given top-level compound graph.
   *
   * @param graph the top-level compound graph.
   */
  constructor(graph: LGraph) {
    this.graph = graph;
  }

  compare(edge1: CrossHierarchyEdge, edge2: CrossHierarchyEdge): number {
    if (edge1.getType() === PortType.OUTPUT && edge2.getType() === PortType.INPUT) {
      return -1;
    } else if (edge1.getType() === PortType.INPUT && edge2.getType() === PortType.OUTPUT) {
      return 1;
    }
    const level1 = CrossHierarchyEdgeComparator.hierarchyLevel(edge1.getGraph(), this.graph);
    const level2 = CrossHierarchyEdgeComparator.hierarchyLevel(edge2.getGraph(), this.graph);
    if (edge1.getType() === PortType.OUTPUT) {
      // from deeper level to higher level
      return level2 - level1;
    }
    // from higher level to deeper level
    return level1 - level2;
  }

  /**
   * Compute the hierarchy level of the given nested graph.
   *
   * @param nestedGraph a nested graph
   * @param topLevelGraph the top-level graph
   * @return the hierarchy level (higher number means the node is nested deeper)
   */
  private static hierarchyLevel(nestedGraph: LGraph, topLevelGraph: LGraph): number {
    let currentGraph = nestedGraph;
    let level = 0;
    for (;;) {
      if (currentGraph === topLevelGraph) {
        return level;
      }
      const currentNode = currentGraph.getParentNode();
      if (currentNode === null) {
        // the given node is not an ancestor of the graph node
        throw new IllegalArgumentException();
      }
      currentGraph = currentNode.getGraph()!;
      level++;
    }
  }
}
