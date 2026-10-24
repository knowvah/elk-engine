// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import { CoreOptions } from './CoreOptions.js';

/** `Integer.MAX_VALUE` and `Integer.MIN_VALUE`, the initial extrema of the size distribution. */
const INT_MAX_VALUE = 2147483647;
const INT_MIN_VALUE = -2147483648;

/**
 * Utility functions for reuse across different size approximators.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/TopdownSizeApproximatorUtil.java
 */
export class TopdownSizeApproximatorUtil {
  /**
   * Dynamically calculate the multiplier to be applied for the side length of the input node based on the number
   * of children (with and without hierarchy) it and its siblings have. The distribution is mapped to a log scale,
   * which is divided into a number of categories that determine the multiplier.
   *
   * @param originalGraph the graph to obtain the category multiplier for
   * @returns the sidelength multiplier according to the category i.e. Category i => 2^i
   */
  static getSizeCategoryMultiplier(originalGraph: ElkNode): number {
    const parent = originalGraph.getParent();
    const thisGraphsSize = TopdownSizeApproximatorUtil.getGraphSize(originalGraph);

    const categories = originalGraph.getProperty(CoreOptions.TOPDOWN_SIZE_CATEGORIES);

    if (parent !== null) {
      // 1. compute distribution of node sizes
      const sizeMaxFound = TopdownSizeApproximatorUtil.largestChildGraphSize(parent);
      return TopdownSizeApproximatorUtil.categoryMultiplier(thisGraphsSize, sizeMaxFound, categories);
    } else {
      return 1.0;
    }
  }

  /** Step 1 of `getSizeCategoryMultiplier`: the extrema of the children's graph sizes (the minimum is unused). */
  private static largestChildGraphSize(parent: ElkNode): number {
    let sizeMinFound = INT_MAX_VALUE;
    let sizeMaxFound = INT_MIN_VALUE;

    for (const child of parent.getChildren()) {
      const size = TopdownSizeApproximatorUtil.getGraphSize(child);

      if (size > sizeMaxFound) {
        sizeMaxFound = size;
      }
      if (size < sizeMinFound) {
        sizeMinFound = size;
      }
    }
    return sizeMaxFound;
  }

  /** Steps 2 and 3 of `getSizeCategoryMultiplier`: logarithmic cutoffs and the category of this graph's size. */
  private static categoryMultiplier(thisGraphsSize: number, sizeMaxFound: number, categories: number): number {
    const sizeMin = 1;
    let sizeMax = Math.pow(4, categories);
    // shift the range to encompass the largest graph in the local neighbourhood
    if (sizeMaxFound > sizeMax) {
      sizeMax = sizeMaxFound;
    }

    // 2. set cutoffs at quarter percentiles on logarithmic scale
    const x = (Math.log(sizeMax) - Math.log(sizeMin)) / categories;
    const factor = Math.exp(x);

    // 3. assign node size according to dynamic cutoffs
    let cutoff = sizeMin * factor;
    for (let i = 0; i < categories; i++) {
      if (thisGraphsSize < cutoff) {
        return Math.pow(2, i);
      } else {
        cutoff *= factor;
      }
    }
    // largest category
    return Math.pow(2, categories - 1);
  }

  /**
   * Returns the "size" of the graph defined as the sum of the children's weights.
   * Each simple node containing no children is counted with a weight of 1.
   * Each node with further children is counted with a weight defined in
   * `CoreOptions.TOPDOWN_SIZE_CATEGORIES_HIERARCHICAL_NODE_WEIGHT`
   *
   * @param originalGraph the graph
   * @returns the size of the graph
   */
  static getGraphSize(originalGraph: ElkNode): number {
    let sum = 0;

    const hierarchicalNodeWeight = originalGraph.getProperty(
      CoreOptions.TOPDOWN_SIZE_CATEGORIES_HIERARCHICAL_NODE_WEIGHT,
    );
    for (const child of originalGraph.getChildren()) {
      if (child.getChildren().size() > 0) {
        sum += hierarchicalNodeWeight;
      } else {
        sum += 1;
      }
    }
    return sum;
  }
}
