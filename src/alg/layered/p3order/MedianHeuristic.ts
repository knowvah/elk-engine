// SPDX-License-Identifier: EPL-2.0
import { compare as doubleCompare } from '../../../java/lang/DoubleCompare.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { Random } from '../../../java/util/Random.js';
import type { LNode } from '../graph/LNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import type { ICrossingMinimizationHeuristic } from './ICrossingMinimizationHeuristic.js';
import type { LNodeComparator } from './ModelOrderBarycenterHeuristicInsertionSort.js';

/**
 * A Heuristic for minimizing crossings using weights and propagated medians. After assigning random weights to the
 * first layer, subsequent layers are ordered according to their nodes' adjacent nodes' median weights.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/MedianHeuristic.java
 */
export class MedianHeuristic implements ICrossingMinimizationHeuristic {
  /** the random number generator. */
  protected readonly random: Random;

  /** @see MedianHeuristic.java:38 */
  constructor(random: Random) {
    this.random = random;
    // Java calls `Math.random()` and discards the value (MedianHeuristic.java:41): no state is read or written.
    void Math.random();
  }

  /** @see MedianHeuristic.java:49 */
  alwaysImproves(): boolean {
    return false;
  }

  /** @see MedianHeuristic.java:61 */
  setFirstLayerOrder(order: LNode[][], forwardSweep: boolean): boolean {
    // determine first index (
    const firstIndex = forwardSweep ? 0 : Math.max(0, order.length - 1);
    // extract firstLayer from 2D-array
    const firstLayer: LNode[] = [...order[firstIndex]!];
    // set random weights for nodes in firstLayer
    for (const node of firstLayer) {
      node.setProperty(InternalProperties.WEIGHT, this.random.nextDouble());
    }
    // sort firstLayer by their (randomized) weights
    // Collections.sort() is order-preserving (stable)
    firstLayer.sort(this.weightComparator);
    // insert nodes back into array
    let index = 0;
    for (const node of firstLayer) {
      order[firstIndex]![index++] = node;
      // overwrite the weight with an integer from 1 to n
      node.setProperty(InternalProperties.WEIGHT, index);
      // should the node's id be set as well?
    }

    return false;
  }

  /** @see MedianHeuristic.java:93 */
  minimizeCrossings(order: LNode[][], freeLayerIndex: number, forwardSweep: boolean, isFirstSweep: boolean): boolean {
    void isFirstSweep; // unused in Java as well
    const freeLayer: LNode[] = [...order[freeLayerIndex]!];
    // calculate Medians for the free Layer (does not sort the free layer)
    this.calculateMedians(freeLayer, forwardSweep ? freeLayerIndex - 1 : freeLayerIndex + 1);
    // sort the free Layer
    freeLayer.sort(this.weightComparator);
    // and insert the free Layer back into the array
    let index = 0;
    for (const node of freeLayer) {
      order[freeLayerIndex]![index++] = node;
      // should the node's id be set as well?
    }
    return false;
  }

  /**
   * calculates the medians and writes them into the nodes as a property
   *
   * @param nodes the list of nodes for which medians should be calculated, all in one layer
   * @param referenceLayer the Layer from which nodes should be taken into account when calculating medians
   * @see MedianHeuristic.java:116
   */
  private calculateMedians(nodes: LNode[], referenceLayer: number): void {
    // minimum and maximum weight in free layer. `Double.MIN_VALUE` is the smallest positive double (not the most
    // negative), a verbatim quirk of the Java.
    let minWeight = Number.MIN_VALUE;
    let maxWeight = Number.MAX_VALUE;
    // a list to be filled with nodes whose weights cannot be calculated from the referenceLayer alone.
    const toRevisit: LNode[] = [];

    // iterate through nodes
    for (const node of nodes) {
      const connectedNodes = this.collectConnectedNodes(node, referenceLayer);
      // if the node's weight cannot be determined from referenceLayer (no connected nodes in that layer), save
      // this node in order to revisit it later
      if (connectedNodes.length === 0) {
        toRevisit.push(node);
      } else {
        // Collections.sort() is stable
        // therefore, no sort of normalization is needed
        // nodes will not keep switching places if they have the same weight
        connectedNodes.sort(this.weightComparator);
        // calculate weight from the median of connected nodes' weights
        const newWeight = connectedNodes[Int32.div(connectedNodes.length, 2)]!.getProperty(InternalProperties.WEIGHT);
        node.setProperty(InternalProperties.WEIGHT, newWeight);
        // update minWeight and maxWeight
        minWeight = Math.min(minWeight, newWeight);
        maxWeight = Math.max(maxWeight, newWeight);
      }
    }
    // if no nodes had any weight, avgWeight = 0
    const avgWeight = (maxWeight + minWeight) / 2.0;
    // go through yet unvisited nodes and set their weight to the layer's average
    for (const n of toRevisit) {
      n.setProperty(InternalProperties.WEIGHT, avgWeight);
    }
  }

  /** The two edge loops of `calculateMedians` (`MedianHeuristic.java:125-148`): the node's neighbours in the layer. */
  private collectConnectedNodes(node: LNode, referenceLayer: number): LNode[] {
    const connectedNodes: LNode[] = [];
    // for every outgoing and incoming edge
    for (const edge of node.getIncomingEdges()) {
      // add the adjacent node's weight to the weight list
      const target = edge.getTarget()!.getNode()!;
      const source = edge.getSource()!.getNode()!;
      if (target.getLayer()!.id === referenceLayer) {
        connectedNodes.push(target);
      }
      if (source.getLayer()!.id === referenceLayer) {
        connectedNodes.push(source);
      }
    }
    for (const edge of node.getOutgoingEdges()) {
      const target = edge.getTarget()!.getNode()!;
      const source = edge.getSource()!.getNode()!;
      if (target.getLayer()!.id === referenceLayer) {
        connectedNodes.push(target);
      }
      if (source.getLayer()!.id === referenceLayer) {
        connectedNodes.push(source);
      }
    }
    return connectedNodes;
  }

  /** @see MedianHeuristic.java:179 */
  isDeterministic(): boolean {
    return true;
  }

  /**
   * Compares two {@link LNode}s based on their weights. Assume that both nodes have weights set.
   *
   * @see MedianHeuristic.java:186
   */
  protected weightComparator: LNodeComparator = (n1, n2) => {
    // even if weights are not set, return an appropriate value
    // if neither weight is set, the return value does not matter (here: return 1)
    if (!n1.hasProperty(InternalProperties.WEIGHT)) {
      return 1;
    }
    if (!n2.hasProperty(InternalProperties.WEIGHT)) {
      return -1;
    }
    const w1: number | null = n1.getProperty(InternalProperties.WEIGHT);
    const w2: number | null = n2.getProperty(InternalProperties.WEIGHT);
    if (w1 !== null && w2 !== null) {
      return doubleCompare(w1, w2);
    }
    // everything from here should not occur as weightComparator will only be called once weights have been set
    // will it??
    else if (w1 !== null) {
      return -1;
    } else if (w2 !== null) {
      return 1;
    }
    return 0;
  };
}
