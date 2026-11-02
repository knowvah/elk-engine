// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../core/options/PortSide.js';
import { ReverseList } from '../../../guava/Lists.js';
import { reverse } from '../../../guava/Lists.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { BetweenLayerEdgeTwoNodeCrossingsCounter } from '../intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounter.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { CrossingsCounter } from './counting/CrossingsCounter.js';
import type { IInitializable } from './counting/IInitializable.js';
import type { ISweepPortDistributor } from './ISweepPortDistributor.js';

/**
 * The Java `List<LPort>` of `distributePortsOnNode`: the node's side view or its `Lists.reverse`, both write-through
 * (C9). `ports.size()`, `ports.get(i)` and `ports.set(i, p)` are `sizeOf`, `getAt` and `setAt`.
 */
type PortList = LPort[] | ReverseList<LPort>;
const sizeOf = (ports: PortList): number => (ports instanceof ReverseList ? ports.size() : ports.length);
const getAt = (ports: PortList, i: number): LPort => (ports instanceof ReverseList ? ports.get(i) : ports[i]!);
const setAt = (ports: PortList, i: number, port: LPort): void => {
  if (ports instanceof ReverseList) {
    ports.set(i, port);
  } else {
    ports[i] = port;
  }
};

/**
 * Distribute ports greedily on a single node.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/GreedyPortDistributor.java
 */
export class GreedyPortDistributor implements ISweepPortDistributor, IInitializable {
  private crossingsCounter!: CrossingsCounter;
  private nPorts = 0;
  private portPos!: Int32Array;
  private hierarchicalCrossingsCounter!: BetweenLayerEdgeTwoNodeCrossingsCounter;

  /** @see GreedyPortDistributor.java:43 */
  distributePortsWhileSweeping(nodeOrder: LNode[][], currentIndex: number, isForwardSweep: boolean): boolean {
    this.initialize(nodeOrder, currentIndex, isForwardSweep);

    return this.distributePortsInLayer(nodeOrder, currentIndex, isForwardSweep);
  }

  /** @see GreedyPortDistributor.java:50 */
  private distributePortsInLayer(nodeOrder: LNode[][], currentIndex: number, isForwardSweep: boolean): boolean {
    const side = isForwardSweep ? PortSide.WEST : PortSide.EAST;
    let improved = false;
    for (const node of nodeOrder[currentIndex]!) {
      if (node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isOrderFixed()) {
        continue;
      }
      const nestedGraph: LGraph | null = node.getNestedGraph();
      const useHierarchicalCrossCounter = node.getPortSideView(side).length !== 0 && nestedGraph !== null;
      if (useHierarchicalCrossCounter) {
        const innerGraph = nestedGraph.toNodeArray();
        this.hierarchicalCrossingsCounter = new BetweenLayerEdgeTwoNodeCrossingsCounter(
          innerGraph,
          isForwardSweep ? 0 : innerGraph.length - 1,
        );
      }
      // `improved |= ...` evaluates the call even when `improved` is already true
      const nodeImproved = this.distributePortsOnNode(node, side, useHierarchicalCrossCounter);
      improved = improved || nodeImproved;
    }
    return improved;
  }

  /**
   * Distribute ports greedily on a single node.
   *
   * @see GreedyPortDistributor.java:73
   */
  private distributePortsOnNode(node: LNode, side: PortSide, useHierarchicalCrosscounter: boolean): boolean {
    const view = node.getPortSideView(side);
    const ports: PortList = side === PortSide.SOUTH || side === PortSide.WEST ? reverse(view) : view;
    let improved = false;
    let continueSwitching: boolean;
    do {
      continueSwitching = false;
      for (let i = 0; i < sizeOf(ports) - 1; i++) {
        const upperPort = getAt(ports, i);
        const lowerPort = getAt(ports, i + 1);
        if (this.switchingDecreasesCrossings(upperPort, lowerPort, node, useHierarchicalCrosscounter)) {
          improved = true;
          this.switchPorts(ports, node, i, i + 1);
          continueSwitching = true;
        }
      }
    } while (continueSwitching);
    return improved;
  }

  /**
   * Initialize crossings counter for given layers and side.
   *
   * @see GreedyPortDistributor.java:97
   */
  private initForLayers(leftLayer: LNode[], rightLayer: LNode[]): void {
    this.crossingsCounter.initForCountingBetween(leftLayer, rightLayer);
  }

  /** @see GreedyPortDistributor.java:101 */
  private switchingDecreasesCrossings(
    upperPort: LPort,
    lowerPort: LPort,
    node: LNode,
    useHierarchicalCrosscounter: boolean,
  ): boolean {
    void node; // unused in Java as well
    const originalNSwitchedCrossings = this.crossingsCounter.countCrossingsBetweenPortsInBothOrders(
      upperPort,
      lowerPort,
    );
    let upperLowerCrossings = originalNSwitchedCrossings.getFirst()!;
    let lowerUpperCrossings = originalNSwitchedCrossings.getSecond()!;
    if (useHierarchicalCrosscounter) {
      const upperNode: LNode | null = upperPort.getProperty(InternalProperties.PORT_DUMMY);
      const lowerNode: LNode | null = lowerPort.getProperty(InternalProperties.PORT_DUMMY);
      if (upperNode !== null && lowerNode !== null) {
        this.hierarchicalCrossingsCounter.countBothSideCrossings(upperNode, lowerNode);
        upperLowerCrossings += this.hierarchicalCrossingsCounter.getUpperLowerCrossings();
        lowerUpperCrossings += this.hierarchicalCrossingsCounter.getLowerUpperCrossings();
      }
    }
    return upperLowerCrossings > lowerUpperCrossings;
  }

  /** @see GreedyPortDistributor.java:119 */
  private switchPorts(ports: PortList, node: LNode, topPort: number, bottomPort: number): void {
    void node; // unused in Java as well
    this.crossingsCounter.switchPorts(getAt(ports, topPort), getAt(ports, bottomPort));
    const lower = getAt(ports, bottomPort);
    setAt(ports, bottomPort, getAt(ports, topPort));
    setAt(ports, topPort, lower);
  }

  /** @see GreedyPortDistributor.java:126 */
  private initialize(nodeOrder: LNode[][], currentIndex: number, isForwardSweep: boolean): void {
    if (isForwardSweep && currentIndex > 0) {
      this.initForLayers(nodeOrder[currentIndex - 1]!, nodeOrder[currentIndex]!);
    } else if (!isForwardSweep && currentIndex < nodeOrder.length - 1) {
      this.initForLayers(nodeOrder[currentIndex]!, nodeOrder[currentIndex + 1]!);
    } else {
      this.crossingsCounter.initPortPositionsForInLayerCrossings(
        nodeOrder[currentIndex]!,
        isForwardSweep ? PortSide.WEST : PortSide.EAST,
      );
    }
  }

  /** @see GreedyPortDistributor.java:140 */
  initAtNodeLevel(l: number, n: number, nodeOrder: LNode[][]): void {
    const node = nodeOrder[l]![n]!;
    this.nPorts += node.getPorts().length;
  }

  /** @see GreedyPortDistributor.java:146 */
  initAfterTraversal(): void {
    this.portPos = new Int32Array(this.nPorts);
    this.crossingsCounter = new CrossingsCounter(this.portPos);
  }
}
