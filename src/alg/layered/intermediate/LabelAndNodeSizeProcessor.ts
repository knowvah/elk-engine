// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { KVector } from '../../../core/math/KVector.js';
import { PortLabelPlacement } from '../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { EnumSet } from '../../../java/util/EnumSet.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { NodeDimensionCalculation } from '../../common/nodespacing/NodeDimensionCalculation.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphAdapters } from '../graph/LGraphAdapters.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * The values `placeExternalPortDummyLabels` reads once and its two box-placement helpers share. The Java method keeps
 * them in locals; the helpers exist only to keep the TS functions under the complexity limits.
 */
interface DummyLabelContext {
  readonly labelPortSpacingHorizontal: number;
  readonly labelPortSpacingVertical: number;
  readonly dummySize: KVector;
  readonly dummyPort: LPort;
  readonly dummyPortPos: KVector;
  readonly placeNextToPortIfPossible: boolean;
  readonly treatAsGroup: boolean;
}

/**
 * Calculates node sizes, places ports, and places node and port labels.
 *
 * Note: Regarding port placement, this processor now does what the old `PortPositionProcessor` did and thus
 * replaces it.
 *
 * Precondition: the graph is layered; crossing minimization is finished; port constraints are at least at
 * `FIXED_ORDER`; port lists are properly sorted going clockwise, starting at the leftmost northern port; external
 * port dummies have the label-port and label-label spacing set that should apply to them. Postcondition: port
 * positions are fixed; port labels and node labels are placed; node sizes are set. Slots: before phase 4.
 * Same-slot dependencies: `LabelSideSelector`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelAndNodeSizeProcessor.java
 */
export class LabelAndNodeSizeProcessor implements ILayoutProcessor<LGraph> {
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Node and Port Label Placement and Node Sizing', 1);

    NodeDimensionCalculation.calculateLabelAndNodeSizes(
      LGraphAdapters.adapt(layeredGraph, true, true, (node) => node.getType() === NodeType.NORMAL),
    );

