// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Lists from '../../../guava/Lists.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import type { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { OrderingStrategy } from '../options/OrderingStrategy.js';
import { USE_NEW_APPROACH, createDummyNodes } from './NorthSouthPortPreprocessorDummies.js';
import { modelOrderNorthSouthInputReversing, sortPortList } from './NorthSouthPortPreprocessorPortSorting.js';

/** The two dummy lists `process` allocates once and clears per node (`:155-156`). */
interface DummyNodeLists {
  readonly northDummyNodes: LNode[];
  readonly southDummyNodes: LNode[];
}

/**
 * Inserts dummy nodes to cope with northern and southern ports.
 *
 * For each node with northern or southern ports, dummy nodes are inserted in the node's layer above or below the node
 * (for northern and southern ports, respectively). The new approach (`USE_NEW_APPROACH`, always on) creates a single
 * dummy node for every northern port, without two ports sharing a dummy node, and leaves the ordering to the crossing
 * minimization phase. The only necessary constraints are that dummy nodes created for northern ports must have their
 * regular node as their successor (similarly, the regular node must have all dummy nodes created for southern ports as
 * successors). Self-loops involving northern or southern ports are handled by the `DummySelfLoopProcessor` and this
 * processor.
 *
 * Facade over the section files `NorthSouthPortPreprocessorPortSorting` and `NorthSouthPortPreprocessorDummies` (Java is
 * 718 lines).
 *
 * Precondition: a layered graph; nodes have fixed port sides. Postcondition: dummy nodes have been inserted for edges
 * connected to ports on north and south sides, with layout groups and node successor constraints set. Slots: before
 * phase 3. Same-slot dependencies: `PortListSorter`, `DummySelfLoopProcessor`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/NorthSouthPortPreprocessor.java
 */
export class NorthSouthPortPreprocessor implements ILayoutProcessor<LGraph> {
  /** @see NorthSouthPortPreprocessor.java:151 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Odd port side processing', 1);

    let pointer: number;
    const lists: DummyNodeLists = {
      northDummyNodes: Lists.newArrayList<LNode>(),
      southDummyNodes: Lists.newArrayList<LNode>(),
    };

    // Iterate through the layers
    for (const layer of layeredGraph) {
      // The pointer indicates the index of the current node while northern ports are
      // processed,
      // and the index of the most recently inserted dummy while south ports are processed
      pointer = -1;

      // Iterate through the nodes (use an array to avoid concurrent modification exceptions)
      const nodeArray = LGraphUtil.toNodeArray(layer.getNodes());
      for (const node of nodeArray) {
        pointer++;

        // We only care about non-dummy nodes with fixed port sides
        if (!(node.getType() === NodeType.NORMAL && node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed())) {
          continue;
        }

        pointer = this.#processNode(layeredGraph, layer, node, pointer, lists);
      }
    }

    monitor.done();
  }

  /** The body of the node loop of `process` (`:166-306`) after the guard; returns the updated pointer. */
  #processNode(layeredGraph: LGraph, layer: Layer, node: LNode, pointer: number, lists: DummyNodeLists): number {
    const { northDummyNodes, southDummyNodes } = lists;
    this.#prepareNode(node, lists);

    // Create a list of barycenter associates for the node
    const barycenterAssociates: LNode[] = Lists.newArrayList<LNode>();

    // Prepare a list of ports on the northern side, sorted from left to right (when viewed
    // in the diagram); create the appropriate dummy nodes and assign them to the layer
    let portList: LPort[] = Lists.newLinkedList(node.getPorts(PortSide.NORTH));

