// SPDX-License-Identifier: EPL-2.0
import { ElkMargin } from '../../../../core/math/ElkMargin.js';
import { KVector } from '../../../../core/math/KVector.js';
import { PortLabelPlacement } from '../../../../core/options/PortLabelPlacement.js';
import type { GraphAdapters } from '../../../../core/util/adapters/GraphAdapters.js';
import type { LabelCell } from '../cellsystem/LabelCell.js';
// NodeContext and PortContext refer to each other; both only need the other as a type (Q3), so the cycle is
// erased at runtime.
import type { NodeContext } from './NodeContext.js';

/** Java's `iterable.iterator().hasNext()`. */
function hasNext(iterable: Iterable<unknown>): boolean {
  return !iterable[Symbol.iterator]().next().done;
}

/**
 * Data holder class to be passed around to avoid having too much state in the size calculation classes. Port contexts
 * are part of {@link NodeContext node contexts}. The position of a port calculated as part of the algorithm should
 * first be stored in {@link portPosition} and only be applied at the end of the algorithm, if required.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/PortContext.java
 */
export class PortContext {
  /** The node the port belongs to. */
  readonly parentNodeContext: NodeContext;
  /** The port we calculate stuff for. */
  readonly port: GraphAdapters.PortAdapter<unknown>;
  /** The port's position, to be modified by the algorithm and possibly applied later. */
  readonly portPosition: KVector;
  /** Whether the port's labels need to be placed next to the port. */
  readonly labelsNextToPort: boolean;

  /**
   * Margin around the port to assume when placing the port. If node labels are taken into consideration, this will
   * for example include the label cell. When placing the ports, this is the size the port will be assumed to have.
   */
  portMargin: ElkMargin = new ElkMargin();
  /** The cell we place our port labels in. */
  portLabelCell: LabelCell | null = null;

  /**
   * Creates a new context object for the given port, fully initialized with the port's settings.
   *
   * @param parentNodeContext the port's parent node context.
   * @param port the port to create the context for.
   */
  constructor(parentNodeContext: NodeContext, port: GraphAdapters.PortAdapter<unknown>) {
    this.parentNodeContext = parentNodeContext;
    this.port = port;
    this.portPosition = new KVector(port.getPosition());

    const portLabelsNextToPort = parentNodeContext.portLabelsPlacement.contains(
      PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE,
    );

    // Whether labels are supposed to be placed next to their port is determined differently depending on whether
    // they are to be placed inside or outside
    if (parentNodeContext.portLabelsPlacement.contains(PortLabelPlacement.INSIDE)) {
      if (parentNodeContext.treatAsCompoundNode) {
        // There might be connections to the inside. That means that we may want to place port labels next to
        // their port, if possible
        this.labelsNextToPort = portLabelsNextToPort && !port.hasCompoundConnections();
      } else {
        this.labelsNextToPort = true;
      }
    } else if (parentNodeContext.portLabelsPlacement.contains(PortLabelPlacement.OUTSIDE)) {
      if (portLabelsNextToPort) {
        // We can place a label next to an outside port if that port doesn't have incident edges
        this.labelsNextToPort = !(hasNext(port.getIncomingEdges()) || hasNext(port.getOutgoingEdges()));
      } else {
        // We are not to place labels next to the port anyway
        this.labelsNextToPort = false;
      }
    } else {
      this.labelsNextToPort = false;
    }
  }

  /**
   * Applies the port position stored in this context to the actual port.
   */
  applyPortPosition(): void {
    this.port.setPosition(this.portPosition);
  }
}
