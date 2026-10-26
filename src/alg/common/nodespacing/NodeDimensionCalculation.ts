// SPDX-License-Identifier: EPL-2.0
import type { GraphAdapters } from '../../../core/util/adapters/GraphAdapters.js';
import { NodeLabelAndSizeCalculator } from './NodeLabelAndSizeCalculator.js';
import { NodeMarginCalculator } from './NodeMarginCalculator.js';

/**
 * Entry points to apply several methods for node dimension calculation, including positioning of
 * labels, ports, etc.
 *
 * @author uru
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/NodeDimensionCalculation.java
 */
export class NodeDimensionCalculation {
  /** Private constructor - utility class. */
  private constructor() {}

  /**
   * Calculates label sizes and node sizes also considering ports. Make sure that the port lists
   * are sorted properly.
   *
   * @param adapter an instance of an adapter for the passed graph's type.
   * @see NodeDimensionCalculation.sortPortLists
   */
  static calculateLabelAndNodeSizes<T>(adapter: GraphAdapters.GraphAdapter<T>): void {
    NodeLabelAndSizeCalculator.process(adapter);
  }

  /**
   * Calculates node margins for the nodes of the passed graph.
   *
   * If certain functionality has to be excluded, e.g., the sizes of ports should be excluded from
   * the calculated margins, use {@link getNodeMarginCalculator} to retrieve an instance of a
   * {@link NodeMarginCalculator} that can be configured further.
   *
   * @param adapter an instance of an adapter for the passed graph's type.
   */
  static calculateNodeMargins<T>(adapter: GraphAdapters.GraphAdapter<T>): void {
    const calcu = new NodeMarginCalculator(adapter as GraphAdapters.GraphAdapter<unknown>);
    calcu.process();
  }

  /**
   * Returns a configurable {@link NodeMarginCalculator} that can be executed using its `process()`
   * method.
   *
   * @param adapter an instance of an adapter for the passed graph's type.
   * @returns an instance of a {@link NodeMarginCalculator} that can be configured to specific needs.
   */
  static getNodeMarginCalculator<T>(adapter: GraphAdapters.GraphAdapter<T>): NodeMarginCalculator {
    return new NodeMarginCalculator(adapter as GraphAdapters.GraphAdapter<unknown>);
  }

  /**
   * Sorts the port lists of all nodes of the graph clockwise. More precisely, ports are sorted by
   * side (north, east, south, west) in clockwise order, beginning at the top left corner.
   *
   * @param adapter an instance of an adapter for the passed graph's type.
   */
  static sortPortLists<T>(adapter: GraphAdapters.GraphAdapter<T>): void {
    // Iterate through the nodes of all layers
    for (const node of adapter.getNodes()) {
      node.sortPortList();
    }
  }
}