    // If the graph has external ports, we need to treat labels of external port dummies a bit differently,
    // which is the reason why we haven't handed them to the label and node size processing code
    if (layeredGraph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS)) {
      const portLabelPlacement = layeredGraph.getProperty(LayeredOptions.PORT_LABELS_PLACEMENT);
      const placeNextToPort = portLabelPlacement.contains(PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE);
      const treatAsGroup = layeredGraph.getProperty(LayeredOptions.PORT_LABELS_TREAT_AS_GROUP);

      for (const layer of layeredGraph.getLayers()) {
        layer
          .getNodes()
          .filter((node) => node.getType() === NodeType.EXTERNAL_PORT)
          .forEach((dummy) => {
            this.#placeExternalPortDummyLabels(dummy, portLabelPlacement, placeNextToPort, treatAsGroup);
          });
      }
    }

    monitor.done();
  }

  /**
   * Places the labels of the given external port dummy such that it results in correct node margins later on that
   * will reserve enough space for the labels to be placed once label and node placement is called on the graph.
   */
  #placeExternalPortDummyLabels(
    dummy: LNode,
    graphPortLabelPlacement: EnumSet<PortLabelPlacement>,
    placeNextToPortIfPossible: boolean,
    treatAsGroup: boolean,
  ): void {
    const labelLabelSpacing = dummy.getProperty(LayeredOptions.SPACING_LABEL_LABEL);

    // External port dummies have exactly one port (see ElkGraphImporter)
    const dummyPort = dummy.getPorts()[0];

    const portLabelBox = this.#computePortLabelBox(dummyPort, labelLabelSpacing);
    if (portLabelBox === null) {
      return;
    }

    const context: DummyLabelContext = {
      labelPortSpacingHorizontal: dummy.getProperty(LayeredOptions.SPACING_LABEL_PORT_HORIZONTAL),
      labelPortSpacingVertical: dummy.getProperty(LayeredOptions.SPACING_LABEL_PORT_VERTICAL),
      dummySize: dummy.getSize(),
      dummyPort,
      dummyPortPos: dummyPort.getPosition(),
      placeNextToPortIfPossible,
      treatAsGroup,
    };

    this.#determineBoxPosition(
      portLabelBox,
      graphPortLabelPlacement,
      dummy.getProperty(InternalProperties.EXT_PORT_SIDE),
      context,
    );

    this.#placeLabels(dummyPort, portLabelBox, labelLabelSpacing);
  }

  /** The `// Determine the position of the box` section of `placeExternalPortDummyLabels`. */
  #determineBoxPosition(
    portLabelBox: ElkRectangle,
    graphPortLabelPlacement: EnumSet<PortLabelPlacement>,
    side: PortSide,
    context: DummyLabelContext,
  ): void {
    // TODO We could handle FIXED here as well
    if (graphPortLabelPlacement.contains(PortLabelPlacement.INSIDE)) {
      // (port label placement has to support this case first, though)
      this.#placeInsideBox(portLabelBox, side, context);
    } else if (graphPortLabelPlacement.contains(PortLabelPlacement.OUTSIDE)) {
      this.#placeOutsideBox(portLabelBox, side, context);
    }
  }

  /** The `// Place the labels` section of `placeExternalPortDummyLabels`. */
  #placeLabels(dummyPort: LPort, portLabelBox: ElkRectangle, labelLabelSpacing: number): void {
    let currentY = portLabelBox.y;
    for (const label of dummyPort.getLabels()) {
      const labelPos = label.getPosition();

      labelPos.x = portLabelBox.x;
      labelPos.y = currentY;

      currentY += label.getSize().y + labelLabelSpacing;
    }
  }

  /** The `INSIDE` branch of the box-position determination of `placeExternalPortDummyLabels`. */
  #placeInsideBox(portLabelBox: ElkRectangle, side: PortSide, context: DummyLabelContext): void {
    const { dummySize, dummyPortPos } = context;
    switch (side) {
      case PortSide.NORTH:
        portLabelBox.x = (dummySize.x - portLabelBox.width) / 2 - dummyPortPos.x;
        portLabelBox.y = context.labelPortSpacingVertical;
        break;

      case PortSide.SOUTH:
        portLabelBox.x = (dummySize.x - portLabelBox.width) / 2 - dummyPortPos.x;
        portLabelBox.y = -context.labelPortSpacingVertical - portLabelBox.height;
        break;

      case PortSide.EAST:
        this.#placeInsideBoxY(portLabelBox, context);
        portLabelBox.x = -context.labelPortSpacingHorizontal - portLabelBox.width;
        break;

      case PortSide.WEST:
        this.#placeInsideBoxY(portLabelBox, context);
        portLabelBox.x = context.labelPortSpacingHorizontal;
        break;

      default:
        // Java's switch has no default: other sides leave the box unchanged.
        break;
    }
  }

  /** The vertical placement shared by the `EAST` and `WEST` cases of the `INSIDE` branch (duplicated in the Java). */
  #placeInsideBoxY(portLabelBox: ElkRectangle, context: DummyLabelContext): void {
    const { dummySize, dummyPort, dummyPortPos } = context;
    if (this.#labelNextToPort(dummyPort, true, context.placeNextToPortIfPossible)) {
      const labelHeight = context.treatAsGroup ? portLabelBox.height : dummyPort.getLabels()[0].getSize().y;
      portLabelBox.y = (dummySize.y - labelHeight) / 2 - dummyPortPos.y;
    } else {
      portLabelBox.y = dummySize.y + context.labelPortSpacingVertical - dummyPortPos.y;
    }
  }

  /** The `OUTSIDE` branch of the box-position determination of `placeExternalPortDummyLabels`. */
  #placeOutsideBox(portLabelBox: ElkRectangle, side: PortSide, context: DummyLabelContext): void {
    const { dummySize, dummyPort, dummyPortPos } = context;
    switch (side) {
      case PortSide.NORTH:
      case PortSide.SOUTH:
        portLabelBox.x = dummyPortPos.x + context.labelPortSpacingHorizontal;
        break;

      case PortSide.EAST:
      case PortSide.WEST:
        if (this.#labelNextToPort(dummyPort, false, context.placeNextToPortIfPossible)) {
          const labelHeight = context.treatAsGroup ? portLabelBox.height : dummyPort.getLabels()[0].getSize().y;
          portLabelBox.y = (dummySize.y - labelHeight) / 2 - dummyPortPos.y;
        } else {
          portLabelBox.y = dummyPortPos.y + context.labelPortSpacingVertical;
        }
        break;

      default:
        // Java's switch has no default: other sides leave the box unchanged.
        break;
    }
  }

  /** Returns the amount of space required to place the labels later, or `null` if there are no labels. */
  #computePortLabelBox(dummyPort: LPort, labelLabelSpacing: number): ElkRectangle | null {
    if (dummyPort.getLabels().length === 0) {
      return null;
    }
    const result = new ElkRectangle();

    for (const label of dummyPort.getLabels()) {
      const labelSize = label.getSize();

      result.width = Math.max(result.width, labelSize.x);
      result.height += labelSize.y;
    }

    result.height += (dummyPort.getLabels().length - 1) * labelLabelSpacing;

    return result;
  }

  /**
   * Checks whether the labels of the given port should be placed next to the port or below it. The former is the
   * case if the user requested port labels to be placed next to the port, if possible, and if the port has no
   * connections.
   */
  #labelNextToPort(dummyPort: LPort, insideLabels: boolean, placeNextToPortIfPossible: boolean): boolean {
    if (!placeNextToPortIfPossible) {
      return false;
    }
    if (insideLabels) {
      return dummyPort.getIncomingEdges().length === 0 && dummyPort.getOutgoingEdges().length === 0;
    }
    return !dummyPort.isConnectedToExternalNodes();
  }
}
