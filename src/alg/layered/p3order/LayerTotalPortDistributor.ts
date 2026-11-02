// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../core/options/PortSide.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import * as Float32 from '../../../java/lang/Float32.js';
import type { LNode } from '../graph/LNode.js';
import { PortType } from '../options/PortType.js';
import { AbstractBarycenterPortDistributor } from './AbstractBarycenterPortDistributor.js';

/**
 * Calculates port ranks in a layer-total way.
 *
 * Port ranks are calculated by giving each node `i` a range of values `[i,i+x]`, where `x` is the number of input ports
 * or output ports. Hence nodes with many ports are assigned a broader range of ranks than nodes with few ports.
 *
 * Java's `calculatePortRanks(LNode, float, PortType)` is `calculatePortRanksForNode` (see the base class).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/LayerTotalPortDistributor.java
 */
export class LayerTotalPortDistributor extends AbstractBarycenterPortDistributor {
  /**
   * Constructs a layer-total port distributor.
   *
   * @see LayerTotalPortDistributor.java:36
   */
  constructor(numLayers: number) {
    super(numLayers);
  }

  /** @see LayerTotalPortDistributor.java:41 */
  protected override calculatePortRanksForNode(node: LNode, rankSum: number, type: PortType): number {
    switch (type) {
      case PortType.INPUT:
        return this.calculateInputPortRanks(node, rankSum);

      case PortType.OUTPUT:
        return this.calculateOutputPortRanks(node, rankSum);

      default:
        // this means illegal input to the method
        throw new IllegalArgumentException();
    }
  }

  /** The `INPUT` case of `calculatePortRanks` (`LayerTotalPortDistributor.java:45-72`). */
  private calculateInputPortRanks(node: LNode, rankSum: number): number {
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
    let northPos = Float32.add(rankSum, northInputCount);
    let restPos = Float32.add(rankSum, inputCount);
    for (const port of node.getPorts(PortType.INPUT)) {
      if (port.getSide() === PortSide.NORTH) {
        portRanks[port.id] = northPos;
        northPos = Float32.sub(northPos, 1);
      } else {
        portRanks[port.id] = restPos;
        restPos = Float32.sub(restPos, 1);
      }
    }

    // the consumed rank corresponds to the number of input ports
    return inputCount;
  }

  /** The `OUTPUT` case of `calculatePortRanks` (`LayerTotalPortDistributor.java:74-82`). */
  private calculateOutputPortRanks(node: LNode, rankSum: number): number {
    const portRanks = this.getPortRanks();

    // Iterate output ports in their natural order, that is north - east - south - west
    let pos = 0;
    for (const port of node.getPorts(PortType.OUTPUT)) {
      pos++;
      portRanks[port.id] = Float32.add(rankSum, pos);
    }
    return pos;
  }
}
