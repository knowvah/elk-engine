// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Makes sure ports have at least a fixed side. If they don't, input ports are assigned to the left and output ports to
 * the right side. This processor can run either before the first phase or before the third phase. In the first slot it
 * assigns port sides before any edges are reversed, hence edges that are reversed later are routed "around" the nodes
 * using inverted ports. This can only be handled correctly if the `InvertedPortProcessor` is active. In the third slot,
 * however, the port sides are assigned _after_ edges are reversed, so no inverted ports will occur. This behavior is
 * controlled by the option `LayeredOptions.FEEDBACK_EDGES`.
 *
 * Precondition: a layered graph. Postcondition: all nodes have their ports distributed, with port constraints set to
 * fixed sides at the least. Slots: before phase 1 or before phase 3. Same-slot dependencies: none.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/PortSideProcessor.java
 */
export class PortSideProcessor implements ILayoutProcessor<LGraph> {
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Port side processing', 1);

    // IF USED BEFORE PHASE 1
    // Iterate through the unlayered nodes of the graph
    for (const node of layeredGraph.getLayerlessNodes()) {
      this.#processNode(node);
    }

    // IF USED BEFORE PHASE 3
    // Iterate through the nodes of all layers
    for (const layer of layeredGraph) {
      for (const node of layer) {
        this.#processNode(node);
      }
    }

    monitor.done();
  }

  /**
   * Process the ports of the given node. (Java: the private overload `process(LNode)`; a different method, not a
   * recursion.)
   */
  #processNode(node: LNode): void {
    if (node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed()) {
      // Check whether there are ports with undefined side
      for (const port of node.getPorts()) {
        if (port.getSide() === PortSide.UNDEFINED) {
          PortSideProcessor.setPortSide(port);
        }
      }
    } else {
      // Distribute all ports and change constraints to fixed side
      for (const port of node.getPorts()) {
        PortSideProcessor.setPortSide(port);
      }
      node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
    }
  }

  /** Places input ports on the left side and output ports on the right side of nodes. */
  static setPortSide(port: LPort): void {
    const portDummy = port.getProperty(InternalProperties.PORT_DUMMY);
    if (portDummy !== null) {
      port.setSide(portDummy.getProperty(InternalProperties.EXT_PORT_SIDE));
    } else if (port.getNetFlow() < 0) {
      port.setSide(PortSide.EAST);
    } else {
      port.setSide(PortSide.WEST);
    }
  }
}
