// SPDX-License-Identifier: EPL-2.0
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { PortListSorter } from '../intermediate/PortListSorter.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Stores node and port order for a sweep.
 *
 * The Java constructors `SweepCopy(LNode[][])` and `SweepCopy(SweepCopy)` are one overloaded constructor
 * (translation-rules 6.5, distinguished at run time).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/SweepCopy.java
 */
export class SweepCopy {
  /** Saves a copy of the node order. */
  private readonly nodeOrder: LNode[][] | null;
  /** Saves a copy of the orders of the ports on each node, because they are reordered in each sweep. */
  private readonly portOrders: LPort[][][];

  /**
   * Copies on construction.
   *
   * @see SweepCopy.java:53 (`SweepCopy(LNode[][])`) and :58 (`SweepCopy(SweepCopy)`, which copies the port orders
   *   list shallowly)
   */
  constructor(nodeOrderIn: LNode[][]);
  constructor(sc: SweepCopy);
  constructor(source: LNode[][] | SweepCopy) {
    if (source instanceof SweepCopy) {
      this.nodeOrder = this.deepCopy(source.nodeOrder);
      this.portOrders = [...source.portOrders];
    } else {
      this.nodeOrder = this.deepCopy(source);
      this.portOrders = [];
      for (const lNodes of source) {
        const layer: LPort[][] = [];
        this.portOrders.push(layer);
        for (const node of lNodes) {
          layer.push([...node.getPorts()]);
        }
      }
    }
  }

  /** @see SweepCopy.java:70 */
  private deepCopy(currentlyBestNodeOrder: LNode[][] | null): LNode[][] | null {
    if (currentlyBestNodeOrder === null) {
      return null;
    }
    const result: LNode[][] = new Array<LNode[]>(currentlyBestNodeOrder.length);
    for (let i = 0; i < result.length; i++) {
      result[i] = [...currentlyBestNodeOrder[i]!];
    }
    return result;
  }

  /**
   * Returns the copy of the node orders. WARNING: Do not change, or the copy will be invalid.
   *
   * @returns the nodeOrder
   * @see SweepCopy.java:86
   */
  nodes(): LNode[][] {
    return this.nodeOrder!;
  }

  /**
   * @see SweepCopy.java:93
   */
  transferNodeAndPortOrdersToGraph(lGraph: LGraph, setPortContstraints: boolean): void {
    // the {@link LayeredOptions.ALLOW_NON_FLOW_PORTS_TO_SWITCH_SIDES} option allows the crossing minimizer
    // to decide the side a corresponding dummy node is placed on in order to reduce the number of crossings
    // as a consequence the configured port side may not be valid anymore and has to be corrected
    const northSouthPortDummies: LNode[] = [];
    // Java HashSet<LNode> (identity-hashed, AD-10): insertion order; each element is handled independently
    const updatePortOrder = new Set<LNode>();

    // iterate the layers
    const layers = lGraph.getLayers();
    for (let i = 0; i < layers.length; i++) {
      const nodes = layers[i]!.getNodes();
      northSouthPortDummies.length = 0;

      // iterate and order the nodes within the layer
      this.transferNodes(i, nodes, northSouthPortDummies, setPortContstraints);

      // assert that the port side is set properly
      for (const dummy of northSouthPortDummies) {
        const origin = this.assertCorrectPortSides(dummy);
        updatePortOrder.add(origin);
        updatePortOrder.add(dummy);
      }
    }

    // since the side of certain ports may have changed at this point,
    // the list of ports must be re-sorted (see PortListSorter)
    // and the port list views must be re-cached.
    for (const node of updatePortOrder) {
      node.getPorts().sort(PortListSorter.CMP_COMBINED);
      node.cachePortSides();
    }
  }

  /** The node loop of {@link transferNodeAndPortOrdersToGraph} (`SweepCopy.java:107-125`), for layer `i`. */
  private transferNodes(i: number, nodes: LNode[], northSouthPortDummies: LNode[], setPortContstraints: boolean): void {
    for (let j = 0; j < nodes.length; j++) {
      const node = this.nodeOrder![i]![j]!;
      // use the id field to remember the order within the layer
      node.id = j;
      if (node.getType() === NodeType.NORTH_SOUTH_PORT) {
        northSouthPortDummies.push(node);
      }

      nodes[j] = node;
      // order ports as computed
      const ports = node.getPorts();
      ports.length = 0;
      ports.push(...this.portOrders[i]![j]!);
      if (setPortContstraints) {
        if (!node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isOrderFixed()) {
          node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
        }
      }
    }
  }

  /**
   * Corrects the {@link PortSide} of dummy's origin.
   *
   * @returns The {@link LNode} ('origin') whose port `dummy` represents.
   * @see SweepCopy.java:148
   */
  private assertCorrectPortSides(dummy: LNode): LNode {
    // Java `assert dummy.getType() == NodeType.NORTH_SOUTH_PORT` (SweepCopy.java:140): assertions are disabled by
    // default and omitted (translation-rules 6.8)

    const origin = dummy.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT);

    // a north south port dummy has exactly one port
    const dummyPorts = dummy.getPorts();
    const dummyPort = dummyPorts[0]!;

    // find the corresponding port on the regular node
    for (const port of origin.getPorts()) {
      if (port === dummyPort.getProperty(InternalProperties.ORIGIN)) {
        // switch the port's side if necessary
        if (port.getSide() === PortSide.NORTH && dummy.id > origin.id) {
          port.setSide(PortSide.SOUTH);
          if (port.isExplicitlySuppliedPortAnchor()) {
            // Set new coordinates for port anchor since it was switched from NORTH to SOUTH.
            // The y coordinate is updated by mirroring the y coordinate
            const portHeight = port.getSize().y;
            const anchorY = port.getAnchor().y;
            port.getAnchor().y = portHeight - anchorY;
          }
        } else if (port.getSide() === PortSide.SOUTH && origin.id > dummy.id) {
          port.setSide(PortSide.NORTH);
          if (port.isExplicitlySuppliedPortAnchor()) {
            // Set new coordinates for port anchor since it was switched from NORTH to SOUTH.
            // The y coordinate is updated by mirroring the y coordinate
            const portHeight = port.getSize().y;
            const anchorY = port.getAnchor().y;
            port.getAnchor().y = -(portHeight - anchorY);
          }
        }
        break;
      }
    }
    return origin;
  }
}