    if (node.getGraph()!.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY) !== OrderingStrategy.NONE) {
      portList = modelOrderNorthSouthInputReversing(portList, node);
    }

    createDummyNodes(layeredGraph, portList, northDummyNodes, southDummyNodes, barycenterAssociates);

    pointer = this.#insertNorthernDummies(layer, node, pointer, northDummyNodes);

    // Do the same for ports on the southern side; the list of ports must be built in
    // reversed order, since ports on the southern side are listed from right to left
    portList = [];
    for (const port of node.getPorts(PortSide.SOUTH)) {
      portList.unshift(port);
    }

    if (node.getGraph()!.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY) !== OrderingStrategy.NONE) {
      portList = modelOrderNorthSouthInputReversing(portList, node);
    }

    createDummyNodes(layeredGraph, portList, southDummyNodes, null, barycenterAssociates);

    pointer = this.#insertSouthernDummies(layer, node, pointer, southDummyNodes);

    // If the list of barycenter associates contains nodes, set the appropriate property
    if (barycenterAssociates.length !== 0) {
      node.setProperty(InternalProperties.BARYCENTER_ASSOCIATES, barycenterAssociates);
    }
    return pointer;
  }

  /** The head of the node loop body (`:166-187`): sort the ports, set the layout unit, clear the dummy lists. */
  #prepareNode(node: LNode, lists: DummyNodeLists): void {
    // Sort the port list if we have control over the port order
    if (
      !node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isOrderFixed() &&
      node.getGraph()!.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY) === OrderingStrategy.NONE
    ) {
      sortPortList(node);
    }

    // Nodes form their own layout unit
    node.setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, node);

    // Clear the lists of northern and southern dummy nodes
    lists.northDummyNodes.length = 0;
    lists.southDummyNodes.length = 0;
  }

  /**
   * We will now iterate over all nodes and insert successor constraints to each one of them. If we're using the old
   * constrained approach, each dummy has the next dummy as its successor. If we use the new unconstrained approach, each
   * dummy on the northern side has its regular node as a successor while the node has all southern dummies as its
   * successors. This is the northern half (`:233-272`); returns the updated pointer.
   */
  #insertNorthernDummies(layer: Layer, node: LNode, pointer: number, northDummyNodes: readonly LNode[]): number {
    const insertPoint = pointer;
    let successor = node;
    for (const dummy of northDummyNodes) {
      dummy.setLayer(insertPoint, layer);
      pointer++;

      // The dummy nodes form a layout unit identified by the node they were created from.
      // In addition, northern dummy nodes must appear before the regular node
      dummy.setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, node);

      // If originPort has port constraint ALLOW_NON_FLOW_PORTS_TO_SWITCH_SIDES,
      // do not apply successor constraints to the dummy node dummy.
      // Their position will be determined according to their barycenter value.
      // If originPort does not have the port constraint ALLOW_NON_FLOW_PORTS_TO_SWITCH_SIDES,
      // the dummy node dummy needs to appear before the regular node.

      // Each dummy node has least one port (there may be two if an odd port
      // has both an incoming and an outgoing edge, however the origin is the same).
      // (Java `assert dummy.getPorts().size() >= 1` at `:254`: disabled by default, omitted.)
      const dummyPort = dummy.getPorts()[0]!;
      // The port the dummy node was created for (a checked Java cast: the origin is always an `LPort` here)
      const originPort = dummyPort.getProperty(InternalProperties.ORIGIN) as LPort;

      if (!originPort.getProperty(LayeredOptions.ALLOW_NON_FLOW_PORTS_TO_SWITCH_SIDES)) {
        dummy.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS).push(successor);
      }

      if (!USE_NEW_APPROACH) {
        // The old approach needs the successor to always point to the most recently
        // created dummy node
        successor = dummy;
      }
    }
    return pointer;
  }

  /** The southern half of the successor-constraint insertion (`:293-330`); returns the updated pointer. */
  #insertSouthernDummies(layer: Layer, node: LNode, pointer: number, southDummyNodes: readonly LNode[]): number {
    let predecessor = node;
    for (const dummy of southDummyNodes) {
      dummy.setLayer(++pointer, layer);

      // The dummy nodes form a layout unit identified by the node they were created from.
      // In addition, southern dummy nodes must appear after the regular node
      dummy.setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, node);

      // If originPort has port constraint ALLOW_NON_FLOW_PORTS_TO_SWITCH_SIDES,
      // do not apply successor constraints to the dummy node dummy.
      // Their position will be determined according to their barycenter value.
      // If originPort does not have the port constraint ALLOW_NON_FLOW_PORTS_TO_SWITCH_SIDES,
      // the dummy node dummy needs to appear before the regular node.

      // Each dummy node has at least one port (there may be two if an odd port
      // has both an incoming and an outgoing edge, however the origin is the same).
      // (Java `assert dummy.getPorts().size() >= 1` at `:307`: disabled by default, omitted.)
      const dummyPort = dummy.getPorts()[0]!;
      // The port the dummy node was created for (a checked Java cast: the origin is always an `LPort` here)
      const originPort = dummyPort.getProperty(InternalProperties.ORIGIN) as LPort;

      if (!originPort.getProperty(LayeredOptions.ALLOW_NON_FLOW_PORTS_TO_SWITCH_SIDES)) {
        predecessor.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS).push(dummy);
      }

      if (!USE_NEW_APPROACH) {
        // The old approach needs the predecessor to always point to the most
        // recently
        // created dummy node
        predecessor = dummy;
      }
    }
    return pointer;
  }
}
