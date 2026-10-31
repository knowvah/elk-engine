// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../core/options/PortSide.js';
import * as Float32 from '../../../java/lang/Float32.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { LNode } from '../graph/LNode.js';
import { PortType } from '../options/PortType.js';
import { AbstractBarycenterPortDistributor } from './AbstractBarycenterPortDistributor.js';

/**
 * Calculates port ranks in a node-relative way.
 *
 * Port ranks are calculated by giving each node `i` a range of values `[i,i+1]` to distribute their port values in.
 * This effectively gives a node with many ports the same weight as a node with few ports as opposed to a strategy that
 * just numbers ports from top to bottom.
 *
 * Java's `calculatePortRanks(LNode, float, PortType)` is `calculatePortRanksForNode` (see the base class).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/NodeRelativePortDistributor.java
 */
export class NodeRelativePortDistributor extends AbstractBarycenterPortDistributor {
  /**
   * Constructs a node-relative port distributor.
   *
   * @param numLayers The number of layers in the graph.
   * @see NodeRelativePortDistributor.java:41
   */
  constructor(numLayers: number) {
    super(numLayers);
  }

  /** @see NodeRelativePortDistributor.java:46 */
  protected override calculatePortRanksForNode(node: LNode, rankSum: number, type: PortType): number {
    switch (type) {
      case PortType.INPUT:
        this.calculateInputPortRanks(node, rankSum);
        break;

      case PortType.OUTPUT:
        this.calculateOutputPortRanks(node, rankSum);
        break;

      default:
        // this means illegal input to the method
        throw new IllegalArgumentException('Port type is undefined');
    }

    // the consumed rank is always 1
    return 1;
  }

  /** The `INPUT` case of `calculatePortRanks` (`NodeRelativePortDistributor.java:50-77`). */
  private calculateInputPortRanks(node: LNode, rankSum: number): void {
    const portRanks = this.getPortRanks();

    // Count the number of input ports, and additionally the north-side input ports
    let inputCount = 0;
    let northInputCount = 0;
    for (const port of node.getPorts()) {
      if (port.getIncomingEdges().length > 0) {
        inputCount++;
        if (port.getSide() === PortSide.NORTH) {
          northInputCount++;
        }
      }
    }

    // Assign port ranks in the order north - west - south - east
    const incr = Float32.div(1.0, inputCount + 1);
    let northPos = Float32.add(rankSum, Float32.mul(northInputCount, incr));
    let restPos = Float32.sub(Float32.add(rankSum, 1), incr);
    for (const port of node.getPorts(PortType.INPUT)) {
      if (port.getSide() === PortSide.NORTH) {
        portRanks[port.id] = northPos;
        northPos = Float32.sub(northPos, incr);
      } else {
        portRanks[port.id] = restPos;
        restPos = Float32.sub(restPos, incr);
      }
    }
  }

  /** The `OUTPUT` case of `calculatePortRanks` (`NodeRelativePortDistributor.java:78-96`). */
  private calculateOutputPortRanks(node: LNode, rankSum: number): void {
    const portRanks = this.getPortRanks();

    // Count the number of output ports
    let outputCount = 0;
    for (const port of node.getPorts()) {
      if (port.getOutgoingEdges().length > 0) {
        outputCount++;
      }
    }

    // Iterate output ports in their natural order, that is north - east - south - west
    const incr = Float32.div(1.0, outputCount + 1);
    let pos = Float32.add(rankSum, incr);
    for (const port of node.getPorts(PortType.OUTPUT)) {
      portRanks[port.id] = pos;
      pos = Float32.add(pos, incr);
    }
  }
}
