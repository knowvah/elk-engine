// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { layerAt } from './HierarchicalPortOrthogonalEdgeRouterRestore.js';

/**
 * Fixes all hierarchical port dummy coordinates. For east / west external port dummies, this means setting the x
 * coordinate appropriately, and, in case of `FIXED_RATIO`, checking that the ratio is respected. For north / south
 * hierarchical port dummies, this means setting the y coordinate appropriately.
 *
 * @param layeredGraph the layered graph.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:704
 */
export function fixCoordinates(layeredGraph: LGraph): void {
  const constraints = layeredGraph.getProperty(LayeredOptions.PORT_CONSTRAINTS);

  // East port dummies are in the first layer; all other dummies are in the last layer
  const layers = layeredGraph.getLayers();
  fixLayerCoordinates(layerAt(layers, 0), constraints, layeredGraph);
  fixLayerCoordinates(layerAt(layers, layers.length - 1), constraints, layeredGraph);
}

/**
 * Fixes the coordinates of the nodes in the given layer (the Java overload `fixCoordinates(Layer, PortConstraints,
 * LGraph)`).
 *
 * @param layer the layer.
 * @param constraints external port constraints.
 * @param graph the graph.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:726
 */
function fixLayerCoordinates(layer: Layer, constraints: PortConstraints, graph: LGraph): void {
  // Get some geometric values from the graph
  const padding = graph.getPadding();
  const offset = graph.getOffset();
  const graphActualSize = graph.getActualSize();

  let newActualGraphHeight = graphActualSize.y;

  // During the first iteration, EAST and WEST dummy nodes are fixed. This may change the height of the graph, so
  // we're setting y coordinates of NORTH and SOUTH dummies in a second iteration
  for (const node of layer) {
    if (node.getType() !== NodeType.EXTERNAL_PORT) {
      // We're only looking for hierarchical port dummies
      continue;
    }

    const extPortSide = node.getProperty(InternalProperties.EXT_PORT_SIDE);
    const extPortSize = node.getProperty(InternalProperties.EXT_PORT_SIZE);
    const nodePosition = node.getPosition();

    // Set x coordinate
    switch (extPortSide) {
      case PortSide.EAST:
        nodePosition.x = graph.getSize().x + padding.right - offset.x;
        break;

      case PortSide.WEST:
        nodePosition.x = -offset.x - padding.left;
        break;
    }

    // Set y coordinate
    const requiredActualGraphHeight = requiredHeightOf(node, extPortSide, extPortSize, constraints, graphActualSize);

    newActualGraphHeight = Math.max(newActualGraphHeight, requiredActualGraphHeight);
  }

  // Make the graph larger, if necessary
  graph.getSize().y += newActualGraphHeight - graphActualSize.y;

  // Iterate over NORTH and SOUTH dummies now that the graph's height is fixed
  fixNorthSouthCoordinates(layer, graph);
}

/**
 * The second loop of {@link fixLayerCoordinates} (`:786-806`), split out for the NLOC limit: the y coordinates of the
 * northern and southern dummies, once the graph's height is fixed.
 *
 * @see HierarchicalPortOrthogonalEdgeRouter.java:786
 */
function fixNorthSouthCoordinates(layer: Layer, graph: LGraph): void {
  const padding = graph.getPadding();
  const offset = graph.getOffset();

  for (const node of layer) {
    if (node.getType() !== NodeType.EXTERNAL_PORT) {
      // We're only looking for hierarchical port dummies
      continue;
    }

    const extPortSide = node.getProperty(InternalProperties.EXT_PORT_SIDE);
    const nodePosition = node.getPosition();

    // Set y coordinate
    switch (extPortSide) {
      case PortSide.NORTH:
        nodePosition.y = -offset.y - padding.top;
        break;

      case PortSide.SOUTH:
        nodePosition.y = graph.getSize().y + padding.bottom - offset.y;
        break;
    }
  }
}

