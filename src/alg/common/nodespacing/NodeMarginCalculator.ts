// SPDX-License-Identifier: EPL-2.0
import { ElkMargin } from '../../../core/math/ElkMargin.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { KVector } from '../../../core/math/KVector.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { PortLabelPlacement } from '../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { GraphAdapters } from '../../../core/util/adapters/GraphAdapters.js';

/**
 * What `processEdgeHeadTailLabels` and `computeLabelBox` know about the node end they work for. Java passes these
 * as four separate parameters (`node`, `port`, `portLabelSpace`, `labelSpacing`); they are grouped here to stay
 * within the five parameter limit. `port` and `portLabelSpace` are both null for edges connected to the node
 * itself.
 */
interface EdgeLabelSurroundings {
  readonly node: GraphAdapters.NodeAdapter<unknown>;
  readonly port: GraphAdapters.PortAdapter<unknown> | null;
  readonly portLabelSpace: KVector | null;
  readonly labelSpacing: number;
}

/**
 * Sets the node margins. Node margins are influenced by both port positions and sizes
 * and label positions and sizes.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *     <dd>Ports have fixed port positions.</dd>
 *     <dd>Labels have fixed positions.</dd>
 *   <dt>Postcondition:</dt>
 *     <dd>The node margins are properly set to form a bounding box around the node and its ports and
 *         labels.</dd>
 * </dl>
 *
 * Java's private overload `processNode(node, labelSpacing)` is {@link processNodeWithSpacing} here. To stay within the
 * complexity limits, the pieces of `processNode` are separate methods along its comment sections: the node labels,
 * one port (the body of its port loop) with that port's end labels, and the final margin.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/NodeMarginCalculator.java
 */
export class NodeMarginCalculator {
  private includeLabels = true;
  private includePorts = true;
  private includePortLabels = true;
  private includeEdgeHeadTailLabels = true;

  private readonly adapter: GraphAdapters.GraphAdapter<unknown>;

  /**
   * Creates a new calculator for the passed adapter. The Java constructor is `protected` (package access for
   * `NodeDimensionCalculation`); there is no package access in TypeScript, so it is public.
   *
   * @param adapter for the underlying graph type.
   */
  constructor(adapter: GraphAdapters.GraphAdapter<unknown>) {
    this.adapter = adapter;
  }

  // ------------
  //  configure
  // ------------

  /**
   * Do not consider labels during margin calculation.
   *
   * @returns this
   */
  excludeLabels(): this {
    this.includeLabels = false;
    return this;
  }

  /**
   * Do not consider ports during margin calculation.
   *
   * @returns this
   */
  excludePorts(): this {
    this.includePorts = false;
    return this;
  }

  /**
   * Do not consider port labels during margin calculation.
   *
   * @returns this
   */
  excludePortLabels(): this {
    this.includePortLabels = false;
    return this;
  }

  /**
   * Do not consider an edge's head and tail labels during margin calculation.
   *
   * @returns this
   */
  excludeEdgeHeadTailLabels(): this {
    this.includeEdgeHeadTailLabels = false;
    return this;
  }

  // ------------
  //   process
  // ------------

  /**
   * Calculates and assigns margins to all nodes.
   */
  process(): void {
    const spacing = this.adapter.getProperty(CoreOptions.SPACING_LABEL_NODE);

    // Iterate through all nodes
    for (const node of this.adapter.getNodes()) {
      this.processNodeWithSpacing(node, spacing);
    }
  }

  /**
   * Calculates and assigns margins to the given node. The node is expected to be part of the graph the calculator
   * was created for.
   */
  processNode(node: GraphAdapters.NodeAdapter<unknown>): void {
    const spacing = this.adapter.getProperty(CoreOptions.SPACING_LABEL_NODE);
    this.processNodeWithSpacing(node, spacing);
  }

  /**
   * Calculates the margin of the given node. This is Java's private `processNode(node, labelSpacing)`.
   *
   * @param node the node whose margin to calculate.
   * @param labelSpacing label spacing set on the layered graph.
   */
  private processNodeWithSpacing(node: GraphAdapters.NodeAdapter<unknown>, labelSpacing: number): void {
    // This will be our bounding box. We'll start with one that's the same size
    // as our node, and at the same position.
    const boundingBox = new ElkRectangle(
      node.getPosition().x,
      node.getPosition().y,
      node.getSize().x,
      node.getSize().y,
    );

    // We'll reuse this rectangle as our box for elements to add to the bounding box
    const elementBox = new ElkRectangle();

    // Put the node's labels into the bounding box
    if (this.includeLabels) {
      this.addNodeLabels(boundingBox, elementBox, node);
    }

    // Do the same for ports and their labels
    for (const port of node.getPorts()) {
      this.processPort(boundingBox, elementBox, node, port, labelSpacing);
    }

    // Process end labels of edges directly connected to the node
    if (this.includeEdgeHeadTailLabels) {
      this.processEdgeHeadTailLabels(boundingBox, node.getOutgoingEdges(), node.getIncomingEdges(), {
        node,
        port: null,
        portLabelSpace: null,
        labelSpacing,
      });
    }

    this.applyMargin(boundingBox, node);
  }

