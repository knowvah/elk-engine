// SPDX-License-Identifier: EPL-2.0
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import type { GraphAdapters } from '../../../../../core/util/adapters/GraphAdapters.js';
import { IllegalArgumentException } from '../../../../../java/lang/IllegalArgumentException.js';
import { LabelCell } from '../../cellsystem/LabelCell.js';
import type { NodeContext } from '../NodeContext.js';
import { PortContext } from '../PortContext.js';

/**
 * Creates port context objects and assigns volatile IDs to all ports. Also, unless port labels are fixed, the labels
 * are added to the port context label cells.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortContextCreator.java
 */
export class PortContextCreator {
  /**
   * No instance required.
   */
  private constructor() {}

  /**
   * Creates and initializes port context objects for each of the node's ports. This also involves setting up the
   * label cell associated with each port, although the node label placement therein
   *
   * @param nodeContext the node context.
   * @param ignoreInsidePortLabels whether inside port labels are left out of the port label cells.
   */
  static createPortContexts(nodeContext: NodeContext, ignoreInsidePortLabels: boolean): void {
    // Hue hue hue... gimme color?
    const imPortLabels =
      !ignoreInsidePortLabels || !nodeContext.portLabelsPlacement.contains(PortLabelPlacement.INSIDE);

    let volatileId = 0;
    for (const port of nodeContext.node.getPorts()) {
      if (port.getSide() === PortSide.UNDEFINED) {
        throw new IllegalArgumentException(
          'Label and node size calculator can only be used with ports that ' + 'have port sides assigned.',
        );
      }

      port.setVolatileId(volatileId++);
      PortContextCreator.createPortContext(nodeContext, port, imPortLabels);
    }
  }

  /**
   * Creates a port context for the given adapter and initializes it properly.
   */
  private static createPortContext(
    nodeContext: NodeContext,
    port: GraphAdapters.PortAdapter<unknown>,
    imPortLabels: boolean,
  ): void {
    const portContext = new PortContext(nodeContext, port);
    nodeContext.portContexts.put(port.getSide(), portContext);

    // If the port has labels and if port labels are to be placed, we need to remember them
    if (imPortLabels && !PortLabelPlacement.isFixed(nodeContext.portLabelsPlacement)) {
      const portLabelCell = new LabelCell(nodeContext.labelLabelSpacing);
      portContext.portLabelCell = portLabelCell;
      for (const label of port.getLabels()) {
        portLabelCell.addLabel(label);
      }
    }
  }
}