/**
 * The "Set y coordinate" switch of the first loop (`:760-778`), split out for the complexity limit: sets the y
 * coordinate of an eastern or western dummy under `FIXED_RATIO` or `FIXED_POS` and returns the actual graph height it
 * requires (0.0 otherwise).
 *
 * `PORT_ANCHOR` has a null default: Java's unboxing `getProperty(PORT_ANCHOR).y` is a `NullPointerException`, and the
 * `.y` read of a null throws a `TypeError` here (JS arithmetic cannot continue silently past it).
 *
 * @see HierarchicalPortOrthogonalEdgeRouter.java:760
 */
function requiredHeightOf(
  node: LNode,
  extPortSide: PortSide,
  extPortSize: KVector,
  constraints: PortConstraints,
  graphActualSize: KVector,
): number {
  let requiredActualGraphHeight = 0.0;
  const nodePosition = node.getPosition();

  switch (extPortSide) {
    case PortSide.EAST:
    case PortSide.WEST:
      if (constraints === PortConstraints.FIXED_RATIO) {
        const ratio = node.getProperty(InternalProperties.PORT_RATIO_OR_POSITION);
        nodePosition.y = graphActualSize.y * ratio - node.getProperty(LayeredOptions.PORT_ANCHOR).y;
        requiredActualGraphHeight = nodePosition.y + extPortSize.y;
        node.borderToContentAreaCoordinates(false, true);
      } else if (constraints === PortConstraints.FIXED_POS) {
        nodePosition.y =
          node.getProperty(InternalProperties.PORT_RATIO_OR_POSITION) - node.getProperty(LayeredOptions.PORT_ANCHOR).y;
        requiredActualGraphHeight = nodePosition.y + extPortSize.y;
        node.borderToContentAreaCoordinates(false, true);
      }
      break;
  }

  return requiredActualGraphHeight;
}

/**
 * Goes over the eastern and western hierarchical dummy nodes and checks whether their incident edges have slanted
 * segments.
 *
 * @param layeredGraph the layered graph.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:819
 */
export function correctSlantedEdgeSegments(layeredGraph: LGraph): void {
  // East port dummies are in the first layer; all other dummies are in the last layer
  const layers = layeredGraph.getLayers();
  correctLayerSlantedEdgeSegments(layerAt(layers, 0));
  correctLayerSlantedEdgeSegments(layerAt(layers, layers.length - 1));
}

/**
 * Goes over the eastern and western hierarchical dummy nodes in the given layer and checks whether their incident
 * edges have slanted segments. Note that only the first and last segment needs to be checked (the Java overload
 * `correctSlantedEdgeSegments(Layer)`).
 *
 * @param layer the layer.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:833
 */
function correctLayerSlantedEdgeSegments(layer: Layer): void {
  for (const node of layer) {
    if (node.getType() !== NodeType.EXTERNAL_PORT) {
      // We're only looking for hierarchical port dummies
      continue;
    }

    const extPortSide = node.getProperty(InternalProperties.EXT_PORT_SIDE);

    if (extPortSide === PortSide.EAST || extPortSide === PortSide.WEST) {
      for (const edge of node.getConnectedEdges()) {
        const bendPoints = edge.getBendPoints();

        if (bendPoints.isEmpty()) {
          // TODO: The edge has no bend points yet, but may still be slanted. Handle that!
          continue;
        }

        // Correct a slanted segment connected to the source port if it belongs to our node
        const sourcePort = edge.getSource()!;

        if (sourcePort.getNode() === node) {
          const firstBendPoint = bendPoints.getFirst();
          firstBendPoint.y = sourcePort.getAbsoluteAnchor().y;
        }

        // Correct a slanted segment connected to the target port if it belongs to our node
        const targetPort = edge.getTarget()!;

        if (targetPort.getNode() === node) {
          const lastBendPoint = bendPoints.getLast();
          lastBendPoint.y = targetPort.getAbsoluteAnchor().y;
        }
      }
    }
  }
}