  /**
   * The "Put the node's labels into the bounding box" section of `processNode`.
   */
  private addNodeLabels(
    boundingBox: ElkRectangle,
    elementBox: ElkRectangle,
    node: GraphAdapters.NodeAdapter<unknown>,
  ): void {
    for (const label of node.getLabels()) {
      elementBox.x = label.getPosition().x + node.getPosition().x;
      elementBox.y = label.getPosition().y + node.getPosition().y;
      elementBox.width = label.getSize().x;
      elementBox.height = label.getSize().y;

      boundingBox.union(elementBox);
    }
  }

  /**
   * The body of the port loop of `processNode`: the port, its labels and the end labels of its edges.
   */
  private processPort(
    boundingBox: ElkRectangle,
    elementBox: ElkRectangle,
    node: GraphAdapters.NodeAdapter<unknown>,
    port: GraphAdapters.PortAdapter<unknown>,
    labelSpacing: number,
  ): void {
    // Calculate the port's upper left corner's x and y coordinate
    const portX = port.getPosition().x + node.getPosition().x;
    const portY = port.getPosition().y + node.getPosition().y;

    // The port itself
    if (this.includePorts) {
      elementBox.x = portX;
      elementBox.y = portY;
      elementBox.width = port.getSize().x;
      elementBox.height = port.getSize().y;

      boundingBox.union(elementBox);
    }

    // The port's labels
    if (this.includePortLabels) {
      for (const label of port.getLabels()) {
        elementBox.x = label.getPosition().x + portX;
        elementBox.y = label.getPosition().y + portY;
        elementBox.width = label.getSize().x;
        elementBox.height = label.getSize().y;

        boundingBox.union(elementBox);
      }
    }

    // End labels of edges connected to the port
    if (this.includeEdgeHeadTailLabels) {
      this.processPortEdgeHeadTailLabels(boundingBox, node, port, labelSpacing);
    }
  }

  /**
   * The "End labels of edges connected to the port" block of the port loop of `processNode`.
   */
  private processPortEdgeHeadTailLabels(
    boundingBox: ElkRectangle,
    node: GraphAdapters.NodeAdapter<unknown>,
    port: GraphAdapters.PortAdapter<unknown>,
    labelSpacing: number,
  ): void {
    const requiredPortLabelSpace = new KVector(-labelSpacing, -labelSpacing);

    // TODO: maybe leave space for manually placed ports
    if (node.getProperty(CoreOptions.PORT_LABELS_PLACEMENT).contains(PortLabelPlacement.OUTSIDE)) {
      for (const label of port.getLabels()) {
        requiredPortLabelSpace.x += label.getSize().x + labelSpacing;
        requiredPortLabelSpace.y += label.getSize().y + labelSpacing;
      }
    }

    requiredPortLabelSpace.x = Math.max(requiredPortLabelSpace.x, 0.0);
    requiredPortLabelSpace.y = Math.max(requiredPortLabelSpace.y, 0.0);

    this.processEdgeHeadTailLabels(boundingBox, port.getOutgoingEdges(), port.getIncomingEdges(), {
      node,
      port,
      portLabelSpace: requiredPortLabelSpace,
      labelSpacing,
    });
  }

  /**
   * The final section of `processNode`: reset the margin (guard against very small double precision errors which
   * can cause the results to be small negative values, which doesn't make sense -- see #616).
   */
  private applyMargin(boundingBox: ElkRectangle, node: GraphAdapters.NodeAdapter<unknown>): void {
    const margin = new ElkMargin(node.getMargin());
    margin.top = Math.max(0, node.getPosition().y - boundingBox.y);
    margin.bottom = Math.max(0, boundingBox.y + boundingBox.height - (node.getPosition().y + node.getSize().y));
    margin.left = Math.max(0, node.getPosition().x - boundingBox.x);
    margin.right = Math.max(0, boundingBox.x + boundingBox.width - (node.getPosition().x + node.getSize().x));
    node.setMargin(margin);
  }

  /**
   * Adds the bounding boxes of the head or tail labels of the given sets of outgoing and incoming
   * edges to the given bounding box.
   *
   * @param boundingBox the bounding box that should be enlarged to include head and tail labels.
   * @param outgoingEdges set of outgoing edges whose tail labels should be included.
   * @param incomingEdges set of incoming edges whose head labels should be included.
   * @param surroundings the node we're processing labels for, the port if the edges are connected to one, the
   *                     space required to place that port's labels, and the label spacing.
   */
  private processEdgeHeadTailLabels(
    boundingBox: ElkRectangle,
    outgoingEdges: Iterable<GraphAdapters.EdgeAdapter<unknown>>,
    incomingEdges: Iterable<GraphAdapters.EdgeAdapter<unknown>>,
    surroundings: EdgeLabelSurroundings,
  ): void {
    const labelBox = new ElkRectangle();

    // For each edge, the tail labels of outgoing edges ...
    for (const edge of outgoingEdges) {
      for (const label of edge.getLabels()) {
        if (label.getProperty(CoreOptions.EDGE_LABELS_PLACEMENT) === EdgeLabelPlacement.TAIL) {
          this.computeLabelBox(labelBox, label, false, surroundings);
          boundingBox.union(labelBox);
        }
      }
    }

    // ... and the head label of incoming edges shall be considered
    for (const edge of incomingEdges) {
      for (const label of edge.getLabels()) {
        if (label.getProperty(CoreOptions.EDGE_LABELS_PLACEMENT) === EdgeLabelPlacement.HEAD) {
          this.computeLabelBox(labelBox, label, true, surroundings);
          boundingBox.union(labelBox);
        }
      }
    }
  }

  /**
   * Computes the given edge label's bounding box. The position of the box is just a rough estimate
   * and might not match what the label positioning algorithm used ends up computing.
   *
   * @param labelBox result of the computation.
   * @param label the label whose bounding box to compute.
   * @param incomingEdge `true` if the edge the label belongs to is an incoming edge to the node.
   * @param surroundings the node the label's edge is incident to, the port the edge might be connected to (`null`
   *                     if the edge is connected directly to the node), the space required to place that port's
   *                     labels, and the label spacing.
   */
  private computeLabelBox(
    labelBox: ElkRectangle,
    label: GraphAdapters.LabelAdapter<unknown>,
    incomingEdge: boolean,
    surroundings: EdgeLabelSurroundings,
  ): void {
    const { node, port, portLabelSpace, labelSpacing } = surroundings;
    labelBox.x = node.getPosition().x;
    labelBox.y = node.getPosition().y;
    if (port !== null) {
      labelBox.x += port.getPosition().x;
      labelBox.y += port.getPosition().y;
    }

    labelBox.width = label.getSize().x;
    labelBox.height = label.getSize().y;

    if (port === null) {
      // The edge is connected directly to the node
      if (incomingEdge) {
        // Assume the edge enters the node at its western side
        labelBox.x -= labelSpacing + label.getSize().x;
      } else {
        // Assume the edge leaves the node at its eastern side
        labelBox.x += node.getSize().x + labelSpacing;
      }
    } else {
      // A port always comes with its label space (Java passes both or neither)
      this.computePortLabelBox(labelBox, label, port, portLabelSpace as KVector, labelSpacing);
    }
  }

  /**
   * The `switch (port.getSide())` of `computeLabelBox`, for edges connected to a port.
   */
  private computePortLabelBox(
    labelBox: ElkRectangle,
    label: GraphAdapters.LabelAdapter<unknown>,
    port: GraphAdapters.PortAdapter<unknown>,
    portLabelSpace: KVector,
    labelSpacing: number,
  ): void {
    switch (port.getSide()) {
      case PortSide.UNDEFINED:
      case PortSide.EAST:
        labelBox.x += port.getSize().x + labelSpacing + portLabelSpace.x + labelSpacing;
        break;

      case PortSide.WEST:
        labelBox.x -= labelSpacing + portLabelSpace.x + labelSpacing + label.getSize().x;
        break;

      case PortSide.NORTH:
        labelBox.x += port.getSize().x + labelSpacing;
        labelBox.y -= labelSpacing + portLabelSpace.y + labelSpacing + label.getSize().y;
        break;

      case PortSide.SOUTH:
        labelBox.x += port.getSize().x + labelSpacing;
        labelBox.y += port.getSize().y + labelSpacing + portLabelSpace.y + labelSpacing;
        break;
    }
  }
}
